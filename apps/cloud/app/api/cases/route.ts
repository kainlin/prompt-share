import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

  // Verify ownership
  const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: session.user.id } })
  if (!tenant) return NextResponse.json({ error: 'Not your tenant' }, { status: 403 })

  const cases = await db.promptCase.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(cases)
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { tenantId, title, category, emoji, promptText, images, coverImageUrl, sourcePlatform, sourceAuthor, tags, previewType, previewSource, previewPoster } = body

  if (!tenantId || !title || !promptText) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: session.user.id } })
  if (!tenant) return NextResponse.json({ error: 'Not your tenant' }, { status: 403 })

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

  const promptCase = await db.promptCase.create({
    data: {
      tenantId,
      title,
      slug,
      category: category || 'photography',
      emoji: emoji || '📷',
      promptText,
      images: images || [],
      coverImageUrl: coverImageUrl || '',
      sourcePlatform,
      sourceAuthor,
      tags: tags || [],
      previewType: previewType || 'image',
      previewSource: previewSource || null,
      previewPoster: previewPoster || null,
    },
  })

  return NextResponse.json(promptCase, { status: 201 })
}
