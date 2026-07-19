import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const rawSlug = formData.get('slug') as string
    const displayName = formData.get('displayName') as string

    if (!rawSlug || !displayName) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=missing_fields', request.url),
        303
      )
    }

    // Format slug (lowercased alphanumeric and hyphens)
    const slug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')

    if (!slug) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=invalid_slug', request.url),
        303
      )
    }

    // Check if slug exists
    const existing = await db.tenant.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=slug_taken', request.url),
        303
      )
    }

    // Create tenant
    await db.tenant.create({
      data: {
        slug,
        displayName,
        ownerId: user.id,
      },
    })

    return NextResponse.redirect(
      new URL('/dashboard/settings?success=store_created', request.url),
      303
    )
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(err.message)}`, request.url),
      303
    )
  }
}
