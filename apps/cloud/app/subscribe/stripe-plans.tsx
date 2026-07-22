'use client'

import { useState } from 'react'
import styles from './subscribe.module.css'

interface StripePlansProps {
  tenantId: string
  monthlyPrice?: number | null    // cents
  lifetimePrice?: number | null   // cents
  locale?: string
}

export function StripePlans({ tenantId, monthlyPrice, lifetimePrice, locale = 'zh' }: StripePlansProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleCheckout = async (plan: 'monthly' | 'lifetime') => {
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Checkout failed')
      }
    } catch {
      alert('Network error')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div className={styles.grid}>
        {/* Card 1: Monthly Pass */}
        <div className={`${styles.card} ${styles.monthlyCard}`}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className={styles.cardTitle}>
                  {locale === 'zh' ? '月度订阅' : 'Monthly Pass'}
                </h3>
                <p className={styles.cardSubTitle}>
                  {locale === 'zh' ? '适合日常灵感探索者' : 'Ideal for exploring creators'}
                </p>
              </div>
              <div className={styles.priceWrapper}>
                {monthlyPrice != null ? (
                  <>
                    <span className={styles.priceVal}>${(monthlyPrice / 100).toFixed(0)}</span>
                    <span className={styles.pricePeriod}>/mo</span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--saas-text-secondary)' }}>
                    Not configured yet
                  </span>
                )}
              </div>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <span className="material-symbols-outlined styleCheck" style={{ color: '#10B981', fontSize: '20px', fontWeight: 'bold' }}>check</span>
                <span>{locale === 'zh' ? '解锁该商铺全部付费提示词' : 'Unlock all premium templates'}</span>
              </li>
              <li className={styles.featureItem}>
                <span className="material-symbols-outlined styleCheck" style={{ color: '#10B981', fontSize: '20px', fontWeight: 'bold' }}>check</span>
                <span>{locale === 'zh' ? '支持参数变量调试与一键复制' : 'Interactive parameters & fast copy'}</span>
              </li>
              <li className={styles.featureItem}>
                <span className="material-symbols-outlined styleCheck" style={{ color: '#10B981', fontSize: '20px', fontWeight: 'bold' }}>check</span>
                <span>{locale === 'zh' ? '实时运行效果预览（Web/视频）' : 'Real-time output preview'}</span>
              </li>
              <li className={styles.featureItem} style={{ opacity: 0.4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--saas-text-secondary)' }}>close</span>
                <span>{locale === 'zh' ? '专属创作者 1对1 答疑支持' : 'Dedicated creator support'}</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan !== null || monthlyPrice == null}
            className={`${styles.subscribeBtn} ${styles.monthlyBtn}`}
          >
            {loadingPlan === 'monthly' ? (
              <span>跳转中 Redirecting...</span>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shopping_bag</span>
                <span>{locale === 'zh' ? '订阅月度计划' : 'Start Monthly Plan'}</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: Lifetime Access (Featured) */}
        <div className={`${styles.card} ${styles.lifetimeCard}`}>
          {/* Glassmorphic Tag */}
          <div className={styles.glassTag}>
            {locale === 'zh' ? '💎 一次付费 终身买断' : 'LIFETIME BEST VALUE'}
          </div>

          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                {locale === 'zh' ? '终身买断' : 'Lifetime Access'}
              </h3>
              <p className={styles.cardSubTitle}>
                {locale === 'zh' ? '一次付费，永久拥有与更新' : 'One-time payment, forever access'}
              </p>
            </div>
            
            <div className={styles.priceWrapper} style={{ marginTop: '24px' }}>
              {lifetimePrice != null ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className={styles.priceVal}>${(lifetimePrice / 100).toFixed(0)}</span>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, fontWeight: 700, marginTop: '4px' }}>
                    Never pay again
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.6 }}>
                  Not configured yet
                </span>
              )}
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <span className="material-symbols-outlined" style={{ color: 'var(--saas-accent)', fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>bolt</span>
                <span>{locale === 'zh' ? '永久拥有该店铺所有当下及未来案例' : 'Unlock all current & future prompts'}</span>
              </li>
              <li className={styles.featureItem}>
                <span className="material-symbols-outlined" style={{ color: 'var(--saas-accent)', fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>bolt</span>
                <span>{locale === 'zh' ? '优先加载的高级 Sandbox 网页运行基础设施' : 'Priority loading infrastructure'}</span>
              </li>
              <li className={styles.featureItem}>
                <span className="material-symbols-outlined" style={{ color: 'var(--saas-accent)', fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>bolt</span>
                <span>{locale === 'zh' ? '附带商业商用授权与非商业衍生权利' : 'Commercial license rights'}</span>
              </li>
              <li className={styles.featureItem}>
                <span className="material-symbols-outlined" style={{ color: 'var(--saas-accent)', fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>bolt</span>
                <span>{locale === 'zh' ? '专属创作者 1对1 答疑支持' : 'Dedicated creator 1-on-1 support'}</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleCheckout('lifetime')}
            disabled={loadingPlan !== null || lifetimePrice == null}
            className={`${styles.subscribeBtn} ${styles.lifetimeBtn}`}
          >
            {loadingPlan === 'lifetime' ? (
              <span>跳转中 Redirecting...</span>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>workspace_premium</span>
                <span>{locale === 'zh' ? '立即买断终身' : 'Get Lifetime Access'}</span>
              </>
            )}
          </button>

          {/* Decorative Gradient blur */}
          <div className={styles.glowGradient}></div>
        </div>
      </div>

      {/* Trust & Guarantee Section */}
      <div className={styles.trustSection}>
        <div className={styles.trustBadge}>
          <div className={styles.trustIconWrapper}>
            <span className="material-symbols-outlined trustIcon" style={{ fontVariationSettings: "'FILL' 1" }}>encrypted</span>
          </div>
          <span>
            {locale === 'zh' ? 'Stripe 官方安全加密支付' : 'Stripe Secure Encryption'}
          </span>
        </div>
        <div className={styles.trustBadge}>
          <div className={styles.trustIconWrapper}>
            <span className="material-symbols-outlined trustIcon" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
          </div>
          <span>
            {locale === 'zh' ? '加入 1,200+ 绘图师，解锁无限创意' : 'Join 1,200+ members unlocking templates'}
          </span>
        </div>
        <div className={styles.trustBadge}>
          <div className={styles.trustIconWrapper}>
            <span className="material-symbols-outlined trustIcon" style={{ fontVariationSettings: "'FILL' 1" }}>refresh</span>
          </div>
          <span>
            {locale === 'zh' ? '随时退订，无任何收费陷阱' : 'Cancel anytime, zero risk'}
          </span>
        </div>
      </div>
    </div>
  )
}
