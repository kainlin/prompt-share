import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { getDictionary } from '@prompt-share/i18n'
import { TenantSidebar } from './tenant-sidebar'
import { SearchBar } from './search-bar'
import styles from './tenant-layout.module.css'

interface Props {
  children: ReactNode
  params: Promise<{ tenant: string }>
}

export default async function TenantStoreLayout({ children, params }: Props) {
  const { tenant: rawTenant } = await params
  const slug = decodeURIComponent(rawTenant).replace(/^@/, '')

  const tenant = await db.tenant.findUnique({
    where: { slug },
    include: { cases: { where: { published: true }, orderBy: { createdAt: 'desc' } } },
  })

  if (!tenant) notFound()

  // Resolve preferred locale from cookie
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const dict = await getDictionary(locale)

  const brandSuffix = locale === 'zh' ? '提示词分享' : 'Prompts'
  const tocTitle = locale === 'zh' ? '本页目录 (On This Page)' : 'On This Page'
  const tocDetail = locale === 'zh' ? '提示词详情' : 'Prompt Details'
  const tocPreview = locale === 'zh' ? '生成效果与配置' : 'Outputs & Preview'

  return (
    <div className={styles.container}>
      {/* Top Navbar matching Nextra docs theme header */}
      <header className={styles.navbar}>
        <Link href={`/${rawTenant}`} className={styles.brand}>
          ✨ {tenant.displayName} {brandSuffix}
        </Link>

        {/* Dynamic Search Bar exactly matching Nextra */}
        <SearchBar placeholder={dict.search || '搜索提示词...'} />

        <a
          href={`/login?redirect=${encodeURIComponent(`/${rawTenant}`)}`}
          style={{
            fontSize: '0.8rem',
            color: 'var(--feishu-text-secondary)',
            textDecoration: 'none',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {locale === 'en' ? 'Sign in' : '登录'} →
        </a>
      </header>

      {/* Main Layout containing Left Sidebar and Workspace */}
      <div className={styles.body}>
        <TenantSidebar 
          rawTenant={rawTenant} 
          cases={tenant.cases} 
          dict={dict} 
          currentLocale={locale} 
        />
        
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
