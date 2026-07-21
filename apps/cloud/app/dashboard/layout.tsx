import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { SignOutButton } from './sign-out-button'
import { SidebarNav } from './sidebar-nav'
import styles from './dashboard.module.css'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login?redirect=/dashboard')

  const tenants = await db.tenant.findMany({ 
    where: { ownerId: session.user.id }, 
    orderBy: { createdAt: 'desc' } 
  })

  // Mock avatar image for aesthetic completeness matching Image 1
  const avatarUrl = session.user.image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"

  return (
    <div className={styles.container}>
      {/* Sidebar - Narrow Rounded Design (Image 1 style) */}
      <aside className={styles.sidebar}>
        {/* Brand Logo */}
        <div className={styles.logo} title="PromptShare Cloud">
          ⚡
        </div>

        {/* Dynamic Sidebar Links with Tooltips */}
        <SidebarNav tenants={tenants} />

        {/* User Actions at the Bottom */}
        <div className={styles.sidebarFooter}>
          <div className={styles.navItemWrapper}>
            <SignOutButton className={styles.signOutBtn} />
            <span className={styles.tooltip}>退出登录 (Sign Out)</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={avatarUrl} 
            alt="User Avatar" 
            className={styles.avatar} 
          />
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
