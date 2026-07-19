import { notFound } from 'next/navigation'
import { CaseHeader, PromptBlock, ImageGallery } from '@prompt-share/ui'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { PaywallGuard } from '@/components/paywall-guard'

interface Props {
  params: Promise<{ tenant: string; caseId: string }>
}

export default async function CasePage({ params }: Props) {
  const { tenant: rawTenant, caseId } = await params
  const slug = rawTenant.startsWith('@') ? rawTenant.slice(1) : rawTenant

  const tenant = await db.tenant.findUnique({ where: { slug } })
  if (!tenant) notFound()

  const promptCase = await db.promptCase.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: caseId } },
  })
  if (!promptCase) notFound()

  // Check subscription status
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isSubscribed = user ? await checkSubscription(user.id, tenant.id) : false

  const source = promptCase.sourcePlatform || promptCase.sourceAuthor
    ? { platform: promptCase.sourcePlatform || '', author: promptCase.sourceAuthor || '' }
    : undefined

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      {tenant.avatarUrl && (
        <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--feishu-text-secondary)' }}>
          ← <a href={`/${rawTenant}`} style={{ color: 'inherit' }}>{tenant.displayName}</a>
        </div>
      )}

      <CaseHeader
        emoji={promptCase.emoji}
        title={promptCase.title}
        tags={promptCase.tags}
        source={source}
      />

      <ImageGallery images={promptCase.images} alt={promptCase.title} />

      <h2 style={{ marginTop: '2rem', fontSize: '1.25rem', fontWeight: 600 }}>Prompt</h2>

      <PaywallGuard isSubscribed={isSubscribed} tenantId={tenant.id}>
        <PromptBlock emoji="💬" text={promptCase.promptText} />
      </PaywallGuard>
    </main>
  )
}

async function checkSubscription(userId: string, tenantId: string): Promise<boolean> {
  const sub = await db.subscription.findFirst({
    where: { userId, tenantId, status: 'active' },
  })
  if (!sub) return false
  if (sub.expiresAt && sub.expiresAt < new Date()) {
    await db.subscription.update({ where: { id: sub.id }, data: { status: 'expired' } })
    return false
  }
  return true
}
