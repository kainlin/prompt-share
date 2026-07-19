import { describe, it, expect, vi, beforeEach } from 'vitest'

// We re-import to get the mock objects — vi.mock in setup.ts already hoisted
vi.unmock('@/lib/stripe')
vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: vi.fn() } }, webhooks: { constructEvent: vi.fn() } },
  STRIPE_PRICE_MONTHLY: 'price_monthly_test',
  STRIPE_PRICE_LIFETIME: 'price_lifetime_test',
}))

import { stripe, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_LIFETIME } from '@/lib/stripe'

describe('lib/stripe', () => {
  // Re-set env in each test so they don't leak
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_MONTHLY
    delete process.env.STRIPE_PRICE_LIFETIME
  })

  describe('stripe client', () => {
    it('should be defined (object)', () => {
      expect(stripe).toBeDefined()
      expect(typeof stripe).toBe('object')
    })

    it('should expose checkout.sessions.create', () => {
      expect(stripe.checkout.sessions.create).toBeDefined()
      expect(typeof stripe.checkout.sessions.create).toBe('function')
    })

    it('should expose webhooks.constructEvent', () => {
      expect(stripe.webhooks.constructEvent).toBeDefined()
      expect(typeof stripe.webhooks.constructEvent).toBe('function')
    })
  })

  describe('STRIPE_PRICE_MONTHLY', () => {
    it('should be defined', () => {
      expect(STRIPE_PRICE_MONTHLY).toBeDefined()
    })

    it('should equal the mocked value', () => {
      expect(STRIPE_PRICE_MONTHLY).toBe('price_monthly_test')
    })
  })

  describe('STRIPE_PRICE_LIFETIME', () => {
    it('should be defined', () => {
      expect(STRIPE_PRICE_LIFETIME).toBeDefined()
    })

    it('should equal the mocked value', () => {
      expect(STRIPE_PRICE_LIFETIME).toBe('price_lifetime_test')
    })
  })
})
