'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

interface SignOutButtonProps {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className={className}
      title="退出登录 (Sign Out)"
      type="button"
      style={!className ? {
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        textDecoration: 'none',
        color: 'var(--feishu-text-primary)',
        fontSize: '0.9rem',
        display: 'block',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left' as const,
      } : undefined}
    >
      {className ? (
        <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ) : (
        '🚪 Sign out'
      )}
    </button>
  )
}
