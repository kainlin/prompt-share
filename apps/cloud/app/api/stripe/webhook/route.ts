import { NextResponse } from 'next/server'
import { stripe, PAYOUT_COOLDOWN_DAYS, calculateSplit } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // ── checkout.session.completed ──────────────────────
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const { tenantId, userId, plan, platformFee, creatorRevenue } = s.metadata || {}

    if (tenantId && userId && creatorRevenue) {
      const amountTotal = s.amount_total || 0
      const fee = parseInt(platformFee || '0', 10)
      const rev = parseInt(creatorRevenue || '0', 10)

      // Create or update subscription record
      await db.subscription.upsert({
        where: { stripeSessionId: s.id },
        update: { status: 'active' },
        create: {
          userId,
          tenantId,
          stripeSessionId: s.id,
          stripeSubscriptionId: (s.subscription as string) || null,
          stripeCustomerId: s.customer as string,
          status: 'active',
          plan: plan || 'monthly',
        },
      })

      // Create order record for revenue tracking
      const payoutReadyAt = new Date(Date.now() + PAYOUT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
      await db.order.upsert({
        where: { stripeSessionId: s.id },
        update: { amountTotal, platformFee: fee, creatorRevenue: rev },
        create: {
          userId,
          tenantId,
          stripeSessionId: s.id,
          amountTotal,
          platformFee: fee,
          creatorRevenue: rev,
          payoutStatus: 'pending',
          payoutReadyAt,
        },
      })

      // Store stripeSessionId on PaymentIntent metadata for dispute lookup
      const paymentIntentId = (s.payment_intent as string) || ''
      if (paymentIntentId) {
        try {
          await stripe.paymentIntents.update(paymentIntentId, {
            metadata: { stripeSessionId: s.id },
          })
        } catch {
          console.warn(`Failed to update PaymentIntent metadata for session ${s.id}`)
        }
      }

      // Instant transfer for trusted users with Connect account
      // Look up the tenant owner (creator), not the buyer
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        include: { owner: true },
      })
      const creator = tenant?.owner
      if (creator?.isTrustedUser && creator?.stripeAccountId && creator?.stripeConnected) {
        try {
          if (paymentIntentId) {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
            const chargeId = pi.latest_charge as string
            if (chargeId) {
              const transfer = await stripe.transfers.create({
                amount: rev,
                currency: 'usd',
                destination: creator.stripeAccountId,
                source_transaction: chargeId,
                metadata: { orderSessionId: s.id },
              })
              await db.order.update({
                where: { stripeSessionId: s.id },
                data: {
                  payoutStatus: 'paid',
                  creatorTransferId: transfer.id,
                },
              })
            }
          }
        } catch {
          // Transfer failed — stays 'pending' for manual withdrawal
          console.warn(`Instant transfer failed for order ${s.id}`)
        }
      }
    }
  }

  // ── invoice.paid (recurring subscription renewal) ────
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice
    if (invoice.billing_reason === 'subscription_cycle') {
      const subscriptionId = invoice.subscription as string
      const sub = await db.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } })
      if (sub) {
        const split = calculateSplit(invoice.amount_paid)
        const payoutReadyAt = new Date(Date.now() + PAYOUT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)

        await db.order.upsert({
          where: { stripeSessionId: invoice.id },
          update: { amountTotal: invoice.amount_paid, platformFee: split.platformFeeCents, creatorRevenue: split.creatorRevenueCents },
          create: {
            userId: sub.userId,
            tenantId: sub.tenantId,
            stripeSessionId: invoice.id,
            amountTotal: invoice.amount_paid,
            platformFee: split.platformFeeCents,
            creatorRevenue: split.creatorRevenueCents,
            payoutStatus: 'pending',
            payoutReadyAt,
          },
        })

        // Instant transfer for trusted creator
        const tenant = await db.tenant.findUnique({
          where: { id: sub.tenantId },
          include: { owner: true },
        })
        const creator = tenant?.owner
        if (creator?.isTrustedUser && creator?.stripeAccountId && creator?.stripeConnected) {
          try {
            const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent as string)
            const chargeId = pi.latest_charge as string
            if (chargeId) {
              const transfer = await stripe.transfers.create({
                amount: split.creatorRevenueCents,
                currency: 'usd',
                destination: creator.stripeAccountId,
                source_transaction: chargeId,
                metadata: { invoiceId: invoice.id },
              })
              await db.order.update({
                where: { stripeSessionId: invoice.id },
                data: {
                  payoutStatus: 'paid',
                  creatorTransferId: transfer.id,
                },
              })
            }
          } catch {
            console.warn(`Instant transfer failed for invoice ${invoice.id}`)
          }
        }
      }
    }
  }

  // ── customer.subscription.deleted ──────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id, status: 'active' },
      data: { status: 'expired', expiresAt: new Date() },
    })
  }

  // ── charge.dispute.created ─────────────────────────
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute
    const piId = dispute.payment_intent as string
    if (piId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(piId)
        const stripeSessionId = paymentIntent.metadata?.stripeSessionId
        if (stripeSessionId) {
          await db.order.updateMany({
            where: { stripeSessionId },
            data: { payoutStatus: 'disputed', disputeId: dispute.id, disputeStatus: dispute.status },
          })
        }
      } catch {
        console.warn(`Failed to lookup PaymentIntent for dispute ${dispute.id}`)
      }
    }
  }

  // ── charge.dispute.closed ──────────────────────────
  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    const piId = dispute.payment_intent as string
    if (piId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(piId)
        const stripeSessionId = paymentIntent.metadata?.stripeSessionId
        if (stripeSessionId) {
          const newStatus = dispute.status === 'won' ? 'pending' : 'disputed'
          await db.order.updateMany({
            where: { stripeSessionId },
            data: { payoutStatus: newStatus, disputeStatus: dispute.status },
          })
        }
      } catch {
        console.warn(`Failed to lookup PaymentIntent for dispute ${dispute.id}`)
      }
    }
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing — Stripe needs the raw body
export const dynamic = 'force-dynamic'
