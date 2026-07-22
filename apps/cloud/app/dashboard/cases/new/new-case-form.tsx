'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ImageUpload } from '@/components/image-upload'
import Link from 'next/link'
import styles from '../../dashboard.module.css'

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
          <h1 className={styles.pageTitle} style={{ fontSize: '2.25rem', marginTop: '4px' }}>New Prompt Case</h1>
        </div>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1.5rem', fontWeight: 600 }}>{error}</p>}

      <form onSubmit={handleSubmit} className={styles.formTwoColumn}>
        {/* LEFT COLUMN: Core Content & Preview (70%) */}
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
                  placeholder="e.g. 赛博朋克霓虹街景"
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
                <textarea
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  required
                  rows={6}
                  className={styles.input}
                  style={{ fontFamily: 'monospace', resize: 'none', lineHeight: '1.6' }}
                  placeholder="Paste your prompt template text here..."
                />
              </div>
            </div>
          </section>

          {/* Section 2: Assets & Gallery */}
          <section className={styles.formSection}>
            <h2 className={styles.formSectionTitle}>
              <span style={{ fontSize: '1.25rem' }}>🖼️</span>
              Assets & Gallery
            </h2>
            
            <div className="space-y-6">
              <ImageUpload
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                label="Cover Image"
                required
              />

              <div className={styles.inputGroup} style={{ marginTop: '24px' }}>
                <label className={styles.label}>Sub-images (Comma separated URLs)</label>
                <input
                  type="text"
                  value={imagesText}
                  onChange={e => setImagesText(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. case1_sub1.jpg, case1_sub2.jpg"
                />
                {imagesText && (
                  <div className={styles.subImagesGrid}>
                    {imagesText.split(',').map((url, i) => {
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
            </div>
          </section>

          {/* Section 3: Preview Mode */}
          <section className={styles.formSection}>
            <h2 className={styles.formSectionTitle}>
              <span style={{ fontSize: '1.25rem' }}>👀</span>
              Preview Mode
            </h2>

            <div className={styles.segmentControl} style={{ marginBottom: '24px' }}>
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

          {previewType !== 'image' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                {previewType === 'video' ? '🎬 Video URL' : '🌐 Web Sandbox URL'}
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

          {previewType === 'video' && (
            <div className={styles.inputGroup} style={{ marginTop: '16px' }}>
              <label className={styles.label}>🖼️ Poster Image URL (optional)</label>
              <input
                type="url"
                value={previewPoster}
                onChange={e => setPreviewPoster(e.target.value)}
                className={styles.input}
                placeholder="https://example.com/video-poster.jpg"
              />
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
                    <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px', fontSize: '0.9rem' }}>{opt.emoji} {opt.label}</span>
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
                  placeholder="e.g. @ nakazakifam"
                />
              </div>
            </div>
          </section>

          {/* Side Footer Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <button
              type="submit"
              disabled={loading}
              className={styles.createBtn}
              style={{ width: '100%', padding: '16px 0', fontSize: '1.05rem', justifyContent: 'center' }}
            >
              {loading ? 'Creating...' : 'Create Case'}
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
