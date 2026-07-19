import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>
        ✨ PromptShare Cloud
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--feishu-text-secondary)', marginBottom: '3rem' }}>
        Turn your AI image prompts into a subscription business.
        Share your best prompts, earn from your audience.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/login"
          style={{
            padding: '0.75rem 2rem',
            background: 'var(--feishu-accent)',
            color: '#fff',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Start Creating →
        </Link>
        <Link
          href="/dashboard"
          style={{
            padding: '0.75rem 2rem',
            border: '1px solid var(--feishu-border)',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--feishu-text-primary)',
          }}
        >
          Creator Dashboard
        </Link>
      </div>

      <div style={{ marginTop: '4rem', display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { emoji: '📝', title: 'Online CMS', desc: 'No-code case editor' },
          { emoji: '💰', title: 'Stripe Paywall', desc: 'Monthly or one-time' },
          { emoji: '🔒', title: 'Content Protection', desc: 'Paywall guard for premium content' },
        ].map(f => (
          <div key={f.title} style={{ padding: '1.5rem', background: 'var(--feishu-card-bg)', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{f.emoji}</div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{f.title}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--feishu-text-secondary)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
