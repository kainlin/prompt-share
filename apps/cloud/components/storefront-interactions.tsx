'use client'

import { useEffect, useState, MouseEvent } from 'react'
import Link from 'next/link'
import styles from '../app/[tenant]/tenant-page.module.css'

interface Case {
  id: string
  title: string
  slug: string
  category: string
  emoji: string
  coverImageUrl: string | null
  promptText: string
  likeCount: number
  viewCount: number
}

// 1. Client-side View Counter Trigger
export function ViewTracker({ caseId }: { caseId: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/cases/${caseId}/view`, { method: 'POST' }).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [caseId])

  return null
}

// 2. Client-side Pinterest Masonry Card with toggle likes and dedup views
export function PinterestCard({ c, rawTenant }: { c: Case; rawTenant: string }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(c.likeCount)
  const [pop, setPop] = useState(false)

  // Retrieve user liked status on load
  useEffect(() => {
    fetch('/api/cases/stats-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseIds: [c.id] }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.stats && data.stats[c.id]) {
          setLiked(data.stats[c.id].liked)
        }
      })
      .catch(() => {})
  }, [c.id])

  const handleLikeToggle = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Trigger jelly pop scaling animation
    setPop(true)
    setTimeout(() => setPop(false), 300)

    // Optimistic UI updates
    const prevLiked = liked
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(prev => prev + (newLiked ? 1 : -1))

    try {
      const res = await fetch(`/api/cases/${c.id}/like`, { method: 'POST' })
      const data = await res.json()
      if (res.status === 401) {
        alert(data.error || '请先登录后再进行点赞。')
        // Rollback states
        setLiked(prevLiked)
        setLikeCount(prev => prev + (prevLiked ? 1 : -1))
        return
      }
      if (res.ok) {
        setLiked(data.liked)
        setLikeCount(data.likeCount)
      } else {
        // Rollback states
        setLiked(prevLiked)
        setLikeCount(prev => prev + (prevLiked ? 1 : -1))
      }
    } catch {
      // Rollback states
      setLiked(prevLiked)
      setLikeCount(prev => prev + (prevLiked ? 1 : -1))
    }
  }

  return (
    <Link href={`/${rawTenant}/${c.slug}`} className={styles.pinterestCard}>
      <div className={styles.pinterestImgWrapper}>
        {c.coverImageUrl ? (
          <img src={c.coverImageUrl} alt={c.title} className={styles.pinterestImg} />
        ) : (
          <div className={styles.pinterestImg} style={{ backgroundColor: 'rgba(0,0,0,0.03)', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
            📷
          </div>
        )}
        
        {/* Floating Badges */}
        <div className={styles.pinterestFloatingBadgeLeft} title="Magic Prompt Creator">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>
        
        <button 
          onClick={handleLikeToggle}
          className={`${styles.pinterestFloatingBadgeRight} ${pop ? styles.heartPop : ''}`} 
          style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
          title={liked ? "Unlike" : "Like this prompt"}
        >
          <span 
            className="material-symbols-outlined text-[18px]" 
            style={{ 
              fontVariationSettings: liked ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400", 
              color: liked ? '#E63946' : 'var(--saas-text-primary)' 
            }}
          >
            favorite
          </span>
        </button>
      </div>

      <div className={styles.pinterestInfo}>
        <h3 className={styles.pinterestTitle}>{c.title}</h3>
        <p className={styles.pinterestPromptSnippet}>{c.promptText}</p>
        
        <div className={styles.pinterestMeta}>
          <div className={styles.pinterestStats}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0", color: liked ? '#E63946' : 'inherit' }}>favorite</span>
              <strong className="tnum">{likeCount}</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              <strong className="tnum">{c.viewCount}</strong>
            </span>
          </div>
          <span className={styles.pinterestHeroBadge}>HERO</span>
        </div>
      </div>
    </Link>
  )
}
