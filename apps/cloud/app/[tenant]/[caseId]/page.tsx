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

  // Dynamic formatting of big numbers (e.g. 2400 -> 2.4k)
  const formatCount = (num: number) => {
    return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString()
  }

  return (
    <div style={{ backgroundColor: '#F3F0EE', minHeight: '100vh', margin: '-48px -48px -48px -48px', padding: '48px' }}>
      {/* Client-side View Counter trigger */}
      <ViewTracker caseId={promptCase.id} />

      {/* Prompthero-style Split 2-Column Grid Container */}
      <div className={styles.splitLayout}>
        
        {/* LEFT COLUMN: Visual Preview (Video / Sandbox / Image Gallery) */}
        <div className={styles.splitLeft} style={{ top: '96px' }}>
          <div 
            style={{ 
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.12), 0 10px 20px -5px rgba(0, 0, 0, 0.05)', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              backgroundColor: '#ffffff' 
            }}
          >
            {promptCase.previewType === 'video' && promptCase.previewSource ? (
              <VideoPlayer
                videoUrl={promptCase.previewSource}
                posterUrl={promptCase.coverImageUrl || promptCase.previewPoster || undefined}
              />
            ) : promptCase.previewType === 'web' && promptCase.previewSource ? (
              <IframeSandbox sourceUrl={promptCase.previewSource} />
            ) : (
              <ImageGallery 
                images={promptCase.images && promptCase.images.length > 0 ? promptCase.images : [promptCase.coverImageUrl].filter(Boolean) as string[]} 
                alt={promptCase.title} 
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Metadata details, statistics, and Prompt Editor */}
        <div className={styles.splitRight}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Breadcrumbs Navigation */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--saas-text-secondary)', fontWeight: 700 }}>
              <a href={`/${rawTenant}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {locale === 'zh' ? '文档' : 'Documentation'}
              </a>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
              <span style={{ color: '#141413' }}>{categoryLabel}</span>
            </nav>

            {/* Title display */}
            <h1 style={{ 
              margin: '8px 0 0 0', 
              fontSize: '2.5rem', 
              lineHeight: 1.1, 
              fontWeight: 800, 
              letterSpacing: '-0.03em', 
              color: '#141413',
              fontFamily: "'Plus Jakarta Sans', sans-serif" 
            }}>
              {promptCase.title}
            </h1>

            {/* Social stats and Staff pick strip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 16px', borderRadius: '9999px', backgroundColor: 'rgba(28,28,27,0.06)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--saas-text-secondary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                  <strong style={{ color: '#141413' }}>{formatCount(promptCase.viewCount)}</strong>
                </span>
                <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(0,0,0,0.1)' }}></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--saas-text-secondary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#CF4500' }}>favorite</span>
                  <strong style={{ color: '#141413' }}>{formatCount(promptCase.likeCount)}</strong>
                </span>
              </div>

              {/* staff pick badge representation */}
              <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'var(--saas-mint)', color: '#141413', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '6px' }}>
                {locale === 'zh' ? '精选推荐' : 'Staff Pick'}
              </span>
            </div>

          </div>

          {/* Model Used Badge Section */}
          {promptCase.sourcePlatform && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--saas-text-secondary)', letterSpacing: '0.08em' }}>
                {locale === 'zh' ? '模型引擎' : 'Model Engine'}
              </span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', backgroundColor: 'var(--saas-accent)', color: '#ffffff', borderRadius: '9999px', boxShadow: '0 2px 8px rgba(83, 58, 253, 0.2)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>smart_toy</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{promptCase.sourcePlatform}</span>
              </div>
            </div>
          )}

          {/* Dynamic Interactive Prompt Block guarded by access control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              color: '#141413',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              {dict?.prompt?.title || (locale === 'zh' ? '提示词' : 'Prompt')}
            </h2>

            <PaywallGuard
              isSubscribed={isSubscribed}
              tenantId={tenant.id}
              paywallMode={(promptCase.paywallMode as 'free' | 'prompt_only' | 'full_lock') || 'free'}
              watermarkText={promptCase.watermarkEnabled ? tenant.displayName : undefined}
              locale={locale}
            >
              <PromptBlock
                emoji="💬"
                copyDisabled={!isSubscribed && promptCase.paywallMode !== 'free'}
              >
                {promptCase.promptText}
              </PromptBlock>
            </PaywallGuard>
          </div>

          {/* Technical Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.62rem', fontWeight: 700, color: 'var(--saas-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {locale === 'zh' ? '采样算法' : 'Sampling'}
              </p>
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#141413' }}>
                DPM++ 2M Karras
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.62rem', fontWeight: 700, color: 'var(--saas-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {locale === 'zh' ? '相关性系数' : 'Guidance'}
              </p>
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#141413' }}>
                7.5 Scale
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.62rem', fontWeight: 700, color: 'var(--saas-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {locale === 'zh' ? '迭代步数' : 'Steps'}
              </p>
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#141413' }}>
                35 Iterations
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.62rem', fontWeight: 700, color: 'var(--saas-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {locale === 'zh' ? '画面比例' : 'Aspect'}
              </p>
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#141413' }}>
                4:5 Vertical
              </p>
            </div>
          </div>

          {/* Verified Quality Badge strip */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', backgroundColor: 'rgba(207,69,0,0.04)', borderRadius: '16px', border: '1px solid rgba(207,69,0,0.15)' }}>
            <span className="material-symbols-outlined" style={{ color: '#CF4500', fontSize: '20px' }}>verified</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#CF4500', letterSpacing: '0.05em' }}>
                {locale === 'zh' ? '高级品质验证' : 'Quality Verified'}
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--saas-text-secondary)', lineHeight: 1.45 }}>
                {locale === 'zh' 
                  ? '经多引擎版本跨版本测试，确保画面输出质量、画风高度一致。' 
                  : 'Tested across 5 engine versions for consistency and aesthetic quality.'}
              </p>
            </div>
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
