'use client'

import { useParams, useRouter } from 'next/navigation'
import styles from './category-grid.module.css'

interface CategoryData {
  id: string
  title: string
  description: string
  count: number
  emoji: string
  className: string
}

const CATEGORIES_ZH: CategoryData[] = [
  {
    id: 'photography',
    title: '摄影与写实',
    emoji: '📷',
    description: '包含人像摄影、风光街拍、胶片质感及氛围感大片提示词。',
    count: 309,
    className: styles.photography
  },
  {
    id: 'product',
    title: '产品与电商',
    emoji: '🛍️',
    description: '商品精修展示图、电商详情页背景、样机及UI设计提示词。',
    count: 140,
    className: styles.product
  },
  {
    id: 'people',
    title: '人物与角色',
    emoji: '🧍',
    description: '动漫二次元、古风汉服、赛博机甲及写实人物设定提示词。',
    count: 65,
    className: styles.people
  }
]

const CATEGORIES_EN: CategoryData[] = [
  {
    id: 'photography',
    title: 'Photography & Realism',
    emoji: '📷',
    description: 'Portraiture, landscapes, street photography, film textures, and atmospheric prompts.',
    count: 309,
    className: styles.photography
  },
  {
    id: 'product',
    title: 'Products & E-commerce',
    emoji: '🛍️',
    description: 'Commercial product renders, e-commerce backdrops, mockups, and UI design prompts.',
    count: 140,
    className: styles.product
  },
  {
    id: 'people',
    title: 'Characters & People',
    emoji: '🧍',
    description: 'Anime illustrations, traditional Chinese styles, cyber mechas, and character designs.',
    count: 65,
    className: styles.people
  }
]

export function CategoryGrid() {
  const params = useParams()
  const router = useRouter()
  const lang = params?.lang === 'en' ? 'en' : 'zh'
  const categories = lang === 'en' ? CATEGORIES_EN : CATEGORIES_ZH

  const handleNavigate = (id: string) => {
    router.push(`/${lang}/${id}`)
  }

  return (
    <div className={styles.grid}>
      {categories.map((cat) => (
        <div
          key={cat.id}
          className={`${styles.card} ${cat.className}`}
          onClick={() => handleNavigate(cat.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNavigate(cat.id)
          }}
        >
          <div className={styles.header}>
            <span className={styles.emoji}>{cat.emoji}</span>
            <span className={styles.countBadge}>
              {cat.count} {lang === 'en' ? 'cases' : '例'}
            </span>
          </div>
          <h3 className={styles.title}>{cat.title}</h3>
          <p className={styles.description}>{cat.description}</p>
          <div className={styles.footer}>
            <span>{lang === 'en' ? 'Explore Category' : '浏览分类'}</span>
            <svg className={styles.arrowIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
