'use client'

import React, { useState, useEffect } from 'react'
import styles from './iframe-sandbox.module.css'

interface IframeSandboxProps {
  sourceUrl: string
}

/** Timeout in ms before hiding the skeleton even if the iframe hasn't loaded */
const LOAD_TIMEOUT_MS = 10_000

export function IframeSandbox({ sourceUrl }: IframeSandboxProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Build an embed-friendly URL where the platform supports it.
  // v0.dev and Claude share links typically respond with X-Frame-Options: DENY
  // when loaded directly — some platforms offer an /embed variant.
  const getEmbedUrl = (url: string): string => {
    const trimmed = url.trim()

    // v0.dev: try the embed path if not already using it
    if (trimmed.includes('v0.dev') && !trimmed.includes('/embed/')) {
      // The /r/ path is the public share link; there is no official embed
      // endpoint, so we return as-is and rely on the timeout fallback
      return trimmed
    }

    return trimmed
  }

  // Fallback timeout: if the iframe never fires onLoad (X-Frame-Options deny,
  // CSP frame-ancestors block, network error), unhide the frame after a delay
  useEffect(() => {
    if (!loading) return

    const timer = setTimeout(() => {
      setLoading(false)
      setLoadError(true)
    }, LOAD_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [loading, sourceUrl])

  // Reset loading state when sourceUrl changes
  useEffect(() => {
    setLoading(true)
    setLoadError(false)
  }, [sourceUrl])

  const embedUrl = getEmbedUrl(sourceUrl)

  return (
    <div className={styles.sandboxContainer}>
      {/* Viewport Control Bar */}
      <div className={styles.toolbar}>
        <div className={styles.deviceControls}>
          <button
            type="button"
            className={`${styles.deviceBtn} ${device === 'desktop' ? styles.active : ''}`}
            onClick={() => setDevice('desktop')}
          >
            🖥️ Desktop
          </button>
          <button
            type="button"
            className={`${styles.deviceBtn} ${device === 'tablet' ? styles.active : ''}`}
            onClick={() => setDevice('tablet')}
          >
            📟 Tablet
          </button>
          <button
            type="button"
            className={`${styles.deviceBtn} ${device === 'mobile' ? styles.active : ''}`}
            onClick={() => setDevice('mobile')}
          >
            📱 Mobile
          </button>
        </div>
        <div className={styles.sourceBadge}>LIVE PREVIEW</div>
      </div>

      {/* Frame Viewport Container */}
      <div className={styles.viewportWrapper}>
        <div className={`${styles.viewport} ${styles[device]}`}>
          {loading && (
            <div className={styles.skeletonContainer}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>加载在线交互沙箱...</span>
            </div>
          )}
          <iframe
            src={embedUrl}
            className={`${styles.iframe} ${loading ? styles.hidden : styles.visible}`}
            onLoad={() => {
              setLoading(false)
              setLoadError(false)
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
            allow="clipboard-write"
            loading="lazy"
            title="Interactive AI Output Sandbox"
          />
          {loadError && (
            <div className={styles.errorOverlay}>
              <span className={styles.errorText}>
                此网页可能不允许嵌入预览
              </span>
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.errorLink}
              >
                在新标签页中打开 ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
