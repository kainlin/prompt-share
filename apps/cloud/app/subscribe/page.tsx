import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getDictionary } from '@prompt-share/i18n'
import { StripePlans } from './stripe-plans'
import styles from './subscribe.module.css'

interface Props {
  searchParams: Promise<{ tenant?: string }>
}

export default async function SubscribePage({ searchParams }: Props) {
  const { tenant: tenantId } = await searchParams
  if (!tenantId) redirect('/')

  // Authenticate user
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect(`/login?redirect=/subscribe?tenant=${tenantId}`)
  }

  // Fetch tenant info
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) redirect('/')

  // Check if already subscribed
  const existingSub = await db.subscription.findFirst({
    where: { userId: session?.user.id, tenantId, status: 'active' }
  })
  
  if (existingSub) {
    redirect(`/@${tenant.slug}?subscribed=true`)
  }

  // Retrieve locale and translation dictionaries
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const dict = await getDictionary(locale)

  return (
    <main className={styles.container}>
      {/* Header Section */}
      <div className={styles.pageHeader}>
        <span className={styles.badge}>
          {locale === 'zh' ? '订阅计划 Pricing' : 'Pricing Plans'}
        </span>
        
        {tenant.avatarUrl && (
          <img 
            src={tenant.avatarUrl} 
            alt={tenant.displayName} 
            style={{ 
              width: 88, 
              height: 88, 
              borderRadius: '50%', 
              margin: '0 auto 20px', 
              display: 'block', 
              objectFit: 'cover',
              border: '3px solid #ffffff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
            }} 
          />
        )}
        
        <h1 className={styles.title}>
          {locale === 'zh' ? `订阅 ${tenant.displayName}` : `Subscribe to ${tenant.displayName}`}
        </h1>
        <p className={styles.description}>
          {locale === 'zh' 
            ? '解锁全部商业提示词模板、交互式 Sandbox 预览、无水印高分辨率图像，以及全套参数化变量调试器。' 
            : 'Unlock the full potential of professional prompt engineering. Unlocks all premium prompt templates, parameter configurations, and high-resolution image views.'}
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <StripePlans 
        tenantId={tenant.id} 
        monthlyPrice={tenant.monthlyPrice} 
        lifetimePrice={tenant.lifetimePrice} 
        locale={locale}
      />
    </main>
  )
}
