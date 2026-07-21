import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Prisma client (via @/lib/db)
// ---------------------------------------------------------------------------
vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    promptCase: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock Better Auth (replaces Supabase Auth)
// ---------------------------------------------------------------------------
const mockGetSession = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock Stripe
// ---------------------------------------------------------------------------
const mockStripeClient = {
  checkout: { sessions: { create: vi.fn() } },
  webhooks: { constructEvent: vi.fn() },
  paymentIntents: { retrieve: vi.fn(), update: vi.fn() },
  transfers: { create: vi.fn() },
}

vi.mock('@/lib/stripe', () => ({
  stripe: mockStripeClient,
  STRIPE_PRICE_MONTHLY: 'price_monthly_test',
  STRIPE_PRICE_LIFETIME: 'price_lifetime_test',
  calculateSplit: (amountTotalCents: number) => {
    const platformFeeCents = Math.round(amountTotalCents * 15 / 100)
    return {
      grossCents: amountTotalCents,
      platformFeeCents,
      creatorRevenueCents: amountTotalCents - platformFeeCents,
    }
  },
  PAYOUT_COOLDOWN_DAYS: 14,
}))

// ---------------------------------------------------------------------------
// Mock next/headers (used by auth routes)
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Map()),
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}))

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js (still used by upload route for Storage)
// ---------------------------------------------------------------------------
const mockStorageUpload = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
      })),
    },
  })),
}))

export { mockGetSession, mockStripeClient, mockStorageUpload }
