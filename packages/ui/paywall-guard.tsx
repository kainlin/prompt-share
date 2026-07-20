'use client'

import React, { useState, useEffect } from 'react'
import styles from './paywall-guard.module.css'
import { useToast } from './toast'

/** USD → CNY exchange rate (updated periodically) */
const USD_TO_CNY_RATE = 7.25

interface PaywallGuardProps {
  children: React.ReactNode
  price?: number
  isPremium?: boolean
  promptText?: string
  /** Unique identifier for this case — prevents shared unlock state across cases */
  caseIdentifier?: string
}

function getSimpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash).toString(36)
}

export function PaywallGuard({
  children,
  price = 1.99,
  isPremium = false,
  promptText = '',
  caseIdentifier = '',
}: PaywallGuardProps) {
  const showToast = useToast()

  // Use both caseIdentifier and promptText for the storage key to avoid
  // collisions — fallback chain ensures uniqueness even when fields are empty
  const storageKey = `prompt_share_unlocked_${getSimpleHash(caseIdentifier || promptText || 'default')}`

  // Lazy initializer reads localStorage synchronously to prevent Flash of Paywall
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (!isPremium) return false
    if (typeof window === 'undefined') return true
    try {
      return localStorage.getItem(storageKey) !== 'true'
    } catch {
      return true
    }
  })

  const [showPayModal, setShowPayModal] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [qrError, setQrError] = useState(false)

  // Re-sync when isPremium or storageKey changes (e.g. client-side navigation)
  useEffect(() => {
    if (isPremium) {
      try {
        const isUnlocked = localStorage.getItem(storageKey) === 'true'
        setIsLocked(!isUnlocked)
      } catch {
        setIsLocked(true)
      }
    } else {
      setIsLocked(false)
    }
  }, [isPremium, storageKey])

  const handleUnlockMock = () => {
    const payText = `https://prompt-share.vercel.app/pay?price=${price}`
    setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(payText)}`)
    setQrError(false)
    setShowPayModal(true)
  }

  const closePayModal = () => {
    setShowPayModal(false)
    setQrCode('')
    setQrError(false)
  }

  const confirmPayment = () => {
    try {
      localStorage.setItem(storageKey, 'true')
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
    setIsLocked(false)
    setShowPayModal(false)
    setQrCode('')
    setQrError(false)
    showToast('🎉 解锁成功！感谢支持！')
  }

  if (!isLocked) {
    return <>{children}</>
  }

  const formatCNY = (usd: number) => `¥${(usd * USD_TO_CNY_RATE).toFixed(2)}`

  return (
    <div className={styles.container}>
      {/* Blurred prompt panel */}
      <div className={styles.blurred}>
        {children}
      </div>

      {/* Interactive Paywall overlay */}
      <div className={styles.overlay}>
        <div className={styles.card}>
          <div className={styles.lockBadge}>
            <svg className={styles.lockIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className={styles.title}>解锁高级提示词配方</h3>
          <p className={styles.desc}>本提示词为高级创作，解锁后获取完整提示词及定制编辑器参数配置。</p>
          <div className={styles.btnGroup}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleUnlockMock}
            >
              立即购买 {formatCNY(price)}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => showToast('☕ 订阅会员服务即将上线！')}
            >
              VIP 会员免费看
            </button>
          </div>
        </div>
      </div>

      {/* Mock Payment Dialog */}
      {showPayModal && (
        <div className={styles.modalOverlay} onClick={closePayModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closePayModal}
            >
              ✕
            </button>
            <h4 className={styles.modalTitle}>扫码模拟支付</h4>
            <p className={styles.modalPrice}>{formatCNY(price)}</p>
            {qrCode && !qrError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCode}
                alt="QR Code"
                className={styles.qr}
                onError={() => setQrError(true)}
              />
            )}
            {qrError && (
              <div className={styles.qrFallback}>
                <p>二维码加载失败</p>
                <p className={styles.qrFallbackHint}>
                  请直接点击下方按钮完成支付
                </p>
              </div>
            )}
            <p className={styles.modalTip}>这是模拟支付通道，点击下方按钮可以直接确认支付成功。</p>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={confirmPayment}
            >
              模拟确认支付成功
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
