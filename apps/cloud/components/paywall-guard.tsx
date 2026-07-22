'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface PaywallGuardProps {
  children: ReactNode
  isSubscribed: boolean
  tenantId: string
  paywallMode: 'free' | 'prompt_only' | 'full_lock'
  watermarkText?: string
  locale?: string
}

export function PaywallGuard({ children, isSubscribed, tenantId, paywallMode, watermarkText, locale = 'zh' }: PaywallGuardProps) {
  const router = useRouter()

  // 1. Free mode or subscribed — render children normally
  if (paywallMode === 'free' || isSubscribed) return <>{children}</>

  // 2. Full Lock mode — Option A: Bento-Split Value Card (User HTML style)
  if (paywallMode === 'full_lock') {
    return (
      <div 
        style={{ 
          position: 'relative',
          border: '1px solid rgba(0,0,0,0.05)',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.08), 0 10px 20px -5px rgba(0, 0, 0, 0.04)',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        {/* Watermark background overlay */}
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

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Bento Split layout */}
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            
            {/* Left: Blurred config preview */}
            <div 
              style={{
                position: 'relative',
                minHeight: '200px',
                borderRadius: '16px',
                background: 'var(--saas-sidebar)',
                border: '1px solid rgba(0,0,0,0.06)',
                padding: '24px',
                overflow: 'hidden',
                flex: 1.1,
                minWidth: '250px',
                boxSizing: 'border-box'
              }}
            >
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--saas-text-secondary)', letterSpacing: '0.05em' }}>
                {locale === 'zh' ? '参数配置' : 'Prompt Config'}
              </h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 10px', background: 'rgba(83, 58, 253, 0.05)', border: '1px solid rgba(83, 58, 253, 0.15)', color: 'var(--saas-accent)', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}>--ar 4:5</span>
                <span style={{ padding: '4px 10px', background: 'rgba(83, 58, 253, 0.05)', border: '1px solid rgba(83, 58, 253, 0.15)', color: 'var(--saas-accent)', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}>--v 6.0</span>
              </div>
              <div style={{ filter: 'blur(5px)', opacity: 0.35, userSelect: 'none', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--saas-text-secondary)' }}>
                anime_portrait_mastery, masterwork cinematic lighting, extremely high detail, cyber-samurai female character...
              </div>

              {/* Lock Gradient & Crystal Button */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,1) 90%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}
              >
                <button
                  onClick={() => router.push(`/subscribe?tenant=${tenantId}`)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(83, 58, 253, 0.3)',
                    borderRadius: '9999px',
                    color: 'var(--saas-accent)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(83, 58, 253, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseOver={e => {
                    const btn = e.currentTarget as HTMLButtonElement
                    btn.style.transform = 'scale(1.03) translateY(-1px)'
                    btn.style.boxShadow = '0 10px 28px rgba(83, 58, 253, 0.18)'
                  }}
                  onMouseOut={e => {
                    const btn = e.currentTarget as HTMLButtonElement
                    btn.style.transform = 'scale(1)'
                    btn.style.boxShadow = '0 8px 24px rgba(83, 58, 253, 0.12)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  <span>{locale === 'zh' ? '一键解锁完整提示词与变量' : 'Unlock Full Prompt'}</span>
                </button>
              </div>
            </div>

            {/* Right: Benefits checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 0.9, minWidth: '230px', boxSizing: 'border-box' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--saas-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {locale === 'zh' ? '订阅会员专属权益' : 'Membership'}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  locale === 'zh' ? '获取完整提示词与调试参数' : 'Full prompt string & parameters',
                  locale === 'zh' ? '反向提示词优化（避免崩脸与杂线）' : 'Negative prompt optimization',
                  locale === 'zh' ? '附带模型种子值（Seed）与权重推荐' : 'Model-specific seed & weights'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--saas-text-secondary)', lineHeight: '1.4' }}>
                    <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '20px', fontWeight: 'bold', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom Quote Anchor */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px', marginTop: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--saas-text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>
              {locale === 'zh' 
                ? '“只需一杯咖啡的价格，省去你 10+ 小时在 Discord 调参的时间。”'
                : '"Unlock instantly for the price of a coffee, saving 10+ hours of tweaking settings on Discord."'}
            </p>
          </div>
        </div>

      </div>
    )
  }

  // 3. Prompt Only mode — Option B: Elegant Fade-out with Floating Crystal Button
  return (
    <div style={{ position: 'relative', width: '100%' }}>
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
            btn.style.setProperty('transform', 'scale(1.03) translateY(-1px)')
            btn.style.setProperty('border-color', 'rgba(83, 58, 253, 0.4)')
          }}
          onMouseOut={e => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.setProperty('transform', 'scale(1)')
            btn.style.setProperty('border-color', 'rgba(83, 58, 253, 0.25)')
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
          <span>{locale === 'zh' ? '一键解锁完整提示词与变量' : 'Unlock Full Prompt'}</span>
        </button>
        <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 500 }}>
          <a 
            href={`/login?redirect=/${encodeURIComponent(`@${tenantId}`)}`} 
            style={{ color: 'var(--saas-text-secondary)', textDecoration: 'underline' }}
          >
            {locale === 'zh' ? '已订阅？登录即可解锁 →' : 'Already subscribed? Log in to unlock →'}
          </a>
        </div>
      </div>
    </div>
  )
}
