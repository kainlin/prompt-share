import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { headers } from 'next/headers'
import { CasesList } from './cases-list'
import styles from '../dashboard.module.css'

interface Props {
  searchParams: Promise<{ tenant?: string; view?: 'grid' | 'list' }>
}

export default async function CasesPage({ searchParams }: Props) {
  const session = await auth.api.getSession({ headers: await headers() })
  const { tenant: tenantId, view = 'grid' } = await searchParams

  const tenants = await db.tenant.findMany({ where: { ownerId: session!.user.id } })
  const selectedTenant = tenantId || tenants[0]?.id

  const cases = selectedTenant
    ? await db.promptCase.findMany({
        where: { tenantId: selectedTenant },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const selectedTenantDetails = tenants.find(t => t.id === selectedTenant)

  const serializedCases = cases.map(c => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    category: c.category,
    emoji: c.emoji,
    coverImageUrl: c.coverImageUrl,
    images: c.images,
    promptText: c.promptText,
    published: c.published,
    paywallMode: c.paywallMode,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  // Map category background badges
  const categoryBadges: Record<string, { bg: string; text: string; label: string }> = {
    photography: { bg: 'var(--saas-sky)', text: '#0277BD', label: 'Photography' },
    product: { bg: 'var(--saas-apricot)', text: '#E65100', label: 'Product' },
    people: { bg: 'var(--saas-rose)', text: '#C2185B', label: 'Character' }
  }

  return (
    <div>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>Store Management</p>
          <h1 className={styles.pageTitle}>Prompt Cases</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-black/5 text-[12px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span style={{ color: 'var(--saas-text-secondary)' }}>Store Online</span>
          </div>
          {selectedTenant && (
            <Link
              href={`/dashboard/cases/new?tenant=${selectedTenant}`}
              className={styles.createBtn}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Case
            </Link>
          )}
        </div>
      </div>

      {/* FILTER & VIEW CONTROL ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        {/* Store Tabs (Left) */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {tenants.map(t => (
            <Link
              key={t.id}
              href={`?tenant=${t.id}&view=${view}`}
              className={`${styles.capsule} ${selectedTenant === t.id ? styles.activeCapsule : ''}`}
            >
              {t.displayName}
            </Link>
          ))}
        </div>

        {/* Grid/List View Switcher (Right) */}
        <div className={styles.viewSwitcher}>
          <Link
            href={`?tenant=${selectedTenant}&view=grid`}
            className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : styles.viewBtnInactive}`}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 20.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            Grid
          </Link>
          <Link
            href={`?tenant=${selectedTenant}&view=list`}
            className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : styles.viewBtnInactive}`}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M3.75 6h16.5" />
            </svg>
            List
          </Link>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
          <h3 className={styles.emptyTitle}>这里还没有提示词案例</h3>
          <p className={styles.emptyText}>
            点击右上角"新建案例"按钮创建一个展示你 AI 绘画/生成模型效果的提示词吧。
          </p>
        </div>
      ) : (
        <CasesList
          cases={serializedCases}
          selectedTenantSlug={selectedTenantDetails?.slug || ''}
          view={view}
        />
      )}

      {/* PERFORMANCE STRIP (Bottom Metrics Summary) */}
      {cases.length > 0 && (
        <div className={styles.performanceStrip}>
          <div className={styles.performanceGroup}>
            <div className={styles.performanceItem}>
              <span className={styles.performanceLabel}>Total Unlocked</span>
              <span className={`${styles.performanceValue} tnum`}>
                {cases.length}
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginLeft: '6px' }}>+12%</span>
              </span>
            </div>
            <div className={styles.performanceItem}>
              <span className={styles.performanceLabel}>Daily Revenue</span>
              <span className={`${styles.performanceValue} tnum`}>
                ${cases.length * 10}.00
              </span>
            </div>
            <div className={styles.performanceItem}>
              <span className={styles.performanceLabel}>Active Trials</span>
              <span className={`${styles.performanceValue} tnum`}>
                {Math.ceil(cases.length * 1.5)}
              </span>
            </div>
          </div>

          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: 'var(--saas-accent)' }}>
            <span>View detailed analytics</span>
            <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
