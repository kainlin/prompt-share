'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../dashboard.module.css'

interface Case {
  id: string
  title: string
  slug: string
  category: string
  emoji: string
  coverImageUrl: string
  images: string[]
  promptText: string
  published: boolean
  paywallMode: string
  createdAt: string
  updatedAt: string
}

interface Props {
  cases: Case[]
  selectedTenantSlug: string
  view: 'grid' | 'list'
}

const categoryBadges: Record<string, { bg: string; text: string; label: string }> = {
  photography: { bg: 'var(--saas-sky)', text: '#0277BD', label: 'Photography' },
  product: { bg: 'var(--saas-apricot)', text: '#E65100', label: 'Product' },
  people: { bg: 'var(--saas-rose)', text: '#C2185B', label: 'Character' },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function CasesList({ cases, selectedTenantSlug, view }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const allSelected = cases.length > 0 && selected.size === cases.length

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(cases.map(c => c.id)))
  }, [allSelected, cases])

  const batchAction = useCallback(async (action: 'delete' | 'publish' | 'unpublish', paywallMode?: string) => {
    if (selected.size === 0) return

    let confirmMsg: string
    if (action === 'delete') {
      confirmMsg = `确定要删除 ${selected.size} 个案例吗？此操作不可恢复。`
    } else if (action === 'publish') {
      confirmMsg = `确定要将 ${selected.size} 个案例设为发布？`
    } else if (action === 'unpublish') {
      confirmMsg = `确定要将 ${selected.size} 个案例取消发布？`
    } else {
      confirmMsg = `确定要将 ${selected.size} 个案例的收费模式改为 ${paywallMode}？`
    }

    if (!confirm(confirmMsg)) return

    setBusy(true)
    try {
      const res = await fetch('/api/cases/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          action: action === 'delete' ? 'delete' : action === 'publish' ? 'publish' : action === 'unpublish' ? 'unpublish' : 'paywall',
          ...(paywallMode ? { paywallMode } : {}),
        }),
      })
      if (res.ok) {
        setSelected(new Set())
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || '操作失败')
      }
    } catch {
      alert('网络错误，请重试')
    } finally {
      setBusy(false)
    }
  }, [selected, router])

  // Paywall mode dropdown action
  const [showPaywallMenu, setShowPaywallMenu] = useState(false)

  const handlePaywallChange = useCallback(async (paywallMode: string) => {
    setShowPaywallMenu(false)
    if (selected.size === 0) return

    const modes: Record<string, string> = {
      free: '免费公开',
      prompt_only: '图片可见/提示词付费',
      full_lock: '全部锁定',
    }
    if (!confirm(`将 ${selected.size} 个案例的收费模式改为「${modes[paywallMode] || paywallMode}」？`)) return

    setBusy(true)
    try {
      const res = await fetch('/api/cases/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action: 'paywall', paywallMode }),
      })
      if (res.ok) { setSelected(new Set()); router.refresh() }
      else { const data = await res.json(); alert(data.error || '操作失败') }
    } catch { alert('网络错误') }
    finally { setBusy(false) }
  }, [selected, router])

  const actionBar = selected.size > 0 ? (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 20px', marginBottom: '24px',
      background: 'var(--saas-accent)', color: '#fff',
      borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
    }}>
      <span>已选 <strong className="tnum" style={{ fontSize: '1rem' }}>{selected.size}</strong> 项</span>
      <div style={{ flex: 1 }} />

      <button onClick={() => batchAction('publish')} disabled={busy}
        style={actionBtnStyle}>
        发布
      </button>
      <button onClick={() => batchAction('unpublish')} disabled={busy}
        style={actionBtnStyle}>
        取消发布
      </button>

      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowPaywallMenu(!showPaywallMenu)} disabled={busy}
          style={actionBtnStyle}>
          收费模式 ▾
        </button>
        {showPaywallMenu && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 10,
            marginTop: '4px', background: '#fff', borderRadius: '6px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden',
            minWidth: '180px',
          }}>
            {[
              { value: 'free', label: '🆓 免费公开' },
              { value: 'prompt_only', label: '👁️ 图片可见/提示词付费' },
              { value: 'full_lock', label: '🔒 全部锁定' },
            ].map(opt => (
              <button key={opt.value}
                onClick={() => handlePaywallChange(opt.value)}
                style={{
                  display: 'block', width: '100%', padding: '8px 14px',
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', textAlign: 'left',
                  color: 'var(--saas-text-primary)',
                  borderBottom: '1px solid var(--saas-border)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => batchAction('delete')} disabled={busy}
        style={{ ...actionBtnStyle, background: 'rgba(255,255,255,0.25)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
        删除
      </button>

      <button onClick={() => setSelected(new Set())}
        style={{ ...actionBtnStyle, background: 'rgba(255,255,255,0.15)', borderColor: 'transparent' }}>
        ✕
      </button>
    </div>
  ) : null

  // ── Select-all checkbox ──
  const selectAllCheckbox = cases.length > 0 ? (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      fontSize: '0.8rem', fontWeight: 600, color: 'var(--saas-text-secondary)',
      cursor: 'pointer', marginBottom: '16px', userSelect: 'none',
    }}>
      <input type="checkbox" checked={allSelected} onChange={toggleAll}
        style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
      全选 {cases.length} 个案例
    </label>
  ) : null

  // ── Case Checkbox ──
  const caseCheckbox = (id: string) => (
    <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)}
      onClick={(e) => e.stopPropagation()}
      style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
    />
  )

  return (
    <div>
      {actionBar}

      {view === 'grid' ? (
        /* ── GRID VIEW ── */
        <div>
          {selectAllCheckbox}
          <div className={styles.casesGrid}>
            {cases.map(c => {
              const badge = categoryBadges[c.category] || { bg: '#e5e7eb', text: '#374151', label: c.category }

              return (
                <div key={c.id} className={styles.caseGridCard} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 3 }}>
                    {caseCheckbox(c.id)}
                  </div>
                  <div className={styles.cardCoverWrapper}>
                    {c.coverImageUrl ? (
                      <img src={c.coverImageUrl} alt="" className={styles.cardCoverImg} />
                    ) : (
                      <div className={styles.cardCoverImg} style={{ backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                        📷
                      </div>
                    )}
                    <div className={styles.cardBadgeLeft}>
                      <span
                        className={styles.badge}
                        style={{ backgroundColor: badge.bg, color: badge.text, fontSize: '10px', textTransform: 'uppercase' }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className={styles.cardBadgeRight}>
                      <span className={styles.badge} style={{ backgroundColor: c.published ? 'var(--saas-mint)' : 'rgba(0,0,0,0.05)', color: c.published ? '#2E7D32' : 'var(--saas-text-secondary)', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c.published ? '#2E7D32' : 'var(--saas-text-secondary)' }}></span>
                        {c.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--saas-text-primary)', marginBottom: '8px' }}>
                      {c.title}
                    </h3>
                    <code className={styles.promptCode}>
                      /imagine prompt: {c.promptText}
                    </code>
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="tnum" style={{ fontSize: '12px', color: 'var(--saas-text-secondary)', fontWeight: 500 }}>
                        {formatDate(c.createdAt)}
                      </span>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <Link href={`/dashboard/cases/${c.id}/edit`} style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--saas-accent)' }}>
                          Edit
                        </Link>
                        <Link
                          href={`/@${selectedTenantSlug}/${c.slug}`}
                          target="_blank"
                          style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--saas-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          Live
                          <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className={styles.section} style={{ padding: 0, overflow: 'hidden' }}>
          {selectAllCheckbox}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <th className={styles.th} style={{ width: '36px' }}></th>
                  <th className={styles.th}>Case / Title</th>
                  <th className={styles.th}>Category</th>
                  <th className={styles.th}>Paywall</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Created</th>
                  <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => {
                  const badge = categoryBadges[c.category] || { bg: '#e5e7eb', text: '#374151', label: c.category }
                  const paywallLabels: Record<string, string> = { free: '免费', prompt_only: '半锁', full_lock: '全锁' }

                  return (
                    <tr key={c.id} className={styles.rowHover}>
                      <td className={styles.td}>{caseCheckbox(c.id)}</td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c.coverImageUrl ? (
                              <img src={c.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1.25rem' }}>📷</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--saas-text-primary)' }}>{c.title}</span>
                            <span className="tnum" style={{ fontSize: '11px', color: 'var(--saas-text-secondary)', fontWeight: 500 }}>{c.slug.toUpperCase()}</span>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.badge} style={{ backgroundColor: badge.bg, color: badge.text, fontWeight: 700 }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--saas-text-secondary)' }}>
                          {paywallLabels[c.paywallMode] || '免费'}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.badge} style={{ backgroundColor: c.published ? 'var(--saas-mint)' : 'rgba(0,0,0,0.05)', color: c.published ? '#2E7D32' : 'var(--saas-text-secondary)', fontWeight: 700 }}>
                          {c.published ? '🟢 Published' : '⚫ Draft'}
                        </span>
                      </td>
                      <td className={`${styles.td} tnum`} style={{ fontSize: '14px', color: 'var(--saas-text-secondary)', fontWeight: 500 }}>
                        {formatDate(c.createdAt)}
                      </td>
                      <td className={styles.td} style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', fontSize: '13px', fontWeight: 'bold' }}>
                          <Link href={`/dashboard/cases/${c.id}/edit`} style={{ color: 'var(--saas-accent)' }}>
                            Edit
                          </Link>
                          <Link
                            href={`/@${selectedTenantSlug}/${c.slug}`}
                            target="_blank"
                            style={{ color: 'var(--saas-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          >
                            View Live
                            <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  padding: '5px 12px',
  border: '1px solid rgba(255,255,255,0.5)',
  borderRadius: '6px',
  background: 'rgba(255,255,255,0.2)',
  color: '#fff',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
}
