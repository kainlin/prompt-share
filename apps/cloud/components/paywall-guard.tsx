'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface PaywallGuardProps {
  children: ReactNode
  isSubscribed: boolean
  tenantId: string
}

export function PaywallGuard({ children, isSubscribed, tenantId }: PaywallGuardProps) {
  const router = useRouter()

  if (isSubscribed) return <>{children}</>

  return (
    <div style={{ position: 'relative' }}>
      {/* Blurred preview of the content */}
      <div style={{ filter: 'blur(8px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Paywall overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(4px)',
          borderRadius: '8px',
          border: '1px solid var(--feishu-border)',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 600 }}>
          Premium Prompt
        </h3>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--feishu-text-secondary)', maxWidth: 320 }}>
          Subscribe to unlock full prompt text, copy functionality, and high-resolution image zoom.
        </p>
        <button
          onClick={() => router.push(`/subscribe?tenant=${tenantId}`)}
          style={{
            padding: '0.75rem 2rem',
            background: 'var(--feishu-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Subscribe Now
        </button>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--feishu-text-secondary)' }}>
          Monthly or lifetime access available
        </p>
      </div>
    </div>
  )
}
