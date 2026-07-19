'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'

interface LanguageSwitcherProps {
  currentLang: string
}

export function LanguageSwitcher({ currentLang }: LanguageSwitcherProps) {
  const pathname = usePathname()
  const router = useRouter()

  const toggle = useCallback(() => {
    const targetLang = currentLang === 'zh' ? 'en' : 'zh'
    // Replace the first path segment (the lang code)
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length > 0 && (segments[0] === 'zh' || segments[0] === 'en')) {
      segments[0] = targetLang
    }
    router.push('/' + segments.join('/'))
  }, [currentLang, pathname, router])

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        background: 'var(--feishu-card-bg)',
        border: '1px solid var(--feishu-border)',
        borderRadius: '6px',
        fontSize: '0.8125rem',
        color: 'var(--feishu-text-primary)',
        cursor: 'pointer',
        fontWeight: 500
      }}
    >
      🌐 {currentLang === 'zh' ? 'EN' : '中文'}
    </button>
  )
}
