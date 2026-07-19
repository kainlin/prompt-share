import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function CasesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { tenant: tenantId } = await searchParams

  const tenants = await db.tenant.findMany({ where: { ownerId: user!.id } })
  const selectedTenant = tenantId || tenants[0]?.id

  const cases = selectedTenant
    ? await db.promptCase.findMany({
        where: { tenantId: selectedTenant },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Cases</h1>
        {selectedTenant && (
          <Link
            href={`/dashboard/cases/new?tenant=${selectedTenant}`}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--feishu-accent)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            + New Case
          </Link>
        )}
      </div>

      {/* Tenant selector */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        {tenants.map(t => (
          <Link
            key={t.id}
            href={`?tenant=${t.id}`}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              background: selectedTenant === t.id ? 'var(--feishu-accent)' : 'var(--feishu-card-bg)',
              color: selectedTenant === t.id ? '#fff' : 'var(--feishu-text-primary)',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            {t.displayName}
          </Link>
        ))}
      </div>

      {cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--feishu-card-bg)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--feishu-text-secondary)' }}>No cases yet. Create your first prompt case!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {cases.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                border: '1px solid var(--feishu-border)',
                borderRadius: '8px',
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{c.emoji} {c.title}</span>
                <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--feishu-text-secondary)' }}>
                  {c.published ? '🟢' : '⚫'} {c.category}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  href={`/dashboard/cases/${c.id}/edit`}
                  style={{ fontSize: '0.85rem', color: 'var(--feishu-accent)', textDecoration: 'none' }}
                >
                  Edit
                </Link>
                <Link
                  href={`/@${tenants.find(t => t.id === selectedTenant)?.slug}/${c.slug}`}
                  target="_blank"
                  style={{ fontSize: '0.85rem', color: 'var(--feishu-text-secondary)', textDecoration: 'none' }}
                >
                  View ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
