'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getThumbnailUrl, getFullImageUrl } from './lib/supabase-url'
import styles from './image-gallery.module.css'

interface ImageItem {
  filename: string
  alt?: string
}

interface ImageGalleryProps {
  images: string | string[]
  alt?: string
}

function parseImages(raw: string | string[]): ImageItem[] {
  const list = Array.isArray(raw) ? raw : [raw]
  return list.map(filename => ({
    filename: filename.trim(),
    alt: ''
  }))
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const items = parseImages(images)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [zoomScale, setZoomScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const dragStart = useRef({ x: 0, y: 0 })

  const open = useCallback((index: number) => {
    setActiveIndex(index)
    setIsImageLoading(true)
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const close = useCallback(() => {
    setActiveIndex(null)
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const goNext = useCallback(() => {
    if (activeIndex === null) return
    setActiveIndex((activeIndex + 1) % items.length)
    setIsImageLoading(true)
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
  }, [activeIndex, items.length])

  const goPrev = useCallback(() => {
    if (activeIndex === null) return
    setActiveIndex((activeIndex - 1 + items.length) % items.length)
    setIsImageLoading(true)
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
  }, [activeIndex, items.length])

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight' && zoomScale === 1) goNext()
      if (e.key === 'ArrowLeft' && zoomScale === 1) goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeIndex, close, goNext, goPrev, zoomScale])

  // Swipe logic (only if not zoomed in)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomScale > 1) return
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoomScale > 1 || touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (diff > 50) {
      goNext()
    } else if (diff < -50) {
      goPrev()
    }
    touchStartX.current = null
  }

  // Zoom toggling via clicking the image
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (zoomScale === 1) {
      setZoomScale(2)
      // Center the zoom slightly towards click position if possible
      setPanOffset({ x: 0, y: 0 })
    } else {
      setZoomScale(1)
      setPanOffset({ x: 0, y: 0 })
    }
  }

  // Zoom Button Controls
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoomScale(prev => Math.min(prev + 0.5, 4))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoomScale(prev => {
      const next = Math.max(prev - 0.5, 1)
      if (next === 1) setPanOffset({ x: 0, y: 0 })
      return next
    })
  }

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
  }

  // Drag / Pan logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale <= 1) return
    e.preventDefault()
    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y
    setPanOffset({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch Pan logic
  const handleTouchStartPan = (e: React.TouchEvent) => {
    if (zoomScale <= 1) return
    if (e.touches.length === 1) {
      setIsDragging(true)
      dragStart.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      }
    }
  }

  const handleTouchMovePan = (e: React.TouchEvent) => {
    if (!isDragging || zoomScale <= 1) return
    if (e.touches.length === 1) {
      const newX = e.touches[0].clientX - dragStart.current.x
      const newY = e.touches[0].clientY - dragStart.current.y
      setPanOffset({ x: newX, y: newY })
    }
  }

  const handleTouchEndPan = () => {
    setIsDragging(false)
  }

  const handleDownload = (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    window.open(url, '_blank')
  }

  if (items.length === 0) return null

  // Dynamic image styling for panning and zooming
  const imageStyle = {
    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
    cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'zoom-out') : 'zoom-in',
    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
  }

  return (
    <>
      <div className={styles.grid}>
        {items.map((item, i) => (
          <div
            key={item.filename}
            className={styles.card}
            onClick={() => open(i)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter') open(i)
            }}
          >
            <div className={styles.imageWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getThumbnailUrl(item.filename)}
                alt={item.alt || alt || `Generated image ${i + 1}`}
                className={styles.thumbnail}
                loading="lazy"
              />
              <div className={styles.hoverOverlay}>
                <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                <span className={styles.hoverText}>查看大图</span>
              </div>
              {items.length > 1 && (
                <span className={styles.badge}>{i + 1} / {items.length}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className={styles.overlay}
          onClick={close}
          role="dialog"
          aria-modal="true"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.lightbox} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={close}
              aria-label="Close"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {items.length > 1 && zoomScale === 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.prevBtn}`}
                  onClick={goPrev}
                  aria-label="Previous image"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.nextBtn}`}
                  onClick={goNext}
                  aria-label="Next image"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <div
              className={styles.imageContainer}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStartPan}
              onTouchMove={handleTouchMovePan}
              onTouchEnd={handleTouchEndPan}
            >
              {isImageLoading && <div className={styles.skeleton} />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getFullImageUrl(items[activeIndex].filename)}
                alt={items[activeIndex].alt || alt || 'Full resolution image'}
                className={`${styles.lightboxImage} ${isImageLoading ? styles.hidden : styles.visible}`}
                style={imageStyle}
                onLoad={() => setIsImageLoading(false)}
                onClick={handleImageClick}
                draggable={false}
              />
            </div>

            <div className={styles.controlBar}>
              <span className={styles.infoText}>
                {activeIndex + 1} / {items.length} • {alt || 'Generated Image'}
              </span>

              <div className={styles.zoomControls}>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 1}
                  title="缩小"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </button>
                <span className={styles.zoomLabel}>{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 4}
                  title="放大"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {zoomScale > 1 && (
                  <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={handleResetZoom}
                    title="重置缩放"
                  >
                    重置
                  </button>
                )}
              </div>

              <button
                type="button"
                className={styles.actionBtn}
                onClick={(e) => handleDownload(e, getFullImageUrl(items[activeIndex].filename))}
                title="在新标签页中打开原图"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>查看原图</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
