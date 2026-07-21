'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useEffect, useRef } from 'react'
import styles from './tenant-layout.module.css'

export function SearchBar({ placeholder }: { placeholder: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false })
    })
  }

  // Keyboard shortcut listener to focus search on CMD+K / CTRL+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={styles.searchWrapper} onClick={() => inputRef.current?.focus()}>
      <svg style={{ width: '16px', height: '16px', marginRight: '8px', color: '#9ca3af' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input 
        ref={inputRef}
        type="text" 
        placeholder={placeholder} 
        className={styles.searchInput}
        defaultValue={searchParams.get('q') || ''}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {isPending ? (
        <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '4px' }}>...</span>
      ) : (
        <kbd className={styles.kbd}>⌘ K</kbd>
      )}
    </div>
  )
}
