'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import styles from './dashboard.module.css'

interface Tenant {
  id: string
  displayName: string
  slug: string
}

interface SidebarNavProps {
  tenants: Tenant[]
}

export function SidebarNav({ tenants }: SidebarNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTenantId = searchParams.get('tenant')

  const isOverviewActive = pathname === '/dashboard'
  const isSettingsActive = pathname === '/dashboard/settings'

  return (
    <nav className={styles.nav}>
      {/* Overview / Home Link */}
      <div className={styles.navItemWrapper}>
        <Link 
          href="/dashboard" 
          className={`${styles.navLink} ${isOverviewActive ? styles.activeLink : ''}`}
        >
          <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <span className={styles.tooltip}>系统概览 (Overview)</span>
      </div>

      {/* Tenant Stores Links */}
      {tenants.map(t => {
        const isActive = pathname === '/dashboard/cases' && currentTenantId === t.id
        return (
          <div key={t.id} className={styles.navItemWrapper}>
            <Link 
              href={`/dashboard/cases?tenant=${t.id}`} 
              className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>
            <span className={styles.tooltip}>{t.displayName} (Store)</span>
          </div>
        )
      })}

      {/* Settings Link */}
      <div className={styles.navItemWrapper}>
        <Link 
          href="/dashboard/settings" 
          className={`${styles.navLink} ${isSettingsActive ? styles.activeLink : ''}`}
        >
          <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
        <span className={styles.tooltip}>店铺设置 (Settings)</span>
      </div>
    </nav>
  )
}
