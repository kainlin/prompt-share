import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.stripeAccountId || !user?.stripeConnected) {
      return NextResponse.json({ error: 'Stripe account not connected' }, { status: 400 })
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId)
    return NextResponse.json({ url: loginLink.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
