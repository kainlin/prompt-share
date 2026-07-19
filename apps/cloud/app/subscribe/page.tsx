import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { StripePlans } from './stripe-plans'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function SubscribePage({ searchParams }: Props) {
  const { tenant: tenantId } = await searchParams
  if (!tenantId) redirect('/')

  // Authenticate user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=/subscribe?tenant=${tenantId}`)
  }

  // Fetch tenant info
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) redirect('/')

  // Check if already subscribed
  const existingSub = await db.subscription.findFirst({
    where: { userId: user.id, tenantId, status: 'active' }
  })
  
  if (existingSub) {
    redirect(`/@${tenant.slug}?subscribed=true`)
  }

  return (
    <main style={{ maxWidth: 600, margin: '6rem auto', padding: '2rem', textAlign: 'center' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        {tenant.avatarUrl && (
          <img src={tenant.avatarUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: '1rem', objectFit: 'cover' }} />
        )}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
          Subscribe to {tenant.displayName}
        </h1>
        <p style={{ color: 'var(--feishu-text-secondary)', marginTop: '0.5rem' }}>
          Get full access to all prompts, parameter configurations, and high-resolution image views.
        </p>
      </div>

      <StripePlans tenantId={tenant.id} />
    </main>
  )
}
