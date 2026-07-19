import { beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co')
})

describe('supabase-url', () => {
  let getThumbnailUrl: (filename: string) => string
  let getFullImageUrl: (filename: string) => string
  let getImageUrl: (filename: string) => string
  let SUPABASE_STORAGE_URL: string
  let STORAGE_BUCKET: string

  beforeAll(async () => {
    const mod = await import('./supabase-url')
    getThumbnailUrl = mod.getThumbnailUrl
    getFullImageUrl = mod.getFullImageUrl
    getImageUrl = mod.getImageUrl
    SUPABASE_STORAGE_URL = mod.SUPABASE_STORAGE_URL
    STORAGE_BUCKET = mod.STORAGE_BUCKET
  })

  describe('getThumbnailUrl', () => {
    it('maps caseN_full.ext to thumbnails/caseN_thumb.webp', () => {
      const url = getThumbnailUrl('case1_full.jpg')
      expect(url).toContain('thumbnails/case1_thumb.webp')
    })

    it('with case1_full.jpg ends with thumbnails/case1_thumb.webp', () => {
      const url = getThumbnailUrl('case1_full.jpg')
      expect(url).toMatch(/thumbnails\/case1_thumb\.webp$/)
    })

    it('with case100_full.png ends with thumbnails/case100_thumb.webp', () => {
      const url = getThumbnailUrl('case100_full.png')
      expect(url).toMatch(/thumbnails\/case100_thumb\.webp$/)
    })

    it('with already-thumbnail name preserves it', () => {
      const url = getThumbnailUrl('case1_thumb.webp')
      expect(url).toContain('thumbnails/case1_thumb.webp')
    })

    it('with unknown pattern keeps original filename', () => {
      const url = getThumbnailUrl('unknown_file.jpg')
      expect(url).toContain('thumbnails/unknown_file.jpg')
    })
  })

  describe('getFullImageUrl', () => {
    it('prepends full/ directory', () => {
      const url = getFullImageUrl('case1_full.jpg')
      expect(url).toMatch(/\/full\/case1_full\.jpg$/)
    })
  })

  describe('getImageUrl', () => {
    it('returns base storage URL', () => {
      const url = getImageUrl('some-file.jpg')
      expect(url).toContain(SUPABASE_STORAGE_URL)
      expect(url).toContain('/some-file.jpg')
    })
  })

  describe('constants', () => {
    it('SUPABASE_STORAGE_URL contains prompt-images bucket', () => {
      expect(SUPABASE_STORAGE_URL).toContain('prompt-images')
    })

    it('STORAGE_BUCKET equals prompt-images', () => {
      expect(STORAGE_BUCKET).toBe('prompt-images')
    })
  })
})
