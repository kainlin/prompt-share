'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function NewCaseForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenant')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('photography')
  const [emoji, setEmoji] = useState('📷')
  const [promptText, setPromptText] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [imagesText, setImagesText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('')
  const [sourceAuthor, setSourceAuthor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tenantId) {
      router.push('/dashboard')
    }
  }, [tenantId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const images = imagesText.split(',').map(s => s.trim()).filter(Boolean)
    const tags = tagsText.split(',').map(s => s.trim()).filter(Boolean)

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          title,
          category,
          emoji,
          promptText,
          coverImageUrl,
          images,
          tags,
          sourcePlatform,
          sourceAuthor,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        router.push(`/dashboard/cases?tenant=${tenantId}`)
      } else {
        setError(data.error || 'Failed to create case')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!tenantId) return null

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href={`/dashboard/cases?tenant=${tenantId}`} style={{ fontSize: '0.85rem', color: 'var(--feishu-text-secondary)', textDecoration: 'none' }}>
          ← Back to Cases
        </a>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0' }}>New Prompt Case</h1>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} placeholder="e.g. 赛博朋克霓虹街景" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="photography">Photography & Realism</option>
              <option value="product">Products & E-commerce</option>
              <option value="people">Characters & People</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Emoji Icon</label>
            <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} required style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Prompt Text</label>
          <textarea
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            required
            rows={6}
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            placeholder={`{
  "style": "cyberpunk",
  "subject": "neon streets",
  "detail": "{argument name=\\"detail\\" default=\\"wet rain reflections\\"}"
}`}
          />
        </div>

        <div>
          <label style={labelStyle}>Cover Image URL</label>
          <input type="text" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} required style={inputStyle} placeholder="e.g. case139_thumb.webp" />
        </div>

        <div>
          <label style={labelStyle}>Sub-images (Comma separated)</label>
          <input type="text" value={imagesText} onChange={e => setImagesText(e.target.value)} style={inputStyle} placeholder="e.g. case139_full.jpg" />
        </div>

        <div>
          <label style={labelStyle}>Tags (Comma separated)</label>
          <input type="text" value={tagsText} onChange={e => setTagsText(e.target.value)} style={inputStyle} placeholder="e.g. 赛博朋克, 霓虹" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Source Platform</label>
            <input type="text" value={sourcePlatform} onChange={e => setSourcePlatform(e.target.value)} style={inputStyle} placeholder="e.g. Midjourney" />
          </div>
          <div>
            <label style={labelStyle}>Source Author</label>
            <input type="text" value={sourceAuthor} onChange={e => setSourceAuthor(e.target.value)} style={inputStyle} placeholder="e.g. @nakazakifam" />
          </div>
        </div>

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Creating...' : 'Create Case'}
        </button>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--feishu-text-primary)',
  marginBottom: '0.25rem',
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem',
  border: '1px solid var(--feishu-border)',
  borderRadius: '6px',
  fontSize: '0.9rem',
  boxSizing: 'border-box' as const,
  background: 'var(--feishu-bg)',
  color: 'var(--feishu-text-primary)',
}

const btnStyle: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.75rem',
  background: 'var(--feishu-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer',
}
