import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'

interface Props {
  params: Promise<{ tenant: string }>
}

export default async function TenantPage({ params }: Props) {
  const { tenant: rawTenant } = await params
  const slug = rawTenant.startsWith('@') ? rawTenant.slice(1) : rawTenant

  const tenant = await db.tenant.findUnique({
    where: { slug },
    include: { cases: { where: { published: true }, orderBy: { createdAt: 'desc' } } },
  })

  if (!tenant) notFound()

  const categories = [
    { id: 'photography', emoji: '📷', title: 'Photography & Realism', count: tenant.cases.filter(c => c.category === 'photography').length },
    { id: 'product', emoji: '🛍️', title: 'Products & E-commerce', count: tenant.cases.filter(c => c.category === 'product').length },
    { id: 'people', emoji: '🧍', title: 'Characters & People', count: tenant.cases.filter(c => c.category === 'people').length },
  ].filter(c => c.count > 0)

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        {tenant.avatarUrl && (
          <img src={tenant.avatarUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: '1rem' }} />
        )}
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{tenant.displayName}</h1>
        {tenant.bio && <p style={{ color: 'var(--feishu-text-secondary)', marginTop: '0.5rem' }}>{tenant.bio}</p>}
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {categories.map(c => (
          <Link
            key={c.id}
            href={`/${rawTenant}?cat=${c.id}`}
            style={{
              padding: '1.5rem',
              background: 'var(--feishu-card-bg)',
              borderRadius: '12px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2rem' }}>{c.emoji}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--feishu-text-secondary)', background: 'var(--feishu-bg)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                {c.count} cases
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{c.title}</h3>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Cases</h2>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginTop: '1rem' }}>
          {tenant.cases.slice(0, 12).map(c => (
            <Link
              key={c.id}
              href={`/${rawTenant}/${c.slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid var(--feishu-border)',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
              }}
            >
              <img src={c.coverImageUrl} alt={c.title} style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover' }} />
              <div style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontWeight: 600 }}>{c.emoji} {c.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
