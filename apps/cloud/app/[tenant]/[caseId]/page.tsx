import { notFound } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { CaseHeader, PromptBlock, ImageGallery, VideoPlayer, IframeSandbox } from '@prompt-share/ui'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getDictionary } from '@prompt-share/i18n'
import { PaywallGuard } from '@/components/paywall-guard'
import { ViewTracker, PinterestCard } from '@/components/storefront-interactions'
import styles from '../tenant-page.module.css'

interface Props {
  params: Promise<{ tenant: string; caseId: string }>
}

export default async function CasePage({ params }: Props) {
  const { tenant: rawTenant, caseId } = await params
  const slug = decodeURIComponent(rawTenant).replace(/^@/, '')

  const tenant = await db.tenant.findUnique({ where: { slug } })
  if (!tenant) notFound()

  // Read preferred locale
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const dict = await getDictionary(locale)

  const isCategoryRoute = ['photography', 'product', 'people'].includes(caseId)

  if (isCategoryRoute) {
    // 1. DUAL VIEW: If category overview page, render Pinterest masonry photo wall
    const categoryCases = await db.promptCase.findMany({
      where: { tenantId: tenant.id, category: caseId, published: true },
      orderBy: { createdAt: 'desc' }
    })

    const categoryTitles: Record<string, string> = {
      photography: dict?.category?.photography || '摄影与写实',
      product: dict?.category?.product || '产品与电商',
      people: dict?.category?.people || '人物与角色'
    }

    const categoryDescs: Record<string, string> = {
      photography: locale === 'zh' ? '高精细度的写实人像、胶片质感及街头摄影提示词系列。' : 'High-precision portraiture, raw film stocks, and architectural realism prompts.',
      product: locale === 'zh' ? '专为高档品牌电商设计的产品极简摄影与光影渲染提示词。' : 'Minimalist product photography, luxury brand renders, and e-commerce setups.',
      people: locale === 'zh' ? '保持视觉一致性的多模态角色形象、科幻主体及原画设定提示词。' : 'Consistent visual characters, cyberpunk personas, and portrait keyframes.'
    }

    const currentTitle = categoryTitles[caseId]
    const currentDesc = categoryDescs[caseId]

    return (
      <div>
        {/* Category Header */}
        <div className={styles.homeHeader}>
          <div className={styles.homeCategory}>
            {locale === 'zh' ? '展示分类 Showcase' : 'Showcase Category'}
          </div>
          <h1 className={styles.homeTitle} style={{ fontSize: '2.5rem' }}>{currentTitle}</h1>
          <p className={styles.homeDescription} style={{ marginTop: '12px', marginBottom: '24px' }}>
            {currentDesc}
          </p>
        </div>

        {categoryCases.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--saas-text-secondary)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📷</span>
            {locale === 'zh' ? '该分类下暂无已发布的案例' : 'No published cases under this category yet.'}
          </div>
        ) : (
          /* Pinterest Masonry Wall utilizing interactive Client Component cards */
          <div className={styles.pinterestGrid}>
            {categoryCases.map(c => (
              <PinterestCard 
                key={c.id} 
                c={c} 
                rawTenant={rawTenant} 
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // 2. STANDARD VIEW: Dynamic single case detail view - Upgraded to Split 2-Column Layout (Prompthero style)
  const promptCase = await db.promptCase.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: caseId } },
  })
  if (!promptCase) notFound()

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
      {/* Client-side View Counter trigger */}
      <ViewTracker caseId={promptCase.id} />

      {/* Prompthero-style Split 2-Column Grid Container */}
      <div className={styles.splitLayout}>
        
        {/* LEFT COLUMN: Visual Preview (Video / Sandbox / Image Gallery) */}
        <div className={styles.splitLeft}>
          {promptCase.previewType === 'video' && promptCase.previewSource ? (
            <VideoPlayer
              videoUrl={promptCase.previewSource}
              posterUrl={promptCase.coverImageUrl || promptCase.previewPoster || undefined}
            />
          ) : promptCase.previewType === 'web' && promptCase.previewSource ? (
            <IframeSandbox sourceUrl={promptCase.previewSource} />
          ) : (
            <ImageGallery images={promptCase.images} alt={promptCase.title} />
          )}
        </div>

        {/* RIGHT COLUMN: Metadata details, statistics, and Prompt Editor */}
        <div className={styles.splitRight}>
          <div>
            {/* Category indicator / Breadcrumb */}
            <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--saas-text-secondary)', fontWeight: 600 }}>
              {categoryLabel} &gt; {promptCase.title}
            </div>

            <CaseHeader
              emoji={promptCase.emoji}
              title={promptCase.title}
              tags={promptCase.tags}
              source={source}
            />
          </div>

          {/* Social Proof statistics strip (Views & Likes) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.82rem', color: 'var(--saas-text-secondary)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '16px', marginBottom: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
              <strong className="tnum" style={{ color: 'var(--saas-text-primary)' }}>{promptCase.viewCount}</strong> views
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#E63946', fontVariationSettings: "'FILL' 1" }}>favorite</span>
              <strong className="tnum" style={{ color: 'var(--saas-text-primary)' }}>{promptCase.likeCount}</strong> favorites
            </span>
          </div>

          {/* Model Used Engine information */}
          {promptCase.sourcePlatform && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--saas-text-secondary)', opacity: 0.6, letterSpacing: '0.05em' }}>
                Model Used
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--saas-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>smart_toy</span>
                {promptCase.sourcePlatform}
              </span>
            </div>
          )}

          {/* Dynamic Interactive Prompt Block guarded by access control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.25rem', 
              fontWeight: 700, 
              color: 'var(--saas-text-primary)',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              {dict?.prompt?.title || '提示词'}
            </h2>

            <PaywallGuard
              isSubscribed={isSubscribed}
              tenantId={tenant.id}
              paywallMode={(promptCase.paywallMode as 'free' | 'prompt_only' | 'full_lock') || 'free'}
              watermarkText={promptCase.watermarkEnabled ? tenant.displayName : undefined}
            >
              <PromptBlock
                emoji="💬"
                copyDisabled={!isSubscribed && promptCase.paywallMode !== 'free'}
              >
                {promptCase.promptText}
              </PromptBlock>
            </PaywallGuard>
          </div>
        </div>

      </div>
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
