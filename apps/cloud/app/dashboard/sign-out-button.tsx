'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
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
      }}
    >
      🚪 Sign out
    </button>
  )
}
