'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface PaywallGuardProps {
  children: ReactNode
  isSubscribed: boolean
  tenantId: string
  paywallMode: 'free' | 'prompt_only' | 'full_lock'
  watermarkText?: string
}

export function PaywallGuard({ children, isSubscribed, tenantId, paywallMode, watermarkText }: PaywallGuardProps) {
  const router = useRouter()

  // Free mode or subscribed — render children normally
  if (paywallMode === 'free' || isSubscribed) return <>{children}</>

  // full_lock mode — blur overlay + watermark + CTA
  if (paywallMode === 'full_lock') {
    return (
      <div style={{ position: 'relative' }}>
        {/* Blurred preview of the content */}
        <div style={{ filter: 'blur(8px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
          {children}
        </div>

        {/* Watermark text overlay */}
        {watermarkText && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'rgba(0,0,0,0.06)',
                transform: 'rotate(-20deg)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {watermarkText}
            </span>
          </div>
        )}

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
            zIndex: 3,
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

  // prompt_only mode — children visible with bottom CTA banner, no blur
  return (
    <div style={{ position: 'relative' }}>
      {/* Children rendered without blur */}
      {children}

      {/* Bottom CTA banner */}
      <div
        style={{
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, #fef9e7, #fef3c7)',
          borderRadius: '8px',
          border: '1px solid #fcd34d',
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#92400e' }}>
            👁️ Preview Mode
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#a16207' }}>
            You can view the prompt but copying is locked. Subscribe to unlock full access.
          </p>
        </div>
        <button
          onClick={() => router.push(`/subscribe?tenant=${tenantId}`)}
          style={{
            padding: '0.6rem 1.5rem',
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Subscribe to Copy
        </button>
      </div>
    </div>
  )
}
