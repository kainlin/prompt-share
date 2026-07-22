import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createHash } from 'crypto'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const VIEW_WINDOW_HOURS = 24
const SALT = process.env.IP_HASH_SALT || 'promptshare-default-salt-change-me'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + SALT).digest('hex')
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: caseId } = await context.params

    // Get user session (nullable — guests allowed)
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id || null

    // Get IP + UA for dedup
    const forwarded = _request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || '127.0.0.1'
    const ipHash = hashIp(ip)
    const userAgent = _request.headers.get('user-agent') || ''

    const now = new Date()
    const windowStart = new Date(now.getTime() - VIEW_WINDOW_HOURS * 60 * 60 * 1000)

    // Dedup: prefer userId if logged in, otherwise ipHash + caseId
    let existingView
    if (userId) {
      existingView = await db.promptCaseView.findFirst({
        where: { userId, caseId, createdAt: { gte: windowStart } },
      })
    } else {
      existingView = await db.promptCaseView.findFirst({
        where: { ipHash, caseId, userAgent, createdAt: { gte: windowStart } },
      })
    }

    if (existingView) {
      const promptCase = await db.promptCase.findUnique({
        where: { id: caseId },
        select: { viewCount: true },
      })
      return NextResponse.json({ counted: false, viewCount: promptCase?.viewCount ?? 0 })
    }

    // Insert + increment in a transaction
    const [, updated] = await db.$transaction([
      db.promptCaseView.create({
        data: { caseId, userId, ipHash, userAgent },
      }),
      db.promptCase.update({
        where: { id: caseId },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      }),
    ])

    return NextResponse.json({ counted: true, viewCount: updated.viewCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
