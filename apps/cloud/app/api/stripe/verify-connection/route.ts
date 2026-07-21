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
    if (!user?.stripeAccountId) {
      return NextResponse.json({ connected: false })
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId)
    const connected = account.details_submitted === true

    if (connected && !user.stripeConnected) {
      await db.user.update({
        where: { id: user.id },
        data: { stripeConnected: true },
      })
    }

    return NextResponse.json({ connected })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
