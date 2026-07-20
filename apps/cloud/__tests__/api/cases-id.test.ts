import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { mockGetSession } from '../setup'

const mockDb = vi.mocked(db)

const user = { id: 'user-1', email: 'a@b.com' }
const tenant = { id: 't-1', ownerId: 'user-1', slug: 'demo' }

// Build a context object like Next.js App Router passes
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

import { GET, PUT, DELETE } from '@/app/api/cases/[id]/route'

describe('/api/cases/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------
  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/c-1')
      const res = await GET(req, ctx('c-1'))
      expect(res.status).toBe(401)
    })

    it('returns 404 when case does not exist', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/c-1')
      const res = await GET(req, ctx('c-1'))
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toBe('Case not found')
    })

    it('returns 403 when tenant owner does not match', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue({
        id: 'c-1',
        tenant: { ownerId: 'someone-else' },
      } as any)

      const req = new Request('http://localhost/api/cases/c-1')
      const res = await GET(req, ctx('c-1'))
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBe('Not your case')
    })

    it('returns the case when authenticated owner', async () => {
      mockGetSession.mockResolvedValue({ user })
      const found = { id: 'c-1', title: 'Sunset', tenant: { ownerId: 'user-1' } }
      mockDb.promptCase.findUnique.mockResolvedValue(found as any)

      const req = new Request('http://localhost/api/cases/c-1')
      const res = await GET(req, ctx('c-1'))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.id).toBe('c-1')
    })
  })

  // -------------------------------------------------------------------
  // PUT
  // -------------------------------------------------------------------
  describe('PUT', () => {
    const updateBody = { title: 'New Title', promptText: 'New prompt' }

    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/c-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      })
      const res = await PUT(req, ctx('c-1'))
      expect(res.status).toBe(401)
    })

    it('returns 404 when case does not exist', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/c-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      })
      const res = await PUT(req, ctx('c-1'))
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toBe('Case not found')
    })

    it('returns 403 when not the owner', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue({
        id: 'c-1',
        title: 'Old',
        slug: 'old',
        tenant: { ownerId: 'someone-else' },
      } as any)

      const req = new Request('http://localhost/api/cases/c-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      })
      const res = await PUT(req, ctx('c-1'))
      expect(res.status).toBe(403)
    })

    it('returns 400 when title is missing', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue({
        id: 'c-1',
        title: 'Old',
        slug: 'old',
        tenant: { ownerId: 'user-1' },
      } as any)

      const req = new Request('http://localhost/api/cases/c-1', {
        method: 'PUT',
        body: JSON.stringify({ title: '', promptText: 'p' }),
      })
      const res = await PUT(req, ctx('c-1'))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Missing required fields')
    })

    it('updates and returns the case', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue({
        id: 'c-1',
        title: 'Old',
        slug: 'old',
        tenant: { ownerId: 'user-1' },
      } as any)
      const updated = { id: 'c-1', title: 'New Title', slug: 'new-title' }
      mockDb.promptCase.update.mockResolvedValue(updated as any)

      const req = new Request('http://localhost/api/cases/c-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      })
      const res = await PUT(req, ctx('c-1'))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.title).toBe('New Title')
      expect(mockDb.promptCase.update).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------
  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/c-1', { method: 'DELETE' })
      const res = await DELETE(req, ctx('c-1'))
      expect(res.status).toBe(401)
    })

    it('returns 404 when case does not exist', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases/c-1', { method: 'DELETE' })
      const res = await DELETE(req, ctx('c-1'))
      expect(res.status).toBe(404)
    })

    it('returns 403 when not the owner', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue({
        id: 'c-1',
        tenant: { ownerId: 'someone-else' },
      } as any)

      const req = new Request('http://localhost/api/cases/c-1', { method: 'DELETE' })
      const res = await DELETE(req, ctx('c-1'))
      expect(res.status).toBe(403)
    })

    it('deletes and returns success', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.promptCase.findUnique.mockResolvedValue({
        id: 'c-1',
        tenant: { ownerId: 'user-1' },
      } as any)
      mockDb.promptCase.delete.mockResolvedValue({ id: 'c-1' } as any)

      const req = new Request('http://localhost/api/cases/c-1', { method: 'DELETE' })
      const res = await DELETE(req, ctx('c-1'))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(mockDb.promptCase.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } })
    })
  })
})
