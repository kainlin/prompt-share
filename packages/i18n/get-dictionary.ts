import type { Dictionary, Locale } from './i18n-config'

const dictionaries: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import('./en'),
  zh: () => import('./zh')
}

export async function getDictionary(locale: string): Promise<Dictionary> {
  const validLocale = (locale === 'en' || locale === 'zh' ? locale : 'zh') as Locale
  const { default: dictionary } = await dictionaries[validLocale]()
  return dictionary
}

export function getDirection(_locale: string): 'ltr' | 'rtl' {
  return 'ltr'
}
