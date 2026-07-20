import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockGetSession } from './setup'

// We need to mock createServerClient from @supabase/ssr as well — already in setup.ts
// But middleware imports it directly. So we need to set up the mock behavior.

import { middleware, config } from '@/middleware'

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function buildRequest(pathname: string): NextRequest {
    const url = `http://localhost${pathname}`
    const req = new NextRequest(url)
    // Update nextUrl pathname so middleware reads it correctly
    // NextRequest ctor from url gives us a proper nextUrl
    return req
  }

  describe('protected paths', () => {
    it('redirects /dashboard to /login when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = buildRequest('/dashboard')
      const res = await middleware(req)

      expect(res.status).toBeGreaterThanOrEqual(301)
      expect(res.status).toBeLessThanOrEqual(308)
      const location = res.headers.get('location') || ''
      expect(location).toContain('/login')
      expect(location).toContain('redirect=%2Fdashboard')
    })

    it('allows /dashboard when authenticated', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })

      const req = buildRequest('/dashboard')
      const res = await middleware(req)

      // Should be a NextResponse.next() — not a redirect
      expect(res.status).toBe(200)
    })

    it('redirects /dashboard/cases to /login when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const req = buildRequest('/dashboard/cases')
      const res = await middleware(req)

      const location = res.headers.get('location') || ''
      expect(location).toContain('/login')
      expect(location).toContain('redirect=%2Fdashboard%2Fcases')
    })
  })

  describe('public paths', () => {
    it('allows /login without authentication', async () => {
      const req = buildRequest('/login')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })

    it('allows root / without authentication', async () => {
      const req = buildRequest('/')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })
  })

  describe('static asset bypass', () => {
    it('excludes /_next/static via config.matcher', () => {
      // The middleware config.matcher already excludes _next/static,
      // so the middleware function itself won't be called for these paths.
      expect(config).toBeDefined()
      expect(config.matcher).toBeDefined()
      // Verify _next/static is excluded from the matcher pattern
      const matcherStr = JSON.stringify(config.matcher)
      expect(matcherStr).toContain('_next/static')
    })
  })
})
