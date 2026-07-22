import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { mockGetSession } from '../setup'

const mockDb = vi.mocked(db)

// Helper: a valid user
const user = { id: 'user-1', email: 'a@b.com' }

// Helpers: a valid case
const promptCase = { id: 'case-1', title: 'Sunset', slug: 'sunset', tenantId: 't-1', viewCount: 5, likeCount: 3, paywallMode: 'free', allowCopy: true, freePreviewCount: 0, watermarkEnabled: false, category: 'photography', tags: [], emoji: '📷', coverImageUrl: '', images: [], promptText: 'test', published: true }

// ---- Import handlers under test ----
import { POST as ViewPOST } from '@/app/api/cases/[id]/view/route'
import { POST as LikePOST } from '@/app/api/cases/[id]/like/route'
import { POST as StatsBatchPOST } from '@/app/api/cases/stats-batch/route'

describe('Likes & Views API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── VIEW ──────────────────────────────────────────────
  describe('POST /api/cases/[id]/view', () => {
    it('counts a new guest view and increments counter', async () => {
      mockGetSession.mockResolvedValue(null)
      mockDb.promptCaseView.findFirst.mockResolvedValue(null)

      mockDb.$transaction.mockImplementation(async (ops: any[]) => {
        const results = []
        for (const op of ops) {
          if (typeof op === 'object' && op !== null && 'caseId' in op) {
            results.push({ id: 'v-1', caseId: 'case-1' })
          } else {
            results.push({ viewCount: 6 })
          }
        }
        return results
      })

      const req = new Request('http://localhost/api/cases/case-1/view', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'test-agent' },
      })
      const res = await ViewPOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.counted).toBe(true)
    })

    it('skips duplicate guest view within 24h', async () => {
      mockGetSession.mockResolvedValue(null)
      const existingView = { id: 'v-1', caseId: 'case-1', userId: null, ipHash: 'abc', userAgent: 'test-agent', createdAt: new Date() }
      mockDb.promptCaseView.findFirst.mockResolvedValue(existingView as any)
      mockDb.promptCase.findUnique.mockResolvedValue(promptCase as any)

      const req = new Request('http://localhost/api/cases/case-1/view', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'test-agent' },
      })
      const res = await ViewPOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.counted).toBe(false)
      expect(json.viewCount).toBe(5)
    })

    it('deduplicates logged-in user by userId', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCaseView.findFirst.mockResolvedValue({ id: 'v-1', caseId: 'case-1', userId: 'user-1', ipHash: 'abc', userAgent: 'agent', createdAt: new Date() } as any)
      mockDb.promptCase.findUnique.mockResolvedValue(promptCase as any)

      const req = new Request('http://localhost/api/cases/case-1/view', { method: 'POST' })
      const res = await ViewPOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.counted).toBe(false)
      // should query by userId, not ipHash
      expect(mockDb.promptCaseView.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
      )
    })

    it('counts logged-in user view when no prior view', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCaseView.findFirst.mockResolvedValue(null)

      mockDb.$transaction.mockImplementation(async (ops: any[]) => [
        { id: 'v-1', caseId: 'case-1' },
        { viewCount: 6 },
      ])

      const req = new Request('http://localhost/api/cases/case-1/view', { method: 'POST' })
      const res = await ViewPOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.counted).toBe(true)
      expect(json.viewCount).toBe(6)
    })
  })

  // ── LIKE ──────────────────────────────────────────────
  describe('POST /api/cases/[id]/like', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/case-1/like', { method: 'POST' })
      const res = await LikePOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      expect(res.status).toBe(401)
    })

    it('returns 404 when case not found', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/case-99/like', { method: 'POST' })
      const res = await LikePOST(req, { params: Promise.resolve({ id: 'case-99' }) })
      expect(res.status).toBe(404)
    })

    it('likes a case and returns liked=true', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(promptCase as any)
      mockDb.promptCaseLike.findUnique.mockResolvedValue(null)

      mockDb.$transaction.mockImplementation(async (ops: any[]) => [
        { id: 'like-1', userId: 'user-1', caseId: 'case-1' },
        { likeCount: 4 },
      ])

      const req = new Request('http://localhost/api/cases/case-1/like', { method: 'POST' })
      const res = await LikePOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.liked).toBe(true)
      expect(json.likeCount).toBe(4)
    })

    it('unlikes a case when already liked', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(promptCase as any)
      mockDb.promptCaseLike.findUnique.mockResolvedValue({ id: 'like-1', userId: 'user-1', caseId: 'case-1' } as any)

      mockDb.$transaction.mockImplementation(async (ops: any[]) => [
        { id: 'like-1' },
        { likeCount: 2 },
      ])

      const req = new Request('http://localhost/api/cases/case-1/like', { method: 'POST' })
      const res = await LikePOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.liked).toBe(false)
      expect(json.likeCount).toBe(2)
      expect(mockDb.promptCaseLike.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'like-1' } }))
    })

    it('toggle is idempotent (like → unlike → like)', async () => {
      // First click: like
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(promptCase as any)
      mockDb.promptCaseLike.findUnique.mockResolvedValue(null)
      mockDb.$transaction.mockImplementation(async (ops: any[]) => [{ id: 'like-1' }, { likeCount: 4 }])

      let req = new Request('http://localhost/api/cases/case-1/like', { method: 'POST' })
      let res = await LikePOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      let json = await res.json()
      expect(json.liked).toBe(true)

      // Second click: unlike (same case)
      vi.clearAllMocks()
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(promptCase as any)
      mockDb.promptCaseLike.findUnique.mockResolvedValue({ id: 'like-1', userId: 'user-1', caseId: 'case-1' } as any)
      mockDb.$transaction.mockImplementation(async (ops: any[]) => [{ id: 'like-1' }, { likeCount: 3 }])

      req = new Request('http://localhost/api/cases/case-1/like', { method: 'POST' })
      res = await LikePOST(req, { params: Promise.resolve({ id: 'case-1' }) })
      json = await res.json()
      expect(json.liked).toBe(false)
    })
  })

  // ── STATS-BATCH ───────────────────────────────────────
  describe('POST /api/cases/stats-batch', () => {
    it('returns empty stats when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/stats-batch', {
        method: 'POST',
        body: JSON.stringify({ caseIds: ['case-1', 'case-2'] }),
      })
      const res = await StatsBatchPOST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.stats).toEqual({})
    })

    it('returns empty stats for empty caseIds', async () => {
      mockGetSession.mockResolvedValue({ user })

      const req = new Request('http://localhost/api/cases/stats-batch', {
        method: 'POST',
        body: JSON.stringify({ caseIds: [] }),
      })
      const res = await StatsBatchPOST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.stats).toEqual({})
    })

    it('returns liked status for each case', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCaseLike.findMany.mockResolvedValue([
        { caseId: 'case-1' } as any,
        { caseId: 'case-3' } as any,
      ])

      const req = new Request('http://localhost/api/cases/stats-batch', {
        method: 'POST',
        body: JSON.stringify({ caseIds: ['case-1', 'case-2', 'case-3'] }),
      })
      const res = await StatsBatchPOST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.stats).toEqual({
        'case-1': { liked: true },
        'case-2': { liked: false },
        'case-3': { liked: true },
      })
    })

    it('caps at 100 caseIds', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCaseLike.findMany.mockResolvedValue([])

      const ids = Array.from({ length: 200 }, (_, i) => `case-${i}`)
      const req = new Request('http://localhost/api/cases/stats-batch', {
        method: 'POST',
        body: JSON.stringify({ caseIds: ids }),
      })
      const res = await StatsBatchPOST(req)
      expect(res.status).toBe(200)

      // findMany should only receive up to 100 ids
      const call = mockDb.promptCaseLike.findMany.mock.calls[0]?.[0] as any
      expect(call.where.caseId.in.length).toBeLessThanOrEqual(100)
    })
  })
})
