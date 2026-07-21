import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe, MIN_WITHDRAWAL_CENTS } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.stripeAccountId || !user?.stripeConnected) {
      return NextResponse.json(
        { error: 'Please connect and verify your Stripe account first' },
        { status: 400 },
      )
    }

    const now = new Date()
    const availableOrders = await db.order.findMany({
      where: {
        tenant: { ownerId: session.user.id },
        creatorRevenue: { gt: 0 },
        payoutStatus: 'pending',
        payoutReadyAt: { lte: now },
      },
    })

    const total = availableOrders.reduce((sum, o) => sum + o.creatorRevenue, 0)
    if (total < MIN_WITHDRAWAL_CENTS) {
      return NextResponse.json(
        {
          error: `Minimum withdrawal is $${(MIN_WITHDRAWAL_CENTS / 100).toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    const transfer = await stripe.transfers.create({
      amount: total,
      currency: 'usd',
      destination: user.stripeAccountId,
      metadata: { userId: user.id },
    })

    // Mark all withdrawn orders as paid in a transaction
    await db.$transaction(
      availableOrders.map((order) =>
        db.order.update({
          where: { id: order.id },
          data: { payoutStatus: 'paid', creatorTransferId: transfer.id },
        }),
      ),
    )

    return NextResponse.json({
      success: true,
      amount: total,
      orderCount: availableOrders.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
