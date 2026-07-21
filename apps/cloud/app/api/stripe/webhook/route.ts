import { NextResponse } from 'next/server'
import { stripe, calculateSplit, PAYOUT_COOLDOWN_DAYS } from '@/lib/stripe'
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
      await db.order.create({
        data: {
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

      // Instant transfer for trusted users with Connect account
      const user = await db.user.findUnique({ where: { id: userId } })
      if (user?.isTrustedUser && user?.stripeAccountId && user?.stripeConnected) {
        try {
          const paymentIntentId = (s.payment_intent as string) || ''
          if (paymentIntentId) {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
            const chargeId = pi.latest_charge as string
            if (chargeId) {
              const transfer = await stripe.transfers.create({
                amount: rev,
                currency: 'usd',
                destination: user.stripeAccountId,
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
    await db.order.updateMany({
      where: { stripeSessionId: dispute.id },
      data: { payoutStatus: 'disputed', disputeId: dispute.id, disputeStatus: dispute.status },
    })
  }

  // ── charge.dispute.closed ──────────────────────────
  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    const newStatus = dispute.status === 'won' ? 'pending' : 'disputed'
    await db.order.updateMany({
      where: { stripeSessionId: dispute.id },
      data: { payoutStatus: newStatus, disputeStatus: dispute.status },
    })
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing — Stripe needs the raw body
export const dynamic = 'force-dynamic'
