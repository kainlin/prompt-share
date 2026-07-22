import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { mockGetSession } from '../setup'

const mockDb = vi.mocked(db)

const user = { id: 'user-1', email: 'a@b.com' }
const tenant = { id: 't-1', slug: 'demo', displayName: 'Demo', ownerId: 'user-1' }

// Helper to create a mock case
function makeCase(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'case-1',
    title: 'Test',
    slug: 'test',
    category: 'photography',
    tags: [],
    emoji: '📷',
    coverImageUrl: '',
    images: [],
    promptText: 'test prompt',
    published: true,
    paywallMode: 'free',
    allowCopy: true,
    freePreviewCount: 0,
    watermarkEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: { id: 't-1', slug: 'demo', displayName: 'Demo', ownerId: 'user-1' },
    ...overrides,
  }
}

import { PUT as BatchPUT } from '@/app/api/cases/batch/route'

describe('POST /api/cases/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1'], action: 'publish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when ids is empty', async () => {
    mockGetSession.mockResolvedValue({ user })

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: [], action: 'publish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when ids is not an array', async () => {
    mockGetSession.mockResolvedValue({ user })

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: 'case-1', action: 'publish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when some cases not found', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.promptCase.findMany.mockResolvedValue([makeCase() as any]) // only 1 found, asked for 2

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1', 'case-2'], action: 'publish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(404)
  })

  it('returns 403 when not the owner', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.promptCase.findMany.mockResolvedValue([
      makeCase({ id: 'case-2', tenant: { id: 't-2', ownerId: 'other-user' } }) as any,
    ])

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-2'], action: 'publish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(403)
  })

  // ── Actions ──────────────────────────────────────────
  it('batch publish sets published=true', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.promptCase.findMany.mockResolvedValue([makeCase() as any, makeCase({ id: 'case-3' }) as any])
    mockDb.promptCase.updateMany.mockResolvedValue({ count: 2 })

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1', 'case-3'], action: 'publish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(200)
    expect(mockDb.promptCase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['case-1', 'case-3'] } }, data: { published: true } })
    )
  })

  it('batch unpublish sets published=false', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.promptCase.findMany.mockResolvedValue([makeCase() as any])
    mockDb.promptCase.updateMany.mockResolvedValue({ count: 1 })

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1'], action: 'unpublish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(200)
    expect(mockDb.promptCase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { published: false } })
    )
  })

  it('batch delete removes cases', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.promptCase.findMany.mockResolvedValue([makeCase() as any])
    mockDb.promptCase.deleteMany.mockResolvedValue({ count: 1 })

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1'], action: 'delete' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(200)
    expect(mockDb.promptCase.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['case-1'] } } })
    )
  })

  it('batch paywall changes paywallMode on cases', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.promptCase.findMany.mockResolvedValue([makeCase() as any, makeCase({ id: 'case-4' }) as any])
    mockDb.promptCase.updateMany.mockResolvedValue({ count: 2 })

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1', 'case-4'], action: 'paywall', paywallMode: 'full_lock' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(200)
    expect(mockDb.promptCase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { paywallMode: 'full_lock' } })
    )
  })

  it('rejects invalid paywall mode values', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.promptCase.findMany.mockResolvedValue([makeCase() as any])

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1'], action: 'paywall', paywallMode: 'premium' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(400)
  })

  it('rejects unknown action values', async () => {
    mockGetSession.mockResolvedValue({ user })

    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids: ['case-1'], action: 'rename' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(400)
  })

  it('rejects more than 100 caseIds', async () => {
    mockGetSession.mockResolvedValue({ user })

    const ids = Array.from({ length: 101 }, (_, i) => `case-${i}`)
    const req = new Request('http://localhost/api/cases/batch', {
      method: 'PUT',
      body: JSON.stringify({ ids, action: 'publish' }),
    })
    const res = await BatchPUT(req)
    expect(res.status).toBe(400)
  })
})
