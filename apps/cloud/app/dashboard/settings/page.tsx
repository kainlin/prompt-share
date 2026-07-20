import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { headers } from 'next/headers'

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  const tenants = await db.tenant.findMany({ where: { ownerId: session!.user.id } })

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Settings</h1>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--feishu-border)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem' }}>Your Prompt Stores</h2>
        {tenants.map(t => (
          <div key={t.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--feishu-border)' }}>
            <div style={{ fontWeight: 600 }}>@{t.slug}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--feishu-text-secondary)' }}>{t.displayName}</div>
            <div style={{ marginTop: '0.25rem' }}>
              <a href={`/@${t.slug}`} target="_blank" style={{ fontSize: '0.85rem', color: 'var(--feishu-accent)' }}>
                View public page →
              </a>
            </div>
          </div>
        ))}

        <form
          action="/api/tenants"
          method="post"
          style={{ marginTop: '1rem' }}
        >
          <input type="text" name="slug" placeholder="your-store-slug" required style={inputStyle} />
          <input type="text" name="displayName" placeholder="Display Name" required style={inputStyle} />
          <button type="submit" style={btnStyle}>Create Store</button>
        </form>
      </section>

      <section style={{ padding: '1.5rem', border: '1px solid var(--feishu-border)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem' }}>Stripe Configuration</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--feishu-text-secondary)', marginBottom: '1rem' }}>
          Set up your Stripe product prices in the Stripe Dashboard, then add the Price IDs to your environment.
        </p>
        <div style={codeStyle}>
          STRIPE_PRICE_MONTHLY=price_xxxxx<br />
          STRIPE_PRICE_LIFETIME=price_xxxxx
        </div>
      </section>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem',
  marginTop: '0.5rem',
  border: '1px solid var(--feishu-border)',
  borderRadius: '6px',
  fontSize: '0.9rem',
  boxSizing: 'border-box' as const,
}

const btnStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.6rem 1.5rem',
  background: 'var(--feishu-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
}

const codeStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: 'var(--feishu-card-bg)',
  borderRadius: '6px',
  fontFamily: 'monospace',
  fontSize: '0.8rem',
}
