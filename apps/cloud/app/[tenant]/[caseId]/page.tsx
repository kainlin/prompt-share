import { notFound } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { CaseHeader, PromptBlock, ImageGallery, VideoPlayer, IframeSandbox } from '@prompt-share/ui'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getDictionary } from '@prompt-share/i18n'
import { PaywallGuard } from '@/components/paywall-guard'
import Link from 'next/link'
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
          /* Pinterest Masonry Wall */
          <div className={styles.pinterestGrid}>
            {categoryCases.map(c => (
              <Link 
                key={c.id} 
                href={`/${rawTenant}/${c.slug}`} 
                className={styles.pinterestCard}
              >
                <div className={styles.pinterestImgWrapper}>
                  {c.coverImageUrl ? (
                    <img src={c.coverImageUrl} alt={c.title} className={styles.pinterestImg} />
                  ) : (
                    <div className={styles.pinterestImg} style={{ backgroundColor: 'rgba(0,0,0,0.03)', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                      📷
                    </div>
                  )}
                  {/* Floating Action Icons */}
                  <div className={styles.pinterestFloatingBadgeLeft}>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <div className={styles.pinterestFloatingBadgeRight}>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </div>
                </div>

                <div className={styles.pinterestInfo}>
                  <h3 className={styles.pinterestTitle}>{c.title}</h3>
                  <p className={styles.pinterestPromptSnippet}>
                    {c.promptText}
                  </p>
                  <div className={styles.pinterestMeta}>
                    <div className={styles.pinterestStats}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>❤️ 1</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>👁️ 71</span>
                    </div>
                    <span className={styles.pinterestHeroBadge}>HERO</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 2. STANDARD VIEW: Dynamic single case detail view
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
        borderBottom: '1px solid rgba(0,0,0,0.08)', 
        paddingBottom: '8px',
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
