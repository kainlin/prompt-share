import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { headers } from 'next/headers'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  const tenants = await db.tenant.findMany({
    where: { ownerId: session!.user.id },
    include: { _count: { select: { cases: true, subscriptions: true } } },
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Your Prompt Stores</h1>

      {tenants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--feishu-card-bg)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--feishu-text-secondary)', marginBottom: '1rem' }}>
            You haven't created a prompt store yet.
          </p>
          <Link
            href="/dashboard/settings"
            style={{
              display: 'inline-block',
              padding: '0.75rem 2rem',
              background: 'var(--feishu-accent)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Create Your First Store
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {tenants.map(t => (
            <Link
              key={t.id}
              href={`/dashboard/cases?tenant=${t.id}`}
              style={{
                display: 'block',
                padding: '1.5rem',
                border: '1px solid var(--feishu-border)',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>@{t.slug}</h3>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--feishu-text-secondary)', fontSize: '0.85rem' }}>
                    {t._count.cases} cases · {t._count.subscriptions} subscribers
                  </p>
                </div>
                <span style={{ color: 'var(--feishu-text-secondary)' }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
