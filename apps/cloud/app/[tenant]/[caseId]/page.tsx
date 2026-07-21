import { notFound } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { CaseHeader, PromptBlock, ImageGallery, VideoPlayer, IframeSandbox } from '@prompt-share/ui'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getDictionary } from '@prompt-share/i18n'
import { PaywallGuard } from '@/components/paywall-guard'

interface Props {
  params: Promise<{ tenant: string; caseId: string }>
}

export default async function CasePage({ params }: Props) {
  const { tenant: rawTenant, caseId } = await params
  const slug = decodeURIComponent(rawTenant).replace(/^@/, '')

  const tenant = await db.tenant.findUnique({ where: { slug } })
  if (!tenant) notFound()

  const promptCase = await db.promptCase.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: caseId } },
  })
  if (!promptCase) notFound()

  // Read preferred locale
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const dict = await getDictionary(locale)

  // Check subscription status
  const session = await auth.api.getSession({ headers: await headers() })
  const isSubscribed = session ? await checkSubscription(session.user.id, tenant.id) : false

  const source = promptCase.sourcePlatform || promptCase.sourceAuthor
    ? { platform: promptCase.sourcePlatform || '', author: promptCase.sourceAuthor || '' }
    : undefined

  // Retrieve translated category label
  const categoryLabel = dict?.category?.[promptCase.category as 'photography' | 'product' | 'people'] || promptCase.category

  return (
    <div>
      {/* Category indicator / Breadcrumb */}
      <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
        {categoryLabel} &gt; {promptCase.title}
      </div>

      <CaseHeader
        emoji={promptCase.emoji}
        title={promptCase.title}
        tags={promptCase.tags}
        source={source}
      />

      {/* Multi-modal preview: render based on previewType */}
      <div style={{ marginTop: '24px', marginBottom: '32px' }}>
        {promptCase.previewType === 'video' && promptCase.previewSource ? (
          <VideoPlayer
            videoUrl={promptCase.previewSource}
            posterUrl={promptCase.previewPoster || undefined}
          />
        ) : promptCase.previewType === 'web' && promptCase.previewSource ? (
          <IframeSandbox sourceUrl={promptCase.previewSource} />
        ) : (
          <ImageGallery images={promptCase.images} alt={promptCase.title} />
        )}
      </div>

      {/* H2 Title with translated value from dictionary */}
      <h2 style={{ 
        marginTop: '36px', 
        marginBottom: '16px', 
        fontSize: '1.5rem', 
        fontWeight: 700, 
        borderBottom: '1px solid #eaeaea', 
        paddingBottom: '8px',
        color: '#111111'
      }}>
        {dict?.prompt?.title || '提示词'}
      </h2>

      <PaywallGuard isSubscribed={isSubscribed} tenantId={tenant.id}>
        <PromptBlock emoji="💬">{promptCase.promptText}</PromptBlock>
      </PaywallGuard>
    </div>
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
