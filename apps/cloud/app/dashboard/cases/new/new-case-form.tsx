'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ImageUpload } from '@/components/image-upload'

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
  const [previewType, setPreviewType] = useState('image')
  const [previewSource, setPreviewSource] = useState('')
  const [previewPoster, setPreviewPoster] = useState('')
  const [paywallMode, setPaywallMode] = useState('free')
  const [allowCopy, setAllowCopy] = useState(true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
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
          previewType,
          previewSource,
          previewPoster,
          paywallMode,
          allowCopy,
          watermarkEnabled,
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

        <ImageUpload
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          label="Cover Image"
          required
        />

        {/* ── Multi-modal Preview Section ── */}
        <section style={{ padding: '1rem', border: '1px solid var(--feishu-border)', borderRadius: '8px', background: 'var(--feishu-card-bg)' }}>
          <label style={labelStyle}>Preview Type</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            {[
              { value: 'image', emoji: '🖼️', label: 'Image Gallery' },
              { value: 'video', emoji: '🎬', label: 'Video Player' },
              { value: 'web', emoji: '🌐', label: 'Web Sandbox' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreviewType(opt.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: previewType === opt.value ? '2px solid var(--feishu-accent)' : '1px solid var(--feishu-border)',
                  background: previewType === opt.value ? 'var(--feishu-accent-light)' : 'var(--feishu-bg)',
                  color: 'var(--feishu-text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: previewType === opt.value ? 600 : 400,
                }}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>

          {previewType !== 'image' && (
            <div style={{ marginTop: '0.75rem' }}>
              <label style={labelStyle}>
                {previewType === 'video' ? '🎬 Video URL' : '🌐 Web URL'}
              </label>
              <input
                type="url"
                value={previewSource}
                onChange={e => setPreviewSource(e.target.value)}
                required={previewType !== 'image'}
                style={inputStyle}
                placeholder={
                  previewType === 'video'
                    ? 'https://.../my-video.mp4'
                    : 'https://v0.dev/r/xxxxx'
                }
              />
            </div>
          )}

          {previewType === 'video' && (
            <div style={{ marginTop: '0.5rem' }}>
              <label style={labelStyle}>🖼️ Poster Image URL (optional)</label>
              <input
                type="url"
                value={previewPoster}
                onChange={e => setPreviewPoster(e.target.value)}
                style={inputStyle}
                placeholder="https://.../video-cover.jpg"
              />
            </div>
          )}
        </section>

        {/* ── Paywall Mode Section ── */}
        <section style={{ padding: '1rem', border: '1px solid var(--feishu-border)', borderRadius: '8px', background: 'var(--feishu-card-bg)' }}>
          <label style={labelStyle}>Paywall Mode</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            {[
              { value: 'free', emoji: '🆓', label: 'Free', desc: 'No restrictions' },
              { value: 'prompt_only', emoji: '👁️', label: 'Prompt Only', desc: 'Images visible, prompt locked' },
              { value: 'full_lock', emoji: '🔒', label: 'Full Lock', desc: 'All locked + watermark' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaywallMode(opt.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: paywallMode === opt.value ? '2px solid var(--feishu-accent)' : '1px solid var(--feishu-border)',
                  background: paywallMode === opt.value ? 'var(--feishu-accent-light)' : 'var(--feishu-bg)',
                  color: 'var(--feishu-text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: paywallMode === opt.value ? 600 : 400,
                  textAlign: 'left' as const,
                }}
              >
                <div>{opt.emoji} {opt.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--feishu-text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="checkbox"
                id="allowCopy"
                checked={allowCopy}
                onChange={e => setAllowCopy(e.target.checked)}
              />
              <label htmlFor="allowCopy" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                Allow Copy for Subscribers
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="checkbox"
                id="watermarkEnabled"
                checked={watermarkEnabled}
                onChange={e => setWatermarkEnabled(e.target.checked)}
              />
              <label htmlFor="watermarkEnabled" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                Enable Watermark
              </label>
            </div>
          </div>
        </section>

        <div>
          <label style={labelStyle}>Sub-images (Comma separated URLs)</label>
          <input type="text" value={imagesText} onChange={e => setImagesText(e.target.value)} style={inputStyle} placeholder="e.g. case139_full.jpg (or upload via /api/upload first)" />
          {imagesText && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {imagesText.split(',').map((url, i) => url.trim() && (
                <img
                  key={i}
                  src={url.trim()}
                  alt=""
                  style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--feishu-border)' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ))}
            </div>
          )}
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
