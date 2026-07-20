'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isRegister) {
        await authClient.signUp.email({
          email,
          password,
          name: email.split('@')[0],
        })
        setMessage('Account created! You can now sign in.')
        setIsRegister(false)
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        })
        if (error) {
          setMessage(error.message || 'Invalid email or password')
        } else {
          router.push(redirect)
        }
      }
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '6rem auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          {isRegister ? 'Create Account' : 'Sign in to PromptShare'}
        </h1>
        <p style={{ color: 'var(--feishu-text-secondary)' }}>
          {isRegister ? 'Start sharing your prompts' : 'Manage your prompt store'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
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
            boxSizing: 'border-box' as const,
            marginBottom: '0.75rem',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--feishu-border)',
            borderRadius: '8px',
            fontSize: '1rem',
            boxSizing: 'border-box' as const,
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
          {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
        <button
          onClick={() => { setIsRegister(!isRegister); setMessage('') }}
          style={{ background: 'none', border: 'none', color: 'var(--feishu-accent)', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>
      </p>

      {message && (
        <p style={{ marginTop: '1rem', textAlign: 'center', color: message.includes('created') || message.includes('Check') ? 'green' : '#e74c3c' }}>
          {message}
        </p>
      )}
    </main>
  )
}
