import type { ReactNode } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { db } from '@/lib/db'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login?redirect=/dashboard')

  const tenants = await db.tenant.findMany({ where: { ownerId: session.user.id }, orderBy: { createdAt: 'desc' } })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, padding: '1.5rem', borderRight: '1px solid var(--feishu-border)', background: 'var(--feishu-card-bg)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>📊 Dashboard</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/dashboard" style={navLinkStyle}>Overview</Link>
          {tenants.map(t => (
            <Link key={t.id} href={`/dashboard/cases?tenant=${t.id}`} style={navLinkStyle}>
              📝 {t.displayName}
            </Link>
          ))}
          <Link href="/dashboard/settings" style={navLinkStyle}>⚙️ Settings</Link>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <form action="/api/auth/sign-out" method="post">
            <button style={{ ...navLinkStyle, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              🚪 Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
    </div>
  )
}

const navLinkStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  textDecoration: 'none',
  color: 'var(--feishu-text-primary)',
  fontSize: '0.9rem',
  display: 'block',
}
