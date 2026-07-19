import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { tenantId, userId, plan } = session.metadata || {}

    if (tenantId && userId) {
      await db.subscription.create({
        data: {
          userId,
          tenantId,
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription as string || null,
          stripeCustomerId: session.customer as string,
          status: 'active',
          plan: plan || 'monthly',
        },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    // Look up by Stripe subscription ID (passed from checkout.session.completed)
    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id, status: 'active' },
      data: { status: 'expired', expiresAt: new Date() },
    })
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing — Stripe needs the raw body
export const dynamic = 'force-dynamic'
