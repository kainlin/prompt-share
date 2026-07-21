'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from '../dashboard.module.css'

interface Props {
  tenantId: string
  monthlyPrice: number | null // cents
  lifetimePrice: number | null // cents
  priceChangedAt: string | null
  userStripeAccountId: string | null
  userStripeConnected: boolean
}

export function PricingSettings({
  tenantId,
  monthlyPrice,
  lifetimePrice,
  priceChangedAt,
  userStripeAccountId,
  userStripeConnected,
}: Props) {
  const [connected, setConnected] = useState(userStripeConnected)
  const [verifying, setVerifying] = useState(true)

  const [monthlyDollars, setMonthlyDollars] = useState(
    monthlyPrice ? (monthlyPrice / 100).toFixed(2) : '',
  )
  const [lifetimeDollars, setLifetimeDollars] = useState(
    lifetimePrice ? (lifetimePrice / 100).toFixed(2) : '',
  )

  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Verify connection on mount
  useEffect(() => {
    if (!userStripeAccountId) {
      setVerifying(false)
      return
    }
    fetch('/api/stripe/verify-connection', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => setConnected(data.connected))
      .catch(() => {})
      .finally(() => setVerifying(false))
  }, [userStripeAccountId])

  // Price change guardrail
  const nextChangeDate = priceChangedAt
    ? new Date(new Date(priceChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null
  const canChangePrice = !nextChangeDate || nextChangeDate <= new Date()

  const cents = useCallback((dollars: string) => {
    const n = parseFloat(dollars)
    return isNaN(n) ? undefined : Math.round(n * 100)
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      } else if (data.error) {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect Stripe' })
    } finally {
      setConnecting(false)
    }
  }

  const handleDashboard = async () => {
    setDashboardLoading(true)
    try {
      const res = await fetch('/api/stripe/dashboard', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      } else if (data.error) {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to open dashboard' })
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleSavePricing = async () => {
    const monthly = cents(monthlyDollars)
    const lifetime = cents(lifetimeDollars)

    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/tenants/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, monthlyPrice: monthly, lifetimePrice: lifetime }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pricing saved!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save pricing' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.pricingPanel}>
      {/* Stripe Connect Status */}
      <div className={styles.connectBanner}>
        {verifying ? (
          <div className={styles.connectStatus}>
            <span>Checking Stripe connection…</span>
          </div>
        ) : connected ? (
          <div className={styles.connectStatus}>
            <span className={styles.greenBadge}>✅ Stripe Connected</span>
            <button
              onClick={handleDashboard}
              disabled={dashboardLoading}
              className={`${styles.btnSmall} ${styles.btnSmallOutline}`}
            >
              {dashboardLoading ? 'Loading…' : 'Manage Dashboard'}
            </button>
          </div>
        ) : (
          <div className={styles.connectStatus}>
            <span>Connect Stripe to receive payouts</span>
            <button onClick={handleConnect} disabled={connecting} className={styles.btnSmall}>
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        )}
      </div>

      {/* Pricing Section */}
      <div className={styles.pricingRow}>
        <div className={styles.pricingInputGroup}>
          <label className={styles.pricingLabel}>Monthly Price ($)</label>
          <input
            type="number"
            min="1.99"
            max="199.99"
            step="0.01"
            value={monthlyDollars}
            onChange={(e) => setMonthlyDollars(e.target.value)}
            placeholder={monthlyPrice ? (monthlyPrice / 100).toFixed(2) : 'e.g. 9.99'}
            disabled={!canChangePrice}
            className={styles.pricingInput}
          />
          {monthlyPrice && <div className={styles.currentPrice}>Current: ${(monthlyPrice / 100).toFixed(2)}/mo</div>}
        </div>
        <div className={styles.pricingInputGroup}>
          <label className={styles.pricingLabel}>Lifetime Price ($)</label>
          <input
            type="number"
            min="4.99"
            max="999.99"
            step="0.01"
            value={lifetimeDollars}
            onChange={(e) => setLifetimeDollars(e.target.value)}
            placeholder={lifetimePrice ? (lifetimePrice / 100).toFixed(2) : 'e.g. 49.99'}
            disabled={!canChangePrice}
            className={styles.pricingInput}
          />
          {lifetimePrice && <div className={styles.currentPrice}>Current: ${(lifetimePrice / 100).toFixed(2)} one-time</div>}
        </div>
        <button
          onClick={handleSavePricing}
          disabled={saving || !canChangePrice}
          className={styles.btnSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {!canChangePrice && nextChangeDate && (
        <p className={styles.hint}>
          Next price change available: {nextChangeDate.toISOString().split('T')[0]}
        </p>
      )}

      {message && (
        <p className={message.type === 'success' ? styles.successMsg : styles.errorMsg}>{message.text}</p>
      )}
    </div>
  )
}
