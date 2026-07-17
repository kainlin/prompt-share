import type en from './en'

export type Dictionary = typeof en
export type DictionaryKey = keyof Dictionary

export const locales = ['en', 'zh'] as const
export type Locale = (typeof locales)[number]
