import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    let accountId = user?.stripeAccountId || null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: session.user.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '5815',
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
        },
        metadata: { userId: session.user.id },
      })
      accountId = account.id
      await db.user.update({
        where: { id: session.user.id },
        data: { stripeAccountId: accountId },
      })
    }

    const origin = request.headers.get('origin') || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001')
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/settings?stripe_refresh=true`,
      return_url: `${origin}/dashboard/settings?stripe_connected=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
