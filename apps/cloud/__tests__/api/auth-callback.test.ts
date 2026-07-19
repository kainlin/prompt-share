import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { mockExchangeCode } from '../setup'

const mockDb = vi.mocked(db)

import { GET } from '@/app/api/auth/callback/route'

describe('/api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /login?error=no_code when code is missing', async () => {
    const req = new Request('http://localhost/api/auth/callback')
    const res = await GET(req)

    // NextResponse.redirect returns a 307 (or 302/303) status
    expect(res.status).toBeGreaterThanOrEqual(301)
    expect(res.status).toBeLessThanOrEqual(308)
    expect(res.headers.get('location')).toContain('/login?error=no_code')
  })

  it('redirects to /login?error=auth_failed when exchange fails', async () => {
    mockExchangeCode.mockResolvedValue({ data: { user: null }, error: new Error('bad') })

    const req = new Request('http://localhost/api/auth/callback?code=bad_code')
    const res = await GET(req)

    expect(res.headers.get('location')).toContain('/login?error=auth_failed')
  })

  it('redirects to /login?error=auth_failed when user is null', async () => {
    mockExchangeCode.mockResolvedValue({ data: { user: null }, error: null })

    const req = new Request('http://localhost/api/auth/callback?code=expired')
    const res = await GET(req)

    expect(res.headers.get('location')).toContain('/login?error=auth_failed')
  })

  it('upserts user and redirects to /dashboard on success', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User', avatar_url: 'https://img.test/avatar.png' },
    }
    mockExchangeCode.mockResolvedValue({ data: { user }, error: null })
    mockDb.user.upsert.mockResolvedValue({ id: 'user-1' } as any)

    const req = new Request('http://localhost/api/auth/callback?code=valid')
    const res = await GET(req)

    expect(res.headers.get('location')).toBe('http://localhost/dashboard')
    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@example.com' },
        create: expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: 'https://img.test/avatar.png',
        }),
      })
    )
  })

  it('falls back to email as name when full_name is missing', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {},
    }
    mockExchangeCode.mockResolvedValue({ data: { user }, error: null })
    mockDb.user.upsert.mockResolvedValue({ id: 'user-1' } as any)

    const req = new Request('http://localhost/api/auth/callback?code=valid')
    const res = await GET(req)

    expect(res.headers.get('location')).toBe('http://localhost/dashboard')
    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ name: 'test@example.com' }),
      })
    )
  })

  it('respects the redirect query parameter', async () => {
    const user = { id: 'user-1', email: 'test@example.com', user_metadata: {} }
    mockExchangeCode.mockResolvedValue({ data: { user }, error: null })
    mockDb.user.upsert.mockResolvedValue({ id: 'user-1' } as any)

    const req = new Request('http://localhost/api/auth/callback?code=valid&redirect=/@demo')
    const res = await GET(req)

    expect(res.headers.get('location')).toBe('http://localhost/@demo')
  })
})
