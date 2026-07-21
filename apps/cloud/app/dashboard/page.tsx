import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { headers } from 'next/headers'
import { EarningsCard } from './earnings-card'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  const tenants = await db.tenant.findMany({
    where: { ownerId: session!.user.id },
    include: { _count: { select: { cases: true, subscriptions: true } } },
  })

  // Pastel theme classes to cycle through (matching Notion spec in docs)
  const themeClasses = [
    styles.roseCard,
    styles.orangeCard,
    styles.lavenderCard,
    styles.mintCard
  ]

  // Category labels based on index (Mastercard Orbit/Service style)
  const storeCategories = [
    '写实摄影 Store',
    '产品渲染 Store',
    '人物角色 Store',
    '网页组件 Store'
  ]

  return (
    <div>
      <h1 className={styles.pageTitle}>我的提示词店铺 (Stores)</h1>

      <EarningsCard />

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
            const categoryText = storeCategories[index % storeCategories.length]
            
            return (
              <Link
                key={t.id}
                href={`/dashboard/cases?tenant=${t.id}`}
                className={`${styles.card} ${themeClass}`}
              >
                {/* Card Header with Mastercard category label & Satellite micro-CTA */}
                <div className={styles.cardHeader}>
                  <span className={styles.badge}>{categoryText}</span>
                  <div className={styles.cardArrow}>
                    <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Card Body */}
                <h3 className={styles.storeSlug}>@{t.slug}</h3>
                <p className={styles.storeMeta}>
                  <span className="tnum" style={{ fontWeight: 700 }}>{t._count.cases}</span>
                  <span>个案例 (Cases)</span>
                  <span className={styles.metaDot} />
                  <span className="tnum" style={{ fontWeight: 700 }}>{t._count.subscriptions}</span>
                  <span>位订阅者 (Subscribers)</span>
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
