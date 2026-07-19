import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const promptCase = await db.promptCase.findUnique({
      where: { id },
      include: { tenant: true },
    })

    if (!promptCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    if (promptCase.tenant.ownerId !== user.id) {
      return NextResponse.json({ error: 'Not your case' }, { status: 403 })
    }

    return NextResponse.json(promptCase)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, category, emoji, promptText, images, coverImageUrl, sourcePlatform, sourceAuthor, tags, published } = body

    if (!title || !promptText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const promptCase = await db.promptCase.findUnique({
      where: { id },
      include: { tenant: true },
    })

    if (!promptCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    if (promptCase.tenant.ownerId !== user.id) {
      return NextResponse.json({ error: 'Not your case' }, { status: 403 })
    }

    // Update slug based on title if title changed
    const slug = title !== promptCase.title
      ? title.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
      : promptCase.slug

    const updatedCase = await db.promptCase.update({
      where: { id },
      data: {
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
        published: published !== undefined ? published : true,
      },
    })

    return NextResponse.json(updatedCase)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const promptCase = await db.promptCase.findUnique({
      where: { id },
      include: { tenant: true },
    })

    if (!promptCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    if (promptCase.tenant.ownerId !== user.id) {
      return NextResponse.json({ error: 'Not your case' }, { status: 403 })
    }

    await db.promptCase.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
