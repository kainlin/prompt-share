'use client'

import React, { useRef, useState } from 'react'
import styles from './video-player.module.css'

interface VideoPlayerProps {
  videoUrl: string
  posterUrl?: string
  isGalleryCard?: boolean
}

export function VideoPlayer({ videoUrl, posterUrl, isGalleryCard = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleMouseEnter = () => {
    if (isGalleryCard && videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Video autoplay failed:', err.message)
          }
        })
    }
  }

  const handleMouseLeave = () => {
    if (isGalleryCard && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  return (
    <div 
      className={`${styles.container} ${isGalleryCard ? styles.galleryCard : styles.detailPlayer}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        className={styles.video}
        muted
        loop
        playsInline
        controls={!isGalleryCard}
        preload="metadata"
      />
      {isGalleryCard && !isPlaying && (
        <div className={styles.overlay}>
          <div className={styles.playIconContainer}>
            <svg className={styles.playIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className={styles.overlayText}>悬停自动播放</span>
        </div>
      )}
    </div>
  )
}
