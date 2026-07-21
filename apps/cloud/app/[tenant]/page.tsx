import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { getDictionary } from '@prompt-share/i18n'
import Link from 'next/link'
import styles from './tenant-page.module.css'

interface Props {
  params: Promise<{ tenant: string }>
}

export default async function TenantPage({ params }: Props) {
  const { tenant: rawTenant } = await params
  const slug = decodeURIComponent(rawTenant).replace(/^@/, '')

  const tenant = await db.tenant.findUnique({
    where: { slug },
    include: { cases: { where: { published: true }, orderBy: { createdAt: 'desc' } } },
  })

  if (!tenant) notFound()

  // Read preferred locale
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const dict = await getDictionary(locale)

  // Mapped categories matching Notion/Nextra theme styling and i18n
  const categories = [
    { 
      id: 'photography', 
      emoji: '📷', 
      title: dict?.category?.photography || '摄影与写实', 
      count: tenant.cases.filter((c: any) => c.category === 'photography').length, 
      bg: 'var(--saas-sky)'
    },
    { 
      id: 'product', 
      emoji: '🛍️', 
      title: dict?.category?.product || '产品与电商', 
      count: tenant.cases.filter((c: any) => c.category === 'product').length, 
      bg: 'var(--saas-rose)'
    },
    { 
      id: 'people', 
      emoji: '🧍', 
      title: dict?.category?.people || '人物与角色', 
      count: tenant.cases.filter((c: any) => c.category === 'people').length, 
      bg: 'var(--saas-mint)'
    },
  ].filter((c: any) => c.count > 0)

  // Translations dictionary mapping
  const t = {
    home: locale === 'zh' ? '首页' : 'Home',
    subtitle: locale === 'zh' ? 'AI 图像生成提示词精选库' : 'Curated AI Image Prompt Gallery',
    usage: locale === 'zh' ? '使用方式' : 'How to Use',
    categoriesTitle: locale === 'zh' ? '分类目录 (Categories)' : 'Categories',
    casesSuffix: locale === 'zh' ? '例' : 'cases',
    steps: locale === 'zh' ? [
      '浏览侧边栏探索分类：展开左侧的分类导航，查看对应的提示词案例。',
      '一键复制任意提示词：在案例页面上点击复制按钮，直接获取高质量提示词。',
      '查看高分辨率生成效果图：支持图像、视频以及网页沙箱等多模态预览。',
      '搜索提示词：通过输入关键词即时过滤侧边栏的提示词。'
    ] : [
      'Explore categories in the sidebar: Expand the left navigation to view relevant prompt cases.',
      'Copy any prompt with one click: Click the copy button on any case page to get prompt details.',
      'View high-resolution outputs: Supports multi-modal previews including image galleries, videos, and web sandboxes.',
      'Search prompts: Enter keywords in the search bar to instantly filter cases in the sidebar.'
    ]
  }

  return (
    <div>
      {/* Home Header mimicking Nextra Docs Home Page */}
      <div className={styles.homeHeader}>
        <div className={styles.homeCategory}>{t.home}</div>
        <h1 className={styles.homeTitle}>✨ {tenant.displayName}</h1>
        
        <h2 className={styles.homeSubTitle}>{t.subtitle}</h2>
        <p className={styles.homeDescription}>
          {tenant.bio || (locale === 'zh' 
            ? `欢迎来到 ${tenant.displayName} —— 一个精选的 AI 图像生成提示词集合。在这里你可以浏览并复制高质量的 Midjourney、DALL-E 以及 Stable Diffusion 提示词。`
            : `Welcome to ${tenant.displayName} — a curated gallery of AI generation prompts. Discover, copy, and monetize high-quality prompts.`)}
        </p>
      </div>

      {/* Usage steps */}
      <div>
        <h3 className={styles.sectionTitle}>{t.usage}</h3>
        <ol className={styles.orderedList}>
          {t.steps.map((stepText, idx) => (
            <li key={idx} className={styles.orderedListItem}>
              {stepText}
            </li>
          ))}
        </ol>
      </div>

      {/* Category Grid Section */}
      <div>
        <h3 className={styles.sectionTitle}>{t.categoriesTitle}</h3>
        <div className={styles.categoryGrid}>
          {categories.map(c => (
            <Link
              key={c.id}
              href={`/${rawTenant}?cat=${c.id}`}
              className={styles.categoryCard}
              style={{ backgroundColor: c.bg }}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardEmoji}>{c.emoji}</span>
                <span className={styles.cardBadge}>
                  <span className="tnum" style={{ fontWeight: 700 }}>{c.count}</span> {t.casesSuffix}
                </span>
              </div>
              <h4 className={styles.cardTitle}>{c.title}</h4>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
