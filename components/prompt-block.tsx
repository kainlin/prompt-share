'use client'

import { useCallback } from 'react'
import { useToast } from './toast'
import styles from './prompt-block.module.css'

interface PromptBlockProps {
  children: string
  label?: string
  emoji?: string
}

export function PromptBlock({
  children,
  label = 'Prompt',
  emoji = '✍️'
}: PromptBlockProps) {
  const showToast = useToast()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(
      () => showToast('已复制到剪贴板！'),
      () => showToast('复制失败，请重试')
    )
  }, [children, showToast])

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>
          <span className={styles.emoji}>{emoji}</span>
          {label}
        </span>
        <button type="button" className={styles.copyBtn} onClick={handleCopy}>
          📋 Copy
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
