export const CATEGORIES = {
  photography: {
    id: 'photography',
    emoji: '📷',
    titleKey: 'category.photography' as const,
    sourceCategoryId: 'cat-photography'
  },
  product: {
    id: 'product',
    emoji: '🛍️',
    titleKey: 'category.product' as const,
    sourceCategoryId: 'cat-product'
  },
  people: {
    id: 'people',
    emoji: '🧍',
    titleKey: 'category.people' as const,
    sourceCategoryId: 'cat-character'
  }
} as const

export type CategoryId = keyof typeof CATEGORIES

export const CATEGORY_LIST = Object.values(CATEGORIES)

export function getCategory(id: string) {
  return CATEGORIES[id as CategoryId] || null
}

export const SITE_TITLE: Record<string, string> = {
  en: 'PromptShare — AI Image Prompt Gallery',
  zh: '提示词分享 — AI 图像生成提示词精选库'
}

export const SITE_DESCRIPTION: Record<string, string> = {
  en: 'A curated collection of AI image generation prompts, organized by category with Feishu-doc style presentation.',
  zh: '精选 AI 图像生成提示词库，按分类整理，飞书云文档风格呈现。'
}
