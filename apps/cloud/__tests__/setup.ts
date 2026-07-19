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
      updateMany: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock Supabase server client
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn()
const mockExchangeCode = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        exchangeCodeForSession: mockExchangeCode,
      },
    })
  ),
}))

// ---------------------------------------------------------------------------
// Mock Stripe
// ---------------------------------------------------------------------------
const mockStripeClient = {
  checkout: { sessions: { create: vi.fn() } },
  webhooks: { constructEvent: vi.fn() },
}

vi.mock('@/lib/stripe', () => ({
  stripe: mockStripeClient,
  STRIPE_PRICE_MONTHLY: 'price_monthly_test',
  STRIPE_PRICE_LIFETIME: 'price_lifetime_test',
}))

// ---------------------------------------------------------------------------
// Mock @supabase/ssr (used directly by middleware)
// ---------------------------------------------------------------------------
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

// Mock next/headers (used by supabase server)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}))

export { mockGetUser, mockStripeClient, mockExchangeCode }
