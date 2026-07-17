interface CaseHeaderProps {
  emoji?: string
  title: string
  tags?: string | string[]
  source?: {
    platform?: string
    author?: string
  }
  date?: string
}

function parseList(input?: string | string[]): string[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  return input.split(',').map(s => s.trim()).filter(Boolean)
}

export function CaseHeader({ emoji, title, tags, source, date }: CaseHeaderProps) {
  const tagList = parseList(tags)

  return (
    <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--feishu-border)' }}>
      {emoji && (
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{emoji}</div>
      )}
      <h1 style={{
        fontSize: '1.875rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--feishu-text-primary)',
        margin: '0 0 0.75rem',
        lineHeight: 1.3
      }}>
        {title}
      </h1>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        fontSize: '0.8125rem',
        color: 'var(--feishu-text-secondary)'
      }}>
        {tagList.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {tagList.map(tag => (
              <span key={tag} style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: 'var(--feishu-card-bg)',
                border: '1px solid var(--feishu-border)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: 'var(--feishu-text-secondary)'
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {source?.platform && (
          <span>
            📍 {source.platform}{source.author ? ` @${source.author}` : ''}
          </span>
        )}
        {date && <span>{date}</span>}
      </div>
    </div>
  )
}
