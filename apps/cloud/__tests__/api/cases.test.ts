import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { mockGetSession, mockStripeClient } from '../setup'

// stub the real imports — they resolve to what setup.ts mocked
const mockDb = vi.mocked(db)
const mockStripe = vi.mocked(stripe)

// Helper: a valid user
const user = { id: 'user-1', email: 'a@b.com' }
// Helper: a valid tenant owned by the user
const tenant = { id: 't-1', slug: 'demo', displayName: 'Demo', ownerId: 'user-1' }
// Helper: a sample case body
const validBody = {
  tenantId: 't-1',
  title: 'Sunset Dream',
  category: 'photography',
  emoji: '🌅',
  promptText: 'A beautiful sunset',
}

// ---- Import the handler under test ----
// The route exports named functions GET / POST
import { GET, POST } from '@/app/api/cases/route'

describe('/api/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------
  // POST
  // -------------------------------------------------------------------
  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('returns 403 when tenant does not belong to user', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.tenant.findFirst.mockResolvedValue(null) // not found / not owned

      const req = new Request('http://localhost/api/cases', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })
      const res = await POST(req)
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBe('Not your tenant')
    })

    it('returns 400 when title is missing', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.tenant.findFirst.mockResolvedValue(tenant)

      const body = { ...validBody, title: '' }
      const req = new Request('http://localhost/api/cases', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Missing required fields')
    })

    it('returns 400 when promptText is missing', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.tenant.findFirst.mockResolvedValue(tenant)

      const body = { ...validBody, promptText: '' }
      const req = new Request('http://localhost/api/cases', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Missing required fields')
    })

    it('creates a case and returns 201', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.tenant.findFirst.mockResolvedValue(tenant)

      const created = { id: 'c-1', ...validBody, slug: 'sunset-dream' }
      mockDb.promptCase.create.mockResolvedValue(created as any)

      const req = new Request('http://localhost/api/cases', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })
      const res = await POST(req)
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.id).toBe('c-1')
      expect(mockDb.promptCase.create).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------
  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases?tenantId=t-1')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 when tenantId is missing', async () => {
      mockGetSession.mockResolvedValue({ user })

      const req = new Request('http://localhost/api/cases')
      const res = await GET(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('tenantId required')
    })

    it('returns 403 when tenant is not owned by user', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.tenant.findFirst.mockResolvedValue(null)

      const req = new Request('http://localhost/api/cases?tenantId=t-1')
      const res = await GET(req)
      expect(res.status).toBe(403)
    })

    it('returns list of cases', async () => {
      mockGetSession.mockResolvedValue({ user })
      mockDb.tenant.findFirst.mockResolvedValue(tenant)
      const cases = [{ id: 'c-1', title: 'Sunset' }, { id: 'c-2', title: 'Sunrise' }]
      mockDb.promptCase.findMany.mockResolvedValue(cases as any)

      const req = new Request('http://localhost/api/cases?tenantId=t-1')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveLength(2)
      expect(mockDb.promptCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't-1' } })
      )
    })
  })
})
