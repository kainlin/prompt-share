import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY!
export const STRIPE_PRICE_LIFETIME = process.env.STRIPE_PRICE_LIFETIME!
