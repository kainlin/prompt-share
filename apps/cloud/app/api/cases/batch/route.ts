import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const VALID_PAYWALL_MODES = ['free', 'prompt_only', 'full_lock'] as const

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { ids, action, paywallMode } = body as {
      ids: string[]
      action: 'delete' | 'publish' | 'unpublish' | 'paywall'
      paywallMode?: string
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 cases per batch operation' }, { status: 400 })
    }

    // Verify ownership: all cases must belong to the user's tenants
    const cases = await db.promptCase.findMany({
      where: { id: { in: ids } },
      include: { tenant: true },
    })
    if (cases.length !== ids.length) {
      return NextResponse.json({ error: 'One or more cases not found' }, { status: 404 })
    }
    const unauthorized = cases.filter(c => c.tenant.ownerId !== session.user.id)
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: 'You do not own all selected cases' }, { status: 403 })
    }

    let result: { affected: number }

    switch (action) {
      case 'delete': {
        await db.promptCase.deleteMany({ where: { id: { in: ids } } })
        result = { affected: ids.length }
        break
      }
      case 'publish': {
        const r = await db.promptCase.updateMany({
          where: { id: { in: ids } },
          data: { published: true },
        })
        result = { affected: r.count }
        break
      }
      case 'unpublish': {
        const r = await db.promptCase.updateMany({
          where: { id: { in: ids } },
          data: { published: false },
        })
        result = { affected: r.count }
        break
      }
      case 'paywall': {
        if (!paywallMode || !VALID_PAYWALL_MODES.includes(paywallMode as any)) {
          return NextResponse.json({
            error: `paywallMode must be one of: ${VALID_PAYWALL_MODES.join(', ')}`,
          }, { status: 400 })
        }
        const r = await db.promptCase.updateMany({
          where: { id: { in: ids } },
          data: { paywallMode },
        })
        result = { affected: r.count }
        break
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
