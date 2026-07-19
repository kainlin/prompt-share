'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback?redirect=${redirect}` },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 400, margin: '6rem auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Sign in to PromptShare</h1>
        <p style={{ color: 'var(--feishu-text-secondary)' }}>Manage your prompt store</p>
      </div>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--feishu-border)',
            borderRadius: '8px',
            fontSize: '1rem',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'var(--feishu-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: '1rem', textAlign: 'center', color: message.includes('Check') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
    </main>
  )
}
