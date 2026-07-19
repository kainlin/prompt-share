import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Ensure user record exists in our DB
  await db.user.upsert({
    where: { email: user.email! },
    update: { name: user.user_metadata?.full_name || user.email },
    create: {
      email: user.email!,
      name: user.user_metadata?.full_name || user.email,
      avatarUrl: user.user_metadata?.avatar_url,
    },
  })

  return NextResponse.redirect(`${origin}${redirect}`)
}
