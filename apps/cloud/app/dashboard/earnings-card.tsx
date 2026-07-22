"use client"

import { useEffect, useState } from 'react'
import styles from './dashboard.module.css'

interface EarningsData {
  pendingAmount: number
  availableAmount: number
  canWithdraw: boolean
  minWithdrawal: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function EarningsCard() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/earnings/balance')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((json) => setData(json))
      .catch(() => setError(true))
  }, [])

  // Show nothing while loading or on error (avoid layout flash)
  if (!data && !error) return null
  if (error) return null

  return (
    <div className={styles.earningsCard}>
      <h2 className={styles.sectionTitle}>💰 收益概览</h2>
      <div className={styles.earningsRow}>
        <span>可提现余额</span>
        <span className="tnum">{formatCents(data!.availableAmount)}</span>
      </div>
      <div className={styles.earningsRow}>
        <span>待入账余额</span>
        <span className="tnum">{formatCents(data!.pendingAmount)}</span>
      </div>
    </div>
  )
}
