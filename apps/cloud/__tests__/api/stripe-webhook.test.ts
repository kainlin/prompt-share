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
    const baseSession = {
      id: 'cs_test_123',
      object: 'checkout.session' as const,
      amount_total: 1000,
      subscription: 'sub_test_456',
      customer: 'cus_test_789',
      payment_intent: 'pi_test_001',
      metadata: {
        tenantId: 't-1',
        userId: 'user-1',
        plan: 'monthly',
        platformFee: '150',
        creatorRevenue: '850',
      },
    }

    it('upserts a subscription record', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: baseSession },
      } as any)

      mockDb.subscription.upsert.mockResolvedValue({ id: 'sub-1' } as any)
      mockDb.order.upsert.mockResolvedValue({ id: 'ord-1' } as any)
      mockDb.tenant.findUnique.mockResolvedValue(null) // no tenant owner → skip transfer
      mockStripeClient.paymentIntents.update.mockResolvedValue({} as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(baseSession),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.received).toBe(true)

      expect(mockDb.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSessionId: 'cs_test_123' },
          create: expect.objectContaining({
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

    it('creates an order record with revenue split', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: baseSession },
      } as any)

      mockDb.subscription.upsert.mockResolvedValue({ id: 'sub-1' } as any)
      mockDb.order.upsert.mockResolvedValue({ id: 'ord-1' } as any)
      mockDb.tenant.findUnique.mockResolvedValue(null) // no tenant owner → skip transfer
      mockStripeClient.paymentIntents.update.mockResolvedValue({} as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(baseSession),
      })
      await POST(req)

      expect(mockDb.order.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: 'user-1',
            tenantId: 't-1',
            stripeSessionId: 'cs_test_123',
            amountTotal: 1000,
            platformFee: 150,
            creatorRevenue: 850,
            payoutStatus: 'pending',
            payoutReadyAt: expect.any(Date),
          }),
        })
      )
    })

    it('performs instant transfer for trusted users with Connect', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: baseSession },
      } as any)

      mockDb.subscription.upsert.mockResolvedValue({ id: 'sub-1' } as any)
      mockDb.order.upsert.mockResolvedValue({ id: 'ord-1' } as any)
      mockDb.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        owner: {
          id: 'owner-1',
          isTrustedUser: true,
          stripeAccountId: 'acct_123',
          stripeConnected: true,
        },
      } as any)

      mockStripeClient.paymentIntents.update.mockResolvedValue({} as any)
      mockStripeClient.paymentIntents.retrieve.mockResolvedValue({
        latest_charge: 'ch_test_001',
      } as any)
      mockStripeClient.transfers.create.mockResolvedValue({ id: 'tr_test_001' } as any)
      mockDb.order.update.mockResolvedValue({ id: 'ord-1' } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(baseSession),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_001')
      expect(mockStripeClient.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 850,
          currency: 'usd',
          destination: 'acct_123',
          source_transaction: 'ch_test_001',
        })
      )
      expect(mockDb.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSessionId: 'cs_test_123' },
          data: expect.objectContaining({
            payoutStatus: 'paid',
            creatorTransferId: 'tr_test_001',
          }),
        })
      )
    })

    it('gracefully handles transfer failure for trusted users', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: baseSession },
      } as any)

      mockDb.subscription.upsert.mockResolvedValue({ id: 'sub-1' } as any)
      mockDb.order.upsert.mockResolvedValue({ id: 'ord-1' } as any)
      mockDb.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        owner: {
          id: 'owner-1',
          isTrustedUser: true,
          stripeAccountId: 'acct_123',
          stripeConnected: true,
        },
      } as any)

      mockStripeClient.paymentIntents.update.mockResolvedValue({} as any)
      mockStripeClient.paymentIntents.retrieve.mockRejectedValue(new Error('API error'))

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(baseSession),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      // Order should still be created (pending) — transfer failure is non-fatal
      expect(mockDb.order.upsert).toHaveBeenCalled()
      expect(mockDb.order.update).not.toHaveBeenCalled()
    })

    it('skips instant transfer for non-trusted users', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: baseSession },
      } as any)

      mockDb.subscription.upsert.mockResolvedValue({ id: 'sub-1' } as any)
      mockDb.order.upsert.mockResolvedValue({ id: 'ord-1' } as any)
      mockDb.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        owner: {
          id: 'owner-1',
          isTrustedUser: false,
          stripeAccountId: 'acct_123',
          stripeConnected: true,
        },
      } as any)

      mockStripeClient.paymentIntents.update.mockResolvedValue({} as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(baseSession),
      })
      await POST(req)

      expect(mockStripeClient.paymentIntents.update).toHaveBeenCalled()
      expect(mockStripeClient.paymentIntents.retrieve).not.toHaveBeenCalled()
      expect(mockStripeClient.transfers.create).not.toHaveBeenCalled()
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
      // Neither subscription nor order should be created when metadata is missing
      expect(mockDb.subscription.upsert).not.toHaveBeenCalled()
      expect(mockDb.order.upsert).not.toHaveBeenCalled()
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

  describe('charge.dispute.created', () => {
    it('marks the order as disputed', async () => {
      const dispute = {
        id: 'dp_test_001',
        object: 'dispute' as const,
        status: 'needs_response',
        payment_intent: 'pi_test_001',
      }

      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'charge.dispute.created',
        data: { object: dispute },
      } as any)

      mockStripeClient.paymentIntents.retrieve.mockResolvedValue({
        metadata: { stripeSessionId: 'cs_test_123' },
      } as any)
      mockDb.order.updateMany.mockResolvedValue({ count: 1 } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(dispute),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_001')
      expect(mockDb.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSessionId: 'cs_test_123' },
          data: expect.objectContaining({
            payoutStatus: 'disputed',
            disputeId: 'dp_test_001',
            disputeStatus: 'needs_response',
          }),
        })
      )
    })
  })

  describe('charge.dispute.closed', () => {
    it('resets to pending if dispute is won', async () => {
      const dispute = {
        id: 'dp_test_001',
        object: 'dispute' as const,
        status: 'won',
        payment_intent: 'pi_test_001',
      }

      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'charge.dispute.closed',
        data: { object: dispute },
      } as any)

      mockStripeClient.paymentIntents.retrieve.mockResolvedValue({
        metadata: { stripeSessionId: 'cs_test_123' },
      } as any)
      mockDb.order.updateMany.mockResolvedValue({ count: 1 } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(dispute),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_001')
      expect(mockDb.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSessionId: 'cs_test_123' },
          data: expect.objectContaining({ payoutStatus: 'pending', disputeStatus: 'won' }),
        })
      )
    })

    it('keeps disputed if dispute is lost', async () => {
      const dispute = {
        id: 'dp_test_001',
        object: 'dispute' as const,
        status: 'lost',
        payment_intent: 'pi_test_001',
      }

      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'charge.dispute.closed',
        data: { object: dispute },
      } as any)

      mockStripeClient.paymentIntents.retrieve.mockResolvedValue({
        metadata: { stripeSessionId: 'cs_test_123' },
      } as any)
      mockDb.order.updateMany.mockResolvedValue({ count: 1 } as any)

      const req = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify(dispute),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_001')
      expect(mockDb.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSessionId: 'cs_test_123' },
          data: expect.objectContaining({ payoutStatus: 'disputed', disputeStatus: 'lost' }),
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
      expect(mockDb.subscription.upsert).not.toHaveBeenCalled()
      expect(mockDb.subscription.updateMany).not.toHaveBeenCalled()
      expect(mockDb.order.upsert).not.toHaveBeenCalled()
      expect(mockDb.order.updateMany).not.toHaveBeenCalled()
    })
  })
})
