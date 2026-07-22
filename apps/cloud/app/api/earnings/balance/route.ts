import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { MIN_WITHDRAWAL_CENTS } from '@/lib/stripe'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()

    // Find orders from tenants owned by the current user.
    // Use findMany + sum in JS because Prisma 6.x does not support
    // .aggregate() on the relational client surface.
    const [pendingOrders, availableOrders] = await Promise.all([
      db.order.findMany({
        where: {
          tenant: { ownerId: session.user.id },
          creatorRevenue: { gt: 0 },
          payoutStatus: 'pending',
          payoutReadyAt: { gt: now },
        },
        select: { creatorRevenue: true },
      }),
      db.order.findMany({
        where: {
          tenant: { ownerId: session.user.id },
          creatorRevenue: { gt: 0 },
          payoutStatus: 'pending',
          payoutReadyAt: { lte: now },
        },
        select: { creatorRevenue: true },
      }),
    ])

    const pendingAmount = pendingOrders.reduce((sum, o) => sum + o.creatorRevenue, 0)
    const availableAmount = availableOrders.reduce((sum, o) => sum + o.creatorRevenue, 0)
    const canWithdraw = availableAmount >= MIN_WITHDRAWAL_CENTS

    return NextResponse.json({
      pendingAmount,
      availableAmount,
      minWithdrawal: MIN_WITHDRAWAL_CENTS,
      canWithdraw,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
