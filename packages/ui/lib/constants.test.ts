import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_LIST,
  getCategory,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from './constants'

describe('CATEGORIES', () => {
  it('has photography, product, people keys', () => {
    expect(CATEGORIES).toHaveProperty('photography')
    expect(CATEGORIES).toHaveProperty('product')
    expect(CATEGORIES).toHaveProperty('people')
  })

  it('each category has id, emoji, titleKey, sourceCategoryId', () => {
    for (const cat of Object.values(CATEGORIES)) {
      expect(cat).toHaveProperty('id')
      expect(cat).toHaveProperty('emoji')
      expect(cat).toHaveProperty('titleKey')
      expect(cat).toHaveProperty('sourceCategoryId')
      expect(typeof cat.id).toBe('string')
      expect(typeof cat.emoji).toBe('string')
      expect(typeof cat.titleKey).toBe('string')
      expect(typeof cat.sourceCategoryId).toBe('string')
    }
  })
})

describe('CATEGORY_LIST', () => {
  it('is an array of 3 items', () => {
    expect(Array.isArray(CATEGORY_LIST)).toBe(true)
    expect(CATEGORY_LIST).toHaveLength(3)
  })
})

describe('getCategory', () => {
  it("returns photography object for 'photography'", () => {
    const cat = getCategory('photography')
    expect(cat).not.toBeNull()
    expect(cat!.id).toBe('photography')
  })

  it("returns product object for 'product'", () => {
    const cat = getCategory('product')
    expect(cat).not.toBeNull()
    expect(cat!.id).toBe('product')
  })

  it("returns people object for 'people'", () => {
    const cat = getCategory('people')
    expect(cat).not.toBeNull()
    expect(cat!.id).toBe('people')
  })

  it("returns null for 'invalid'", () => {
    expect(getCategory('invalid')).toBeNull()
  })

  it("returns null for ''", () => {
    expect(getCategory('')).toBeNull()
  })
})

describe('SITE_TITLE', () => {
  it('has en and zh keys with non-empty values', () => {
    expect(SITE_TITLE).toHaveProperty('en')
    expect(SITE_TITLE).toHaveProperty('zh')
    expect(SITE_TITLE.en).toBeTruthy()
    expect(SITE_TITLE.zh).toBeTruthy()
  })
})

describe('SITE_DESCRIPTION', () => {
  it('has en and zh keys with non-empty values', () => {
    expect(SITE_DESCRIPTION).toHaveProperty('en')
    expect(SITE_DESCRIPTION).toHaveProperty('zh')
    expect(SITE_DESCRIPTION.en).toBeTruthy()
    expect(SITE_DESCRIPTION.zh).toBeTruthy()
  })
})
