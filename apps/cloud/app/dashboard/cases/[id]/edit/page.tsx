'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUpload } from '@/components/image-upload'
import Link from 'next/link'
import styles from '../../../dashboard.module.css'

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
          previewPoster: coverImageUrl, // Duplicate coverImageUrl to previewPoster for DB schema backwards-compatibility
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

  if (loading) return <div style={{ padding: '40px', color: 'var(--saas-text-secondary)' }}>Loading case details...</div>
  if (error && !title) return <div style={{ color: 'red', padding: '40px' }}>Error: {error}</div>

  return (
    <div className={styles.editContainer}>
      {/* Header */}
      <div className={styles.pageHeader} style={{ marginBottom: '40px' }}>
        <div>
          <Link href={`/dashboard/cases?tenant=${tenantId}`} className={styles.pageEyebrow} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75-6.75M4.5 12l6.75 6.75" />
            </svg>
            Back to Cases
          </Link>
          <h1 className={styles.pageTitle} style={{ fontSize: '2.25rem', marginTop: '4px' }}>Edit Prompt Case</h1>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          style={{
            padding: '10px 24px',
            background: 'none',
            border: '1px solid var(--saas-error)',
            color: 'var(--saas-error)',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          Delete Case
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1.5rem', fontWeight: 600 }}>{error}</p>}

      <form onSubmit={handleSubmit} className={styles.formTwoColumn}>
        {/* LEFT COLUMN: Core Content & Consolidated Preview (70%) */}
        <div className={styles.formMainCol}>
          {/* Section 1: Basic Info */}
          <section className={styles.formSection}>
            <h2 className={styles.formSectionTitle}>
              <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
              Basic Information
            </h2>
            
            <div className="space-y-6">
              <div className={styles.inputGroup}>
                <label className={styles.label}>Case Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  className={styles.input}
                  placeholder="Enter case title..."
                />
              </div>

              <div className={styles.formRowGrid2}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={styles.input}
                  >
                    <option value="photography">Photography & Realism</option>
                    <option value="product">Products & E-commerce</option>
                    <option value="people">Characters & People</option>
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Hero Emoji</label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={e => setEmoji(e.target.value)}
                    required
                    className={styles.input}
                    style={{ textAlign: 'center', fontSize: '1.25rem' }}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Prompt Text</label>
                <div style={{ 
                  backgroundColor: 'rgba(83, 58, 253, 0.04)', 
                  border: '1px dashed rgba(83, 58, 253, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '0.78rem',
                  lineHeight: '1.5',
                  color: 'var(--saas-text-primary)',
                  marginBottom: '10px'
                }}>
                  ✨ <strong>Parameterized & Default Prompts (支持参数化与默认值)</strong>: Use curly braces <code>{"{variable_name:default_value}"}</code> to define dynamic parameters (e.g. <code>{"{subject:cyberpunk girl}"}</code> or <code>{"{color:neon blue}"}</code>). Unlocked buyers can customize these fields, falling back to your default values if left blank!
                </div>
                <textarea
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  required
                  rows={6}
                  className={styles.input}
                  style={{ fontFamily: 'monospace', resize: 'none', lineHeight: '1.6' }}
                  placeholder="e.g. /imagine prompt: A high-fashion portrait of {subject}, cinematic lighting, in {color} neon tone --ar 16:9"
                />
              </div>
            </div>
          </section>

          {/* Consolidated Section 2: Preview & Assets Configuration */}
          <section className={styles.formSection}>
            <h2 className={styles.formSectionTitle}>
              <span style={{ fontSize: '1.25rem' }}>🎨</span>
              Preview & Assets
            </h2>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Preview Type (呈现方式)</label>
              <div className={styles.segmentControl}>
                {[
                  { value: 'image', label: '🖼️ Image Gallery' },
                  { value: 'video', label: '🎬 Video Player' },
                  { value: 'web', label: '🌐 Web Sandbox' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPreviewType(opt.value)}
                    className={`${styles.segmentBtn} ${previewType === opt.value ? styles.segmentBtnActive : styles.segmentBtnInactive}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Input for Video / Web URLs */}
            {previewType !== 'image' && (
              <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
                <label className={styles.label}>
                  {previewType === 'video' ? '🎬 Video URL (mp4) *' : '🌐 Web Sandbox URL *'}
                </label>
                <input
                  type="url"
                  value={previewSource}
                  onChange={e => setPreviewSource(e.target.value)}
                  required={previewType !== 'image'}
                  className={styles.input}
                  placeholder={
                    previewType === 'video'
                      ? 'https://example.com/video.mp4'
                      : 'https://v0.dev/r/xxxxx'
                  }
                />
              </div>
            )}

            {/* Single Core Image Asset Upload */}
            <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
              <ImageUpload
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                label={
                  previewType === 'video'
                    ? '视频海报 / 封面图 (Video Poster) *'
                    : previewType === 'web'
                    ? '加载占位图 / 封面图 (Sandbox Placeholder) *'
                    : '封面主图 (Cover Image) *'
                }
                required
              />
            </div>

            {/* Gallery Sub-images list: only shown for Image type */}
            {previewType === 'image' && (
              <div className={styles.inputGroup} style={{ marginTop: '24px' }}>
                <label className={styles.label}>Sub-images (画廊副图 - 逗号分隔 URLs)</label>
                <input
                  type="text"
                  value={imagesText}
                  onChange={e => setImagesText(e.target.value)}
                  className={styles.input}
                  placeholder="https://.../img1.jpg, https://.../img2.jpg"
                />
                {imagesText && (
                  <div className={styles.subImagesGrid}>
                    {imagesText.split(',').map((url: string, i: number) => {
                      const trimmedUrl = url.trim()
                      if (!trimmedUrl) return null
                      return (
                        <div key={i} className={styles.subImageWrapper}>
                          <img
                            src={trimmedUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Settings & Paywall sidebar (30%) */}
        <div className={styles.formSideCol}>
          {/* Section 4: Access Control */}
          <section className={styles.formSection}>
            <h2 className={styles.formSectionTitle}>
              <span style={{ fontSize: '1.25rem' }}>🔒</span>
              Access Control
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {[
                { value: 'free', emoji: '🆓', label: 'Free', desc: 'Visible to all visitors.' },
                { value: 'prompt_only', emoji: '👁️', label: 'Prompt Only', desc: 'Hide prompt template text.' },
                { value: 'full_lock', emoji: '🔒', label: 'Full Lock', desc: 'Subscribers only.' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`${styles.radioCard} ${paywallMode === opt.value ? styles.radioCardActive : ''}`}
                >
                  <input
                    type="radio"
                    name="access"
                    value={opt.value}
                    checked={paywallMode === opt.value}
                    onChange={() => setPaywallMode(opt.value)}
                    style={{ marginTop: '4px', color: 'var(--saas-accent)' }}
                  />
                  <div>
                    <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>{opt.emoji} {opt.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--saas-text-secondary)', lineHeight: '1.4' }}>{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
              <div className={styles.toggleWrapper}>
                <div>
                  <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem' }}>Allow Copy</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowCopy}
                  onChange={e => setAllowCopy(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--saas-accent)' }}
                />
              </div>
              <div className={styles.toggleWrapper}>
                <div>
                  <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem' }}>Watermark</span>
                </div>
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={e => setWatermarkEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--saas-accent)' }}
                />
              </div>
            </div>
          </section>

          {/* Section 5: Status & Metadata */}
          <section className={styles.formSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className={styles.formSectionTitle} style={{ margin: 0, fontSize: '1.15rem' }}>
                <span style={{ fontSize: '1.15rem' }}>🏷️</span>
                Status
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(59, 13, 233, 0.05)', padding: '6px 16px', borderRadius: '9999px', border: '1px solid rgba(59, 13, 233, 0.1)' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--saas-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Published</span>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={e => setPublished(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--saas-accent)' }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className={styles.inputGroup}>
                <label className={styles.label}>Tags</label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={e => setTagsText(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. cyber, portrait"
                />
                {tagsText && (
                  <div className={styles.tagContainer}>
                    {tagsText.split(',').map((tag, i) => {
                      const trimmed = tag.trim()
                      if (!trimmed) return null
                      return (
                        <span key={i} className={styles.tagPill}>
                          {trimmed}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Source Engine</label>
                <input
                  type="text"
                  value={sourcePlatform}
                  onChange={e => setSourcePlatform(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Midjourney"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Author Alias</label>
                <input
                  type="text"
                  value={sourceAuthor}
                  onChange={e => setSourceAuthor(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. @NeonArchitect"
                />
              </div>
            </div>
          </section>

          {/* Side Footer Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <button
              type="submit"
              disabled={submitting}
              className={styles.createBtn}
              style={{ width: '100%', padding: '16px 0', fontSize: '1.05rem', justifyContent: 'center' }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/dashboard/cases?tenant=${tenantId}`}
              className={styles.cancelBtn}
              style={{ width: '100%', padding: '16px 0', fontSize: '1.05rem', justifyContent: 'center' }}
            >
              Cancel & Discard
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
