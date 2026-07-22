import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe, PLATFORM_PRODUCT_ID, PRICING_GUARDRAILS, createStripePrice, deactivateStripePrice } from '@/lib/stripe'

async function getSession() {
  return await auth.api.getSession({ headers: await headers() })
}

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId, monthlyPrice, lifetimePrice } = await request.json()

    // Validate tenant ownership
    const tenant = await db.tenant.findFirst({
      where: { id: tenantId, ownerId: session.user.id },
    })
    if (!tenant) return NextResponse.json({ error: 'Not your tenant' }, { status: 403 })

    // Guardrail: price change frequency
    const now = new Date()
    if (tenant.priceChangedAt) {
      const daysSince = (now.getTime() - tenant.priceChangedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < PRICING_GUARDRAILS.maxPriceChangesPerDays) {
        return NextResponse.json({
          error: `Price can only be changed once every ${PRICING_GUARDRAILS.maxPriceChangesPerDays} days`,
        }, { status: 429 })
      }
    }

    const updates: Record<string, any> = {}

    // Handle monthly price
    if (monthlyPrice !== undefined) {
      if (monthlyPrice < PRICING_GUARDRAILS.monthly.min || monthlyPrice > PRICING_GUARDRAILS.monthly.max) {
        return NextResponse.json({
          error: `Monthly price must be between ${(PRICING_GUARDRAILS.monthly.min / 100).toFixed(2)} and ${(PRICING_GUARDRAILS.monthly.max / 100).toFixed(2)}`,
        }, { status: 400 })
      }
      const newPriceId = await createStripePrice({
        productId: PLATFORM_PRODUCT_ID,
        unitAmount: monthlyPrice,
        recurring: true,
        metadata: { tenantId, plan: 'monthly' },
      })
      if (tenant.monthlyPriceId) {
        await deactivateStripePrice(tenant.monthlyPriceId)
      }
      updates.monthlyPrice = monthlyPrice
      updates.monthlyPriceId = newPriceId
    }

    // Handle lifetime price
    if (lifetimePrice !== undefined) {
      if (lifetimePrice < PRICING_GUARDRAILS.lifetime.min || lifetimePrice > PRICING_GUARDRAILS.lifetime.max) {
        return NextResponse.json({
          error: `Lifetime price must be between ${(PRICING_GUARDRAILS.lifetime.min / 100).toFixed(2)} and ${(PRICING_GUARDRAILS.lifetime.max / 100).toFixed(2)}`,
        }, { status: 400 })
      }
      const newPriceId = await createStripePrice({
        productId: PLATFORM_PRODUCT_ID,
        unitAmount: lifetimePrice,
        recurring: false,
        metadata: { tenantId, plan: 'lifetime' },
      })
      if (tenant.lifetimePriceId) {
        await deactivateStripePrice(tenant.lifetimePriceId)
      }
      updates.lifetimePrice = lifetimePrice
      updates.lifetimePriceId = newPriceId
    }

    // Only update priceChangedAt if prices actually changed
    if (Object.keys(updates).length > 0) {
      updates.priceChangedAt = new Date()
    }

    const updated = await db.tenant.update({
      where: { id: tenantId },
      data: updates,
    })

    return NextResponse.json({
      monthlyPriceId: updated.monthlyPriceId,
      lifetimePriceId: updated.lifetimePriceId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
