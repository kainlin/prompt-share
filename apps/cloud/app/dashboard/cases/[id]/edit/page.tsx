'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUpload } from '@/components/image-upload'

interface Props {
  params: Promise<{ id: string }>
}

export default function EditCasePage({ params }: Props) {
  const router = useRouter()
  const { id } = use(params)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('photography')
  const [emoji, setEmoji] = useState('📷')
  const [promptText, setPromptText] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [imagesText, setImagesText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('')
  const [sourceAuthor, setSourceAuthor] = useState('')
  const [published, setPublished] = useState(true)
  const [previewType, setPreviewType] = useState('image')
  const [previewSource, setPreviewSource] = useState('')
  const [previewPoster, setPreviewPoster] = useState('')
  const [paywallMode, setPaywallMode] = useState('free')
  const [allowCopy, setAllowCopy] = useState(true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [tenantId, setTenantId] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await fetch(`/api/cases/${id}`)
        if (!res.ok) {
          throw new Error('Failed to fetch case')
        }
        const data = await res.json()
        setTitle(data.title)
        setCategory(data.category)
        setEmoji(data.emoji)
        setPromptText(data.promptText)
        setCoverImageUrl(data.coverImageUrl)
        setImagesText(data.images?.join(', ') || '')
        setTagsText(data.tags?.join(', ') || '')
        setSourcePlatform(data.sourcePlatform || '')
        setSourceAuthor(data.sourceAuthor || '')
        setPublished(data.published)
        setPreviewType(data.previewType || 'image')
        setPreviewSource(data.previewSource || '')
        setPreviewPoster(data.previewPoster || '')
        setPaywallMode(data.paywallMode || 'free')
        setAllowCopy(data.allowCopy !== undefined ? data.allowCopy : true)
        setWatermarkEnabled(data.watermarkEnabled || false)
        setTenantId(data.tenantId)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCase()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const images = imagesText.split(',').map(s => s.trim()).filter(Boolean)
    const tags = tagsText.split(',').map(s => s.trim()).filter(Boolean)

    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          emoji,
          promptText,
          coverImageUrl,
          images,
          tags,
          sourcePlatform,
          sourceAuthor,
          published,
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
        setError(data.error || 'Failed to update case')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this case?')) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/cases/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push(`/dashboard/cases?tenant=${tenantId}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete case')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading case details...</div>
  if (error && !title) return <div style={{ color: 'red' }}>Error: {error}</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <a href={`/dashboard/cases?tenant=${tenantId}`} style={{ fontSize: '0.85rem', color: 'var(--feishu-text-secondary)', textDecoration: 'none' }}>
            ← Back to Cases
          </a>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0' }}>Edit Prompt Case</h1>
        </div>
        <button
          onClick={handleDelete}
          disabled={submitting}
          style={{
            padding: '0.5rem 1rem',
            background: 'none',
            border: '1px solid red',
            color: 'red',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          Delete Case
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} />
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
          <input type="text" value={imagesText} onChange={e => setImagesText(e.target.value)} style={inputStyle} />
          {imagesText && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {imagesText.split(',').map((url: string, i: number) => url.trim() && (
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
          <input type="text" value={tagsText} onChange={e => setTagsText(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Source Platform</label>
            <input type="text" value={sourcePlatform} onChange={e => setSourcePlatform(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Source Author</label>
            <input type="text" value={sourceAuthor} onChange={e => setSourceAuthor(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input type="checkbox" id="published" checked={published} onChange={e => setPublished(e.target.checked)} />
          <label htmlFor="published" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Published (Visible on store page)</label>
        </div>

        <button type="submit" disabled={submitting} style={btnStyle}>
          {submitting ? 'Saving...' : 'Save Changes'}
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
