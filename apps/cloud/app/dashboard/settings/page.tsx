import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { headers } from 'next/headers'
import styles from '../dashboard.module.css'
import { PricingSettings } from './pricing-settings'

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userId = session!.user.id

  const [tenants, user] = await Promise.all([
    db.tenant.findMany({ where: { ownerId: userId } }),
    db.user.findUnique({ where: { id: userId } }),
  ])

  const stripeAccountId = user?.stripeAccountId ?? null
  const stripeConnected = user?.stripeConnected ?? false

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className={styles.pageTitle}>店铺配置 (Settings)</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>我创建的提示词店铺 (Your Stores)</h2>
        {tenants.map((t) => (
          <div key={t.id}>
            <div className={styles.storeListItem}>
              <div>
                <div className={styles.storeListTitle}>@{t.slug}</div>
                <div className={styles.storeListMeta}>{t.displayName}</div>
              </div>
              <div>
                <a href={`/@${t.slug}`} target="_blank" className={styles.actionLinkPrimary}>
                  访问店铺 ↗
                </a>
              </div>
            </div>
            <PricingSettings
              tenantId={t.id}
              monthlyPrice={t.monthlyPrice}
              lifetimePrice={t.lifetimePrice}
              priceChangedAt={t.priceChangedAt?.toISOString() ?? null}
              userStripeAccountId={stripeAccountId}
              userStripeConnected={stripeConnected}
            />
          </div>
        ))}

        <form
          action="/api/tenants"
          method="post"
          style={{ marginTop: '24px' }}
        >
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              店铺唯一标识 (Slug)
            </label>
            <input type="text" name="slug" placeholder="e.g. cyber-avatar" required className={styles.input} />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              店铺展示名称 (Display Name)
            </label>
            <input type="text" name="displayName" placeholder="e.g. Cyberpunk Art Shop" required className={styles.input} />
          </div>

          <button type="submit" className={styles.btnSubmit}>
            创建新店铺 (Create Store)
          </button>
        </form>
      </section>
    </div>
  )
}
