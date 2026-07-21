import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { mockGetSession, mockStripeClient } from '../setup'

const mockDb = vi.mocked(db)

const user = { id: 'user-1', email: 'a@b.com' }
const tenant = { id: 't-1', slug: 'demo', displayName: 'Demo', ownerId: 'user-1', monthlyPriceId: 'price_monthly_test', lifetimePriceId: 'price_lifetime_test' }

import { POST } from '@/app/api/stripe/checkout/route'

describe('/api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const req = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 't-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 404 when tenant does not exist', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.tenant.findUnique.mockResolvedValue(null)

    const req = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 't-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Tenant not found')
  })

  it('returns a checkout url for monthly plan', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.tenant.findUnique.mockResolvedValue(tenant as any)
    mockStripeClient.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' } as any)

    const req = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 't-1', plan: 'monthly' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://checkout.stripe.com/test')

    expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription' })
    )
  })

  it('returns a checkout url for lifetime plan', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.tenant.findUnique.mockResolvedValue(tenant as any)
    mockStripeClient.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/lifetime' } as any)

    const req = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 't-1', plan: 'lifetime' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://checkout.stripe.com/lifetime')

    expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment' })
    )
  })

  it('defaults to monthly plan when plan is not specified', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.tenant.findUnique.mockResolvedValue(tenant as any)
    mockStripeClient.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' } as any)

    const req = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 't-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription' })
    )
  })

  it('passes metadata to Stripe', async () => {
    mockGetSession.mockResolvedValue({ user })
    mockDb.tenant.findUnique.mockResolvedValue(tenant as any)
    mockStripeClient.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' } as any)

    const req = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 't-1', plan: 'monthly' }),
    })
    await POST(req)

    expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { tenantId: 't-1', userId: 'user-1', plan: 'monthly' },
      })
    )
  })
})
