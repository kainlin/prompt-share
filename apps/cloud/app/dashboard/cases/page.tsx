import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { headers } from 'next/headers'
import styles from '../dashboard.module.css'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function CasesPage({ searchParams }: Props) {
  const session = await auth.api.getSession({ headers: await headers() })
  const { tenant: tenantId } = await searchParams

  const tenants = await db.tenant.findMany({ where: { ownerId: session!.user.id } })
  const selectedTenant = tenantId || tenants[0]?.id

  const cases = selectedTenant
    ? await db.promptCase.findMany({
        where: { tenantId: selectedTenant },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>案例管理 (Prompt Cases)</h1>
        {selectedTenant && (
          <Link
            href={`/dashboard/cases/new?tenant=${selectedTenant}`}
            className={styles.createBtn}
            style={{ padding: '10px 24px' }}
          >
            + 新建案例 (New Case)
          </Link>
        )}
      </div>

      {/* Tenant selector */}
      <div className={styles.capsuleGroup}>
        {tenants.map(t => (
          <Link
            key={t.id}
            href={`?tenant=${t.id}`}
            className={`${styles.capsule} ${selectedTenant === t.id ? styles.activeCapsule : ''}`}
          >
            {t.displayName}
          </Link>
        ))}
      </div>

      {cases.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
          <h3 className={styles.emptyTitle}>这里还没有提示词案例</h3>
          <p className={styles.emptyText}>
            点击右上角“新建案例”按钮创建一个展示你 AI 绘画/生成模型效果的提示词吧。
          </p>
        </div>
      ) : (
        <div className={styles.listGroup}>
          {cases.map(c => (
            <div key={c.id} className={styles.listItem}>
              <div className={styles.listInfo}>
                <span style={{ fontSize: '1.25rem' }}>{c.emoji || '📷'}</span>
                <div>
                  <span className={styles.listTitle}>{c.title}</span>
                  <span style={{ marginLeft: '12px' }} className={styles.listBadge}>
                    {c.published ? '🟢 已发布' : '⚫ 草稿'}
                  </span>
                  <span style={{ marginLeft: '6px' }} className={styles.listBadge}>
                    {c.category}
                  </span>
                </div>
              </div>
              
              <div className={styles.listActions}>
                <Link
                  href={`/dashboard/cases/${c.id}/edit`}
                  className={styles.actionLinkPrimary}
                >
                  编辑 (Edit)
                </Link>
                <Link
                  href={`/@${tenants.find(t => t.id === selectedTenant)?.slug}/${c.slug}`}
                  target="_blank"
                  className={styles.actionLinkSecondary}
                >
                  预览 (View) ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
