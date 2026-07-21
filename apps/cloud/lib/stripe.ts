import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

// ─── Platform Configuration ───────────────────────────

/** Stripe Product ID — parent product for all creator Prices */
export const PLATFORM_PRODUCT_ID = process.env.STRIPE_PRODUCT_ID!

/** Platform take rate (0-100) */
export const PLATFORM_FEE_PCT = 15

/** Days before funds are available for withdrawal */
export const PAYOUT_COOLDOWN_DAYS = 14

/** Minimum withdrawal amount in cents */
export const MIN_WITHDRAWAL_CENTS = 100

// ─── Pricing Guardrails ───────────────────────────────

export const PRICING_GUARDRAILS = {
  monthly: { min: 199, max: 19999 },  // $1.99 – $199.99
  lifetime: { min: 499, max: 99999 },  // $4.99 – $999.99
  maxPriceChangesPerDays: 30,           // days between price changes
} as const

// ─── Revenue Split ───────────────────────────────────

export interface SplitResult {
  grossCents: number
  platformFeeCents: number
  creatorRevenueCents: number
}

export function calculateSplit(amountTotalCents: number): SplitResult {
  const platformFeeCents = Math.round(amountTotalCents * PLATFORM_FEE_PCT / 100)
  const creatorRevenueCents = amountTotalCents - platformFeeCents
  return {
    grossCents: amountTotalCents,
    platformFeeCents,
    creatorRevenueCents,
  }
}

// ─── Stripe Price Helpers ─────────────────────────────

interface CreatePriceParams {
  productId: string
  unitAmount: number    // cents
  currency?: string
  recurring?: boolean
  metadata?: Record<string, string>
}

/** Create a Stripe Price under the given Product. Returns the Price ID. */
export async function createStripePrice(params: CreatePriceParams): Promise<string> {
  const price = await stripe.prices.create({
    product: params.productId,
    unit_amount: params.unitAmount,
    currency: params.currency || 'usd',
    ...(params.recurring ? { recurring: { interval: 'month' as const } } : {}),
    metadata: params.metadata,
  })
  return price.id
}

/** Deactivate a Stripe Price (stop new subscriptions but keep existing ones) */
export async function deactivateStripePrice(priceId: string): Promise<void> {
  await stripe.prices.update(priceId, { active: false })
}
