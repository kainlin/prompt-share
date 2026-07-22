import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { headers } from 'next/headers'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  const tenants = await db.tenant.findMany({
    where: { ownerId: session!.user.id },
    include: { _count: { select: { cases: true, subscriptions: true } } },
  })

  // Pastel theme classes matching Stitch's macaron tokens
  const themeClasses = [
    styles.lavenderCard, // Soft Sky
    styles.roseCard,     // Soft Rose
    styles.mintCard,     // Soft Mint
    styles.orangeCard    // Soft Apricot
  ]

  const storeCategories = [
    { id: 'photography', emoji: '📷', label: 'Photography' },
    { id: 'product', emoji: '🛍️', label: 'Product' },
    { id: 'people', emoji: '🧍', label: 'Character' }
  ]

  return (
    <div>
      {/* Dashboard Top Header Section */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>Console Overview</p>
          <h1 className={styles.pageTitle}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/dashboard/settings" className={styles.createBtn}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            新建店铺 (New Store)
          </Link>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🏬</div>
          <h3 className={styles.emptyTitle}>你还没有创建提示词店铺</h3>
          <p className={styles.emptyText}>
            创建一个专属店铺，上传你的 AI 图像生成提示词，开启你的订阅变现之旅吧。
          </p>
          <Link href="/dashboard/settings" className={styles.createBtn}>
            创建我的第一个店铺
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {tenants.map((t, index) => {
            const themeClass = themeClasses[index % themeClasses.length]
            const category = storeCategories[index % storeCategories.length]
            
            return (
              <Link
                key={t.id}
                href={`/dashboard/cases?tenant=${t.id}`}
                className={`${styles.card} ${themeClass}`}
              >
                {/* Top Section */}
                <div>
                  <div className={styles.cardHeader}>
                    <div className={styles.iconWrapper}>
                      <span style={{ fontSize: '1.75rem' }}>{category.emoji}</span>
                    </div>
                    <span className={styles.badge}>{category.label}</span>
                  </div>
                  <h3 className={styles.storeSlug}>@{t.slug}</h3>
                  <p className={styles.storeDesc}>
                    {t.bio || '探索高品质的 AI 图像生成提示词，包括多模态预览与一键复制功能。'}
                  </p>
                </div>

                {/* Bottom Section */}
                <div className={styles.cardFooter}>
                  <div className={styles.cardStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Cases</span>
                      <span className={`${styles.statValue} tnum`}>{t._count.cases}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Subscribers</span>
                      <span className={`${styles.statValue} tnum`}>{t._count.subscriptions}</span>
                    </div>
                  </div>
                  <div className={styles.cardArrow}>
                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
