import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: '请先登录后再操作' }, { status: 401 })
    }

    const userId = session.user.id
    const { id: caseId } = await context.params

    // Check if case exists
    const promptCase = await db.promptCase.findUnique({ where: { id: caseId } })
    if (!promptCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Toggle: check existing like
    const existingLike = await db.promptCaseLike.findUnique({
      where: { userId_caseId: { userId, caseId } },
    })

    if (existingLike) {
      // Unlike
      const [, updated] = await db.$transaction([
        db.promptCaseLike.delete({ where: { id: existingLike.id } }),
        db.promptCase.update({
          where: { id: caseId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        }),
      ])
      return NextResponse.json({ liked: false, likeCount: Math.max(0, updated.likeCount) })
    } else {
      // Like
      const [, updated] = await db.$transaction([
        db.promptCaseLike.create({
          data: { userId, caseId },
        }),
        db.promptCase.update({
          where: { id: caseId },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        }),
      ])
      return NextResponse.json({ liked: true, likeCount: updated.likeCount })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
