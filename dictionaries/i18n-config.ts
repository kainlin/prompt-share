import type en from './en'

type DeepStringify<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string
}

export type Dictionary = DeepStringify<typeof en>
export type DictionaryKey = keyof Dictionary

export const locales = ['en', 'zh'] as const
export type Locale = (typeof locales)[number]
