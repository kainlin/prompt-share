'use client'

import { useState } from 'react'

interface StripePlansProps {
  tenantId: string
  monthlyPrice?: number | null    // cents
  lifetimePrice?: number | null   // cents
}

export function StripePlans({ tenantId, monthlyPrice, lifetimePrice }: StripePlansProps) {
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
    <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
      {/* Monthly Plan */}
      <div style={cardStyle}>
        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Monthly Pass</h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>
          {monthlyPrice != null
            ? <>${(monthlyPrice / 100).toFixed(2)}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--feishu-text-secondary)' }}>/mo</span></>
            : <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--feishu-text-secondary)' }}>Not configured yet</span>
          }
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--feishu-text-secondary)', margin: '0 0 1.5rem 0', flex: 1 }}>
          Cancel anytime. Unlocks all premium prompt templates in this store.
        </p>
        <button
          onClick={() => handleCheckout('monthly')}
          disabled={loadingPlan !== null}
          style={btnStyle}
        >
          {loadingPlan === 'monthly' ? 'Redirecting...' : 'Subscribe'}
        </button>
      </div>

      {/* Lifetime Plan */}
      <div style={{ ...cardStyle, borderColor: 'var(--feishu-accent)', boxShadow: '0 4px 15px rgba(51, 112, 255, 0.1)' }}>
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--feishu-accent-light)', color: 'var(--feishu-accent)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
          BEST VALUE
        </div>
        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Lifetime Access</h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>
          {lifetimePrice != null
            ? <>${(lifetimePrice / 100).toFixed(2)}</>
            : <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--feishu-text-secondary)' }}>Not configured yet</span>
          }
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--feishu-text-secondary)', margin: '0 0 1.5rem 0', flex: 1 }}>
          Pay once, own forever. Lifetime updates to all future cases in this store.
        </p>
        <button
          onClick={() => handleCheckout('lifetime')}
          disabled={loadingPlan !== null}
          style={{ ...btnStyle, background: 'var(--feishu-accent)', color: '#fff', borderColor: 'var(--feishu-accent)' }}
        >
          {loadingPlan === 'lifetime' ? 'Redirecting...' : 'Buy Lifetime'}
        </button>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  position: 'relative',
  padding: '2rem 1.5rem',
  border: '1px solid var(--feishu-border)',
  borderRadius: '12px',
  background: 'var(--feishu-card-bg)',
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'center',
}

const btnStyle: React.CSSProperties = {
  padding: '0.6rem',
  background: 'transparent',
  border: '1px solid var(--feishu-border)',
  color: 'var(--feishu-text-primary)',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
}
