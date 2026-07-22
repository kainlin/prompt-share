import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id

    // Not logged in → all false
    if (!userId) {
      return NextResponse.json({ stats: {} })
    }

    const { caseIds } = (await request.json()) as { caseIds: string[] }

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return NextResponse.json({ stats: {} })
    }

    // Cap at 100
    const ids = caseIds.slice(0, 100)

    const liked = await db.promptCaseLike.findMany({
      where: { userId, caseId: { in: ids } },
      select: { caseId: true },
    })

    const likedSet = new Set(liked.map(l => l.caseId))
    const stats: Record<string, { liked: boolean }> = {}
    for (const id of ids) {
      stats[id] = { liked: likedSet.has(id) }
    }

    return NextResponse.json({ stats })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
