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

  // 1. Free mode or subscribed — render children normally
  if (paywallMode === 'free' || isSubscribed) return <>{children}</>

  // 2. Full Lock mode — Option A: Double-Column Premium Value Checklist Bento Card
  if (paywallMode === 'full_lock') {
    return (
      <div style={{ position: 'relative' }}>
        {/* Watermark text background overlay */}
        {watermarkText && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: 'rgba(0,0,0,0.03)',
                transform: 'rotate(-15deg)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {watermarkText}
            </span>
          </div>
        )}

        {/* Double-column premium grid */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'stretch' }}>
          
          {/* Left Column: Blurred representation of the prompt content (hinting depth of variables/tokens) */}
          <div 
            style={{ 
              flex: 1, 
              minWidth: '280px', 
              position: 'relative', 
              overflow: 'hidden', 
              borderRadius: '24px', 
              border: '1px dashed rgba(0,0,0,0.08)', 
              padding: '24px', 
              background: 'rgba(255,255,255,0.4)', 
              filter: 'blur(6px)', 
              opacity: 0.35, 
              pointerEvents: 'none', 
              userSelect: 'none' 
            }}
          >
            {children}
          </div>

          {/* Right Column: Premium Value Proposition Checklist Box */}
          <div 
            style={{ 
              width: '380px', 
              minWidth: '320px', 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#ffffff', 
              border: '1px solid rgba(0,0,0,0.06)', 
              borderRadius: '24px', 
              padding: '32px', 
              boxShadow: '0 12px 40px rgba(0,0,0,0.03)',
              boxSizing: 'border-box'
            }}
          >
            {/* Value checklist header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(83, 58, 253, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--saas-accent)', fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>lock</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--saas-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Premium Prompt
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--saas-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  VIP Exclusive Access
                </span>
              </div>
            </div>

            {/* Checklist items */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '一键解锁该商铺全部 50+ 套高精设计提示词',
                '支持参数化变量快速调试（如 {subject}，{color}）',
                '永久去除前台图片与沙箱渲染水印',
                '获得提示词创作者官方商业授权'
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--saas-text-secondary)', lineHeight: '1.5' }}>
                  <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '18px', fontWeight: 'bold' }}>check</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA Subscribe Button */}
            <button
              onClick={() => router.push(`/subscribe?tenant=${tenantId}`)}
              style={{
                padding: '14px 0',
                background: 'var(--saas-text-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--saas-radius-btn)',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9' }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>workspace_premium</span>
              立即订阅解锁 (Subscribe Now)
            </button>

            {/* Price anchor caption */}
            <p style={{ margin: '12px 0 20px 0', fontSize: '0.72rem', color: 'var(--saas-text-secondary)', textAlign: 'center', lineHeight: '1.4', fontStyle: 'italic', opacity: 0.9 }}>
              “只需一杯咖啡的价格，省去你 10+ 小时在 Discord 调参的时间。”
            </p>

            {/* Log in link */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px', textAlign: 'center' }}>
              <a
                href={`/login?redirect=/${encodeURIComponent(`@${tenantId}`)}`}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--saas-accent)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                已订阅？登录即可解锁 →
              </a>
            </div>

          </div>

        </div>
      </div>
    )
  }

  // 3. Prompt Only mode — Option B: Elegant Fade-out with Floating Glass Crystal Button
  return (
    <div style={{ position: 'relative' }}>
      {/* Children rendered with limited max-height and fading gradient mask */}
      <div style={{ position: 'relative', maxHeight: '180px', overflow: 'hidden', borderRadius: '16px' }}>
        {children}
        
        {/* Elegant Fade Out Overlay */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '110px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 80%, rgba(255,255,255,1) 100%)',
            pointerEvents: 'none',
            zIndex: 2
          }} 
        />
      </div>

      {/* Floating Transparent Crystal Button over the fade edge */}
      <div 
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          textAlign: 'center',
          width: '100%',
          padding: '0 20px',
          boxSizing: 'border-box'
        }}
      >
        <button
          onClick={() => router.push(`/subscribe?tenant=${tenantId}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(83, 58, 253, 0.25)',
            borderRadius: '9999px',
            color: 'var(--saas-accent)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(83, 58, 253, 0.12)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseOver={e => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.setProperty('transform', 'scale(1.03)')
            btn.style.setProperty('border-color', 'rgba(83, 58, 253, 0.4)')
          }}
          onMouseOut={e => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.setProperty('transform', 'scale(1)')
            btn.style.setProperty('border-color', 'rgba(83, 58, 253, 0.25)')
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
          一键解锁完整提示词与变量
        </button>
        <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 500 }}>
          <a 
            href={`/login?redirect=/${encodeURIComponent(`@${tenantId}`)}`} 
            style={{ color: 'var(--saas-text-secondary)', textDecoration: 'underline' }}
          >
            已订阅？登录即可解锁 →
          </a>
        </div>
      </div>
    </div>
  )
}
