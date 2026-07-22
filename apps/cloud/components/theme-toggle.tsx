'use client'

import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      type="button"
      title={dark ? 'Switch to light mode' : '切换为深色模式'}
      style={{
        background: 'none',
        border: '1px solid var(--saas-border)',
        borderRadius: 'var(--saas-radius-btn)',
        cursor: 'pointer',
        fontSize: '1rem',
        width: '36px',
        height: '36px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--saas-text-primary)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
