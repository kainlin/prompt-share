'use client'

import { useState, useRef, useCallback } from 'react'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
  required?: boolean
}

export function ImageUpload({
  value,
  onChange,
  label = 'Cover Image',
  required = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(value)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Show local preview immediately
      const localPreview = URL.createObjectURL(file)
      setPreviewUrl(localPreview)
      setError('')
      setUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (res.ok) {
          onChange(data.url)
          setPreviewUrl(data.url)
          // Revoke local blob URL to free memory
          URL.revokeObjectURL(localPreview)
        } else {
          setError(data.error || 'Upload failed')
          // Revert preview
          setPreviewUrl(value)
          URL.revokeObjectURL(localPreview)
        }
      } catch {
        setError('Network error during upload')
        setPreviewUrl(value)
      } finally {
        setUploading(false)
        // Reset input so the same file can be re-selected
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [onChange, value]
  )

  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </label>

      {/* Preview */}
      {(previewUrl || uploading) && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/10',
            borderRadius: '8px',
            border: '1px solid var(--feishu-border)',
            overflow: 'hidden',
            marginBottom: '0.5rem',
            background: 'var(--feishu-card-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {uploading ? (
            <div style={{ textAlign: 'center', color: 'var(--feishu-text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⏳</div>
              <div style={{ fontSize: '0.85rem' }}>Uploading...</div>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={uploading}
        style={inputFileStyle}
      />

      {/* Manual URL fallback */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste image URL directly..."
        style={{
          ...inputStyle,
          marginTop: '0.4rem',
          fontSize: '0.8rem',
          color: 'var(--feishu-text-secondary)',
        }}
      />

      {error && (
        <p style={{ color: 'red', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{error}</p>
      )}
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

const inputFileStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  fontSize: '0.85rem',
  boxSizing: 'border-box' as const,
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.4rem 0.6rem',
  border: '1px solid var(--feishu-border)',
  borderRadius: '6px',
  fontSize: '0.8rem',
  boxSizing: 'border-box' as const,
  background: 'var(--feishu-bg)',
  color: 'var(--feishu-text-primary)',
}
