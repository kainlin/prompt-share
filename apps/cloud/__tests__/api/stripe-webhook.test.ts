import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { mockStripeClient } from '../setup'

const mockDb = vi.mocked(db)

import { POST } from '@/app/api/stripe/webhook/route'

describe('/api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signature verification', () => {
    it('returns 400 when the webhook signature is invalid', async () => {
      mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'bad-sig' },
        body: '{}',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('Webhook Error')
    })
  })

  describe('checkout.session.completed', () => {
    it('creates a subscription record', async () => {
      const session = {
        id: 'cs_test_123',
        object: 'checkout.session' as const,
        subscription: 'sub_test_456',
        customer: 'cus_test_789',
        metadata: { tenantId: 't-1', userId: 'user-1', plan: 'monthly' },
      }

      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: session },
      } as any)

      mockDb.subscription.create.mockResolvedValue({ id: 'sub-1' } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(session),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.received).toBe(true)

      expect(mockDb.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 't-1',
            userId: 'user-1',
            stripeSessionId: 'cs_test_123',
            stripeSubscriptionId: 'sub_test_456',
            stripeCustomerId: 'cus_test_789',
            status: 'active',
            plan: 'monthly',
          }),
        })
      )
    })

    it('handles missing metadata gracefully', async () => {
      const session = {
        id: 'cs_test_123',
        object: 'checkout.session' as const,
        metadata: {},
      }

      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: session },
      } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(session),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      // subscription.create should NOT be called when metadata is missing
      expect(mockDb.subscription.create).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.deleted', () => {
    it('expires the subscription', async () => {
      const subscription = {
        id: 'sub_test_456',
        object: 'subscription' as const,
      }

      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: subscription },
      } as any)

      mockDb.subscription.updateMany.mockResolvedValue({ count: 1 } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(subscription),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(mockDb.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_test_456', status: 'active' },
          data: expect.objectContaining({ status: 'expired' }),
        })
      )
    })
  })

  describe('unhandled event type', () => {
    it('returns received: true without side effects', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'some.other.event',
        data: { object: {} },
      } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: '{}',
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.received).toBe(true)

      // No DB writes should happen
      expect(mockDb.subscription.create).not.toHaveBeenCalled()
      expect(mockDb.subscription.updateMany).not.toHaveBeenCalled()
    })
  })
})
