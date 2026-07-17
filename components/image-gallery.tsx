'use client'

import { useState, useCallback, useEffect } from 'react'
import { getThumbnailUrl, getFullImageUrl } from '../lib/supabase'
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

  const open = useCallback((index: number) => setActiveIndex(index), [])
  const close = useCallback(() => setActiveIndex(null), [])

  const goNext = useCallback(() => {
    setActiveIndex(prev => (prev !== null ? (prev + 1) % items.length : null))
  }, [items.length])

  const goPrev = useCallback(() => {
    setActiveIndex(prev =>
      prev !== null ? (prev - 1 + items.length) % items.length : null
    )
  }, [items.length])

  useEffect(() => {
    if (activeIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeIndex, close, goNext, goPrev])

  if (items.length === 0) return null

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getThumbnailUrl(item.filename)}
              alt={item.alt || alt || `Generated image ${i + 1}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className={styles.overlay}
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.lightbox} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={close}
              aria-label="Close"
            >
              ✕
            </button>
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.prevBtn}`}
                  onClick={goPrev}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.nextBtn}`}
                  onClick={goNext}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFullImageUrl(items[activeIndex].filename)}
              alt={items[activeIndex].alt || alt || 'Full resolution image'}
            />
          </div>
        </div>
      )}
    </>
  )
}
