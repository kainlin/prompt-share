'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LanguageSwitcher } from './language-switcher'
import styles from './tenant-layout.module.css'

interface Case {
  id: string
  slug: string
  title: string
  emoji: string
  category: string
}

interface TenantSidebarProps {
  rawTenant: string
  cases: Case[]
  dict: any // i18n Dictionary object
  currentLocale: string
}

const CATEGORIES = [
  { id: 'photography', emoji: '📷', title: '摄影与写实' },
  { id: 'product', emoji: '🛍️', title: '产品与电商' },
  { id: 'people', emoji: '🧍', title: '人物与角色' }
]

export function TenantSidebar({ rawTenant, cases, dict, currentLocale }: TenantSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const decodedPathname = decodeURIComponent(pathname)
  const decodedRawTenant = decodeURIComponent(rawTenant)

  const isHomeActive = decodedPathname === `/${decodedRawTenant}` || decodedPathname === `/${decodedRawTenant}/`

  // Client-side search filtering
  const q = searchParams.get('q')?.toLowerCase() || ''
  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(q) || 
    c.slug.toLowerCase().includes(q)
  )

  const homeLabel = currentLocale === 'zh' ? '✨ 首页' : '✨ Home'

  return (
    <aside className={styles.sidebar}>
      {/* Nav list - scrollable internally */}
      <nav className={styles.sidebarNav}>
        {/* Home Link */}
        <Link 
          href={`/${rawTenant}`} 
          className={`${styles.sidebarLink} ${isHomeActive ? styles.activeSidebarLink : ''}`}
        >
          {homeLabel}
        </Link>

        {/* Dynamic Category List & Client-Filtered Cases */}
        {CATEGORIES.map(cat => {
          const categoryCasesFiltered = filteredCases.filter(c => c.category === cat.id)
          if (categoryCasesFiltered.length === 0) return null

          const translatedTitle = dict?.category?.[cat.id] || cat.title

          return (
            <div key={cat.id} className={styles.categoryGroup}>
              <div className={styles.categoryTitle}>
                <span>{translatedTitle}</span>
              </div>
              <div className={styles.caseList}>
                {categoryCasesFiltered.map(c => {
                  const caseUrl = `/${rawTenant}/${c.slug}`
                  const decodedCaseUrl = decodeURIComponent(caseUrl)
                  const isActive = decodedPathname === decodedCaseUrl

                  return (
                    <Link
                      key={c.id}
                      href={caseUrl}
                      className={`${styles.caseLink} ${isActive ? styles.activeCaseLink : ''}`}
                      title={c.title}
                    >
                      {c.emoji} {c.title}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Fixed Sidebar Footer carrying Language Selector & Nextra Theme Toggle Control Buttons */}
      <div className={styles.sidebarFooter}>
        <LanguageSwitcher currentLocale={currentLocale} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Theme Switcher Button */}
          <button className={styles.iconBtn} title="Toggle Theme (Bright/Dark)">
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>
          
          {/* Collapse Sidebar Button */}
          <button className={styles.iconBtn} title="Collapse Sidebar">
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18M14 9l-3 3 3 3" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
