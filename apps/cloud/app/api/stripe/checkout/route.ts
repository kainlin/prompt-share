import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_LIFETIME } from '@/lib/stripe'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId, plan = 'monthly' } = await request.json()
    const priceId = plan === 'lifetime' ? STRIPE_PRICE_LIFETIME : STRIPE_PRICE_MONTHLY

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 400 })
    }

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const origin = request.headers.get('origin') || ''
    const stripeSession = await stripe.checkout.sessions.create({
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tenantId, userId: session.user.id, plan },
      success_url: `${origin}/@${tenant.slug}?subscribed=true`,
      cancel_url: `${origin}/@${tenant.slug}?cancelled=true`,
    })

    return NextResponse.json({ url: stripeSession.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
