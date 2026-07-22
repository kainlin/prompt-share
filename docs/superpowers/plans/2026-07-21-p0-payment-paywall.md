# P0: Stripe Connect + Per-Creator Pricing + PaywallGuard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real payment collection via Stripe Connect (platform collects, creators withdraw after KYC), per-creator pricing with guardrails, and multi-modal paywall coverage.

**Architecture:** Platform Stripe account collects all payments. `ps_order` tracks revenue splits. `ps_user` gets Connect fields. `ps_tenant` gets pricing fields. `ps_prompt_case` gets paywall mode + copy rights. Settings page gains pricing UI + Connect onboarding. Subscribe page reads per-tenant pricing. Checkout API creates dynamic Stripe Prices. Webhook creates orders + triggers transfers for trusted users.

**Tech Stack:** Next.js 16 App Router, Prisma + Supabase PostgreSQL, Stripe SDK v17, Better Auth, CSS Modules

**Reference:** stuncreator at `/Users/linkai/home/code/stuncreator` for Connect onboarding + payout patterns

---

## Global Constraints

- All DB tables use `ps_` prefix (`@@map("ps_xxx")` in Prisma)
- `multiSchema` preview feature enabled, all models have `@@schema("public")`
- Pricing in cents (integers), displayed as dollars
- Platform fee: 15%, Payout cooldown: 14 days
- Minimum withdrawal: $1.00 (100 cents)
- Price guardrails: monthly $1.99-$199.99, lifetime $4.99-$999.99, 1 change per 30 days
- Paywall modes: `free`, `prompt_only`, `full_lock`; copy is an independent right
- Stripe SDK on v17, `apiVersion: '2025-02-24.acacia'`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Add fields to User, Tenant, PromptCase; add Order model |
| `lib/stripe.ts` | Modify | Remove STRIPE_PRICE exports, add PLATFORM_PRODUCT_ID, helpers |
| `app/api/stripe/checkout/route.ts` | Modify | Read pricing from ps_tenant, dynamic Price creation |
| `app/api/stripe/webhook/route.ts` | Modify | Add order creation + instant transfer logic |
| `app/api/stripe/connect/route.ts` | Create | Stripe Express account onboarding |
| `app/api/stripe/verify-connection/route.ts` | Create | Check Connect KYC status |
| `app/api/stripe/dashboard/route.ts` | Create | Stripe Express login link |
| `app/api/tenants/route.ts` | Modify | Accept pricing fields on create |
| `app/api/tenants/pricing/route.ts` | Create | Update tenant pricing with guardrails |
| `app/api/earnings/balance/route.ts` | Create | Creator earnings summary |
| `app/api/earnings/withdraw/route.ts` | Create | Manual withdrawal trigger |
| `app/dashboard/settings/page.tsx` | Modify | Add pricing section + Connect status |
| `app/dashboard/page.tsx` | Modify | Add earnings card |
| `app/subscribe/page.tsx` | Modify | Read per-tenant pricing |
| `app/subscribe/stripe-plans.tsx` | Modify | Use dynamic pricing from tenant |
| `components/paywall-guard.tsx` | Modify | Support paywallMode + allowCopy + watermark |
| `app/[tenant]/[caseId]/page.tsx` | Modify | Pass paywallMode to PaywallGuard + ImageGallery |
| `packages/ui/prompt-block.tsx` | Modify | Accept `copyDisabled` prop |
| `app/api/cases/route.ts` | Modify | Accept new paywall/pricing fields |

---

### Task 1: Database Schema — Add all new fields and Order table

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: Prisma types — `User.stripeAccountId`, `User.stripeConnected`, `User.isTrustedUser`, `Tenant.monthlyPrice`, `Tenant.lifetimePrice`, `Tenant.monthlyPriceId`, `Tenant.lifetimePriceId`, `Tenant.priceChangedAt`, `PromptCase.paywallMode`, `PromptCase.allowCopy`, `PromptCase.freePreviewCount`, `PromptCase.watermarkEnabled`, `Order` model (all fields)

- [ ] **Step 1: Add fields to User, Tenant, PromptCase models and new Order model**

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  emailVerified   Boolean   @default(false)
  name            String?
  image           String?
  password        String?
  // Stripe Connect
  stripeAccountId String?   @map("stripe_account_id")
  stripeConnected Boolean   @default(false) @map("stripe_connected")
  isTrustedUser   Boolean   @default(false) @map("is_trusted_user")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  tenants         Tenant[]
  sessions        Session[]
  accounts        Account[]
  orders          Order[]   @relation("BuyerOrders")

  @@map("ps_user")
  @@schema("public")
}

// Add to Tenant model:
model Tenant {
  // ... existing fields ...
  monthlyPrice   Int?       @map("monthlyPrice")
  lifetimePrice  Int?       @map("lifetimePrice")
  monthlyPriceId String?    @map("monthlyPriceId")
  lifetimePriceId String?   @map("lifetimePriceId")
  priceChangedAt DateTime?  @map("priceChangedAt")

  // ... existing @@map / @@schema ...
}

// Add to PromptCase model:
model PromptCase {
  // ... existing fields ...
  paywallMode      String   @default("free") @map("paywallMode")
  allowCopy        Boolean  @default(true)  @map("allowCopy")
  freePreviewCount Int      @default(0)     @map("freePreviewCount")
  watermarkEnabled Boolean  @default(false) @map("watermarkEnabled")

  // ... existing @@unique / @@map / @@schema ...
}

// New model:
model Order {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation("BuyerOrders", fields: [userId], references: [id], onDelete: Cascade)
  tenantId          String
  tenant            Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  stripeSessionId   String    @unique @map("stripeSessionId")
  amountTotal       Int       @map("amountTotal")
  platformFee       Int       @default(0) @map("platformFee")
  creatorRevenue    Int       @default(0) @map("creatorRevenue")
  payoutStatus      String    @default("pending") @map("payoutStatus")
  payoutReadyAt     DateTime? @map("payoutReadyAt")
  creatorTransferId String?   @map("creatorTransferId")
  disputeId         String?   @map("disputeId")
  disputeStatus     String?   @map("disputeStatus")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([creatorRevenue], map: "idx_order_creator_revenue")
  @@map("ps_order")
  @@schema("public")
}
```

- [ ] **Step 2: Generate SQL and apply to database**

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > /tmp/migration.sql
# Run in Supabase SQL Editor
```

- [ ] **Step 3: Regenerate Prisma Client**

```bash
npm -w @prompt-share/cloud run db:generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add Stripe Connect, pricing, paywall, and Order model

User: stripeAccountId, stripeConnected, isTrustedUser
Tenant: monthlyPrice, lifetimePrice, monthlyPriceId, lifetimePriceId, priceChangedAt
PromptCase: paywallMode, allowCopy, freePreviewCount, watermarkEnabled
New: Order table with revenue split + payout tracking"
```

---

### Task 2: Update Stripe Library — Remove global Price constants, add helpers

**Files:**
- Modify: `lib/stripe.ts`

**Interfaces:**
- Consumes: New schema fields from Task 1
- Produces: `stripe` client (unchanged), `PLATFORM_PRODUCT_ID` constant, `PLATFORM_FEE_PCT` constant, `PAYOUT_COOLDOWN_DAYS` constant, `PRICING_GUARDRAILS` object, `calculateSplit()` function

- [ ] **Step 1: Rewrite `lib/stripe.ts`**

```typescript
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
```

- [ ] **Step 2: Add `STRIPE_PRODUCT_ID` to `.env.local`**

```bash
# .env.local — add:
STRIPE_PRODUCT_ID=prod_xxxxx
```

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts
git commit -m "refactor(stripe): replace global Price constants with per-tenant helpers"
```

---

### Task 3: Per-Tenant Pricing API — `/api/tenants/pricing`

**Files:**
- Create: `app/api/tenants/pricing/route.ts`

**Interfaces:**
- Consumes: `lib/stripe.ts` (stripe, PRICING_GUARDRAILS, createStripePrice, deactivateStripePrice, PLATFORM_PRODUCT_ID), `lib/auth.ts` (auth), `lib/db.ts` (db)
- Produces: `PUT /api/tenants/pricing` — accepts `{ tenantId, monthlyPrice?, lifetimePrice? }`, returns `{ monthlyPriceId, lifetimePriceId }`

- [ ] **Step 1: Create `app/api/tenants/pricing/route.ts`**

```typescript
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
    const nowDate = new Date()

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
      updates.priceChangedAt = nowDate
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --project apps/cloud/tsconfig.json --noEmit 2>&1 | grep -v '.next/' | grep -v '__tests__'
```
Expected: no output (no errors in app code).

- [ ] **Step 3: Commit**

```bash
git add app/api/tenants/pricing/route.ts
git commit -m "feat(api): per-tenant pricing with Stripe Price creation + guardrails"
```

---

### Task 4: Update Checkout API — Dynamic pricing from ps_tenant

**Files:**
- Modify: `app/api/stripe/checkout/route.ts`

**Interfaces:**
- Consumes: `lib/stripe.ts` (stripe), `lib/auth.ts` (auth), `lib/db.ts` (db)
- Produces: `POST /api/stripe/checkout` — accepts `{ tenantId, plan }`, reads `tenant.monthlyPriceId` or `tenant.lifetimePriceId`, creates Checkout Session with `payment_intent_data.application_fee_amount`

- [ ] **Step 1: Rewrite `app/api/stripe/checkout/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, calculateSplit } from '@/lib/stripe'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId, plan = 'monthly' } = await request.json()

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const priceId = plan === 'lifetime' ? tenant.lifetimePriceId : tenant.monthlyPriceId

    if (!priceId) {
      return NextResponse.json({
        error: `This creator hasn't set up a ${plan} plan yet.`,
      }, { status: 400 })
    }

    const origin = request.headers.get('origin') || ''

    // Retrieve the Price to get unit_amount for split calculation
    const price = await stripe.prices.retrieve(priceId)
    const { platformFeeCents, creatorRevenueCents } = calculateSplit(price.unit_amount!)

    const stripeSession = await stripe.checkout.sessions.create({
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      payment_intent_data: !!(plan === 'lifetime') ? {
        application_fee_amount: platformFeeCents,
        metadata: { tenantId, userId: session.user.id, plan, creatorRevenue: creatorRevenueCents.toString() },
      } : undefined,
      subscription_data: plan === 'monthly' ? {
        metadata: { tenantId, userId: session.user.id, plan, creatorRevenue: creatorRevenueCents.toString() },
      } : undefined,
      metadata: {
        tenantId,
        userId: session.user.id,
        plan,
        platformFee: platformFeeCents.toString(),
        creatorRevenue: creatorRevenueCents.toString(),
      },
      success_url: `${origin}/@${tenant.slug}?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/@${tenant.slug}?cancelled=true`,
    })

    return NextResponse.json({ url: stripeSession.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/stripe/checkout/route.ts
git commit -m "feat(checkout): dynamic pricing from ps_tenant — per-creator Stripe Prices"
```

---

### Task 5: Stripe Webhook — Order creation + revenue split

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `lib/stripe.ts` (stripe, calculateSplit, PAYOUT_COOLDOWN_DAYS), `lib/db.ts` (db)
- Produces: `POST /api/stripe/webhook` — handles `checkout.session.completed`, creates `ps_order` with split, attempts instant transfer for trusted users

- [ ] **Step 1: Rewrite `app/api/stripe/webhook/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { stripe, calculateSplit, PAYOUT_COOLDOWN_DAYS } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // ── checkout.session.completed ──────────────────────
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const { tenantId, userId, plan, platformFee, creatorRevenue } = s.metadata || {}

    if (tenantId && userId && creatorRevenue) {
      const amountTotal = s.amount_total || 0
      const fee = parseInt(platformFee || '0', 10)
      const rev = parseInt(creatorRevenue || '0', 10)

      // Create subscription record (existing logic)
      await db.subscription.upsert({
        where: { stripeSessionId: s.id },
        update: { status: 'active' },
        create: {
          userId,
          tenantId,
          stripeSessionId: s.id,
          stripeSubscriptionId: (s.subscription as string) || null,
          stripeCustomerId: s.customer as string,
          status: 'active',
          plan: plan || 'monthly',
        },
      })

      // Create order record for revenue tracking
      const payoutReadyAt = new Date(Date.now() + PAYOUT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
      await db.order.create({
        data: {
          userId,
          tenantId,
          stripeSessionId: s.id,
          amountTotal,
          platformFee: fee,
          creatorRevenue: rev,
          payoutStatus: 'pending',
          payoutReadyAt,
        },
      })

      // Instant transfer for trusted users with Connect account
      const user = await db.user.findUnique({ where: { id: userId } })
      if (user?.isTrustedUser && user?.stripeAccountId && user?.stripeConnected) {
        try {
          const paymentIntentId = (s.payment_intent as string) || ''
          if (paymentIntentId) {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
            const chargeId = pi.latest_charge as string
            if (chargeId) {
              const transfer = await stripe.transfers.create({
                amount: rev,
                currency: 'usd',
                destination: user.stripeAccountId,
                source_transaction: chargeId,
                metadata: { orderSessionId: s.id },
              })
              await db.order.update({
                where: { stripeSessionId: s.id },
                data: {
                  payoutStatus: 'paid',
                  creatorTransferId: transfer.id,
                },
              })
            }
          }
        } catch {
          // Transfer failed — stays 'pending' for manual withdrawal
          console.warn(`Instant transfer failed for order ${s.id}`)
        }
      }
    }
  }

  // ── customer.subscription.deleted ──────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id, status: 'active' },
      data: { status: 'expired', expiresAt: new Date() },
    })
  }

  // ── charge.dispute.created ─────────────────────────
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute
    await db.order.updateMany({
      where: { stripeSessionId: dispute.id },
      data: { payoutStatus: 'disputed', disputeId: dispute.id, disputeStatus: dispute.status },
    })
  }

  // ── charge.dispute.closed ──────────────────────────
  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    const newStatus = dispute.status === 'won' ? 'pending' : 'disputed'
    await db.order.updateMany({
      where: { stripeSessionId: dispute.id },
      data: { payoutStatus: newStatus, disputeStatus: dispute.status },
    })
  }

  return NextResponse.json({ received: true })
}

export const dynamic = 'force-dynamic'
```

- [ ] **Step 2: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat(webhook): Stripe Connect order tracking + instant transfer for trusted users"
```

---

### Task 6: Stripe Connect Onboarding — 3 API routes

**Files:**
- Create: `app/api/stripe/connect/route.ts`
- Create: `app/api/stripe/verify-connection/route.ts`
- Create: `app/api/stripe/dashboard/route.ts`

**Interfaces:**
- Consumes: `lib/stripe.ts` (stripe), `lib/auth.ts` (auth), `lib/db.ts` (db)
- Produces: `POST /api/stripe/connect` → `{ url }`, `POST /api/stripe/verify-connection` → `{ connected }`, `POST /api/stripe/dashboard` → `{ url }`

- [ ] **Step 1: Create `app/api/stripe/connect/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let accountId = session.user.stripeAccountId as string | null

    // Fetch fresh user data if not on session
    if (!accountId) {
      const user = await db.user.findUnique({ where: { id: session.user.id } })
      accountId = user?.stripeAccountId || null
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: session.user.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '5815',
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
        },
        metadata: { userId: session.user.id },
      })
      accountId = account.id
      await db.user.update({
        where: { id: session.user.id },
        data: { stripeAccountId: accountId },
      })
    }

    const origin = request.headers.get('origin') || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001')
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/settings?stripe_refresh=true`,
      return_url: `${origin}/dashboard/settings?stripe_connected=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/stripe/verify-connection/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.stripeAccountId) {
      return NextResponse.json({ connected: false })
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId)
    const connected = account.details_submitted === true

    if (connected && !user.stripeConnected) {
      await db.user.update({
        where: { id: user.id },
        data: { stripeConnected: true },
      })
    }

    return NextResponse.json({ connected })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
```

- [ ] **Step 3: Create `app/api/stripe/dashboard/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.stripeAccountId || !user?.stripeConnected) {
      return NextResponse.json({ error: 'Stripe account not connected' }, { status: 400 })
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId)
    return NextResponse.json({ url: loginLink.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/stripe/connect/route.ts app/api/stripe/verify-connection/route.ts app/api/stripe/dashboard/route.ts
git commit -m "feat(stripe): Connect onboarding — Express account + verify + dashboard"
```

---

### Task 7: Earnings API — Balance + Withdraw

**Files:**
- Create: `app/api/earnings/balance/route.ts`
- Create: `app/api/earnings/withdraw/route.ts`

- [ ] **Step 1: Create `app/api/earnings/balance/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { MIN_WITHDRAWAL_CENTS } from '@/lib/stripe'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()

    const [pendingOrders, availableOrders] = await Promise.all([
      db.order.aggregate({
        where: { creatorRevenue: { gt: 0 }, payoutStatus: 'pending', payoutReadyAt: { gt: now } },
        _sum: { creatorRevenue: true },
      }),
      db.order.aggregate({
        where: { creatorRevenue: { gt: 0 }, payoutStatus: 'pending', payoutReadyAt: { lte: now } },
        _sum: { creatorRevenue: true },
      }),
    ])

    const pendingAmount = pendingOrders._sum.creatorRevenue || 0
    const availableAmount = availableOrders._sum.creatorRevenue || 0
    const canWithdraw = availableAmount >= MIN_WITHDRAWAL_CENTS

    return NextResponse.json({
      pendingAmount,
      availableAmount,
      minWithdrawal: MIN_WITHDRAWAL_CENTS,
      canWithdraw,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/earnings/withdraw/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe, MIN_WITHDRAWAL_CENTS } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.stripeAccountId || !user?.stripeConnected) {
      return NextResponse.json({
        error: 'Please connect and verify your Stripe account first',
      }, { status: 400 })
    }

    const now = new Date()
    const availableOrders = await db.order.findMany({
      where: {
        creatorRevenue: { gt: 0 },
        payoutStatus: 'pending',
        payoutReadyAt: { lte: now },
      },
    })

    const total = availableOrders.reduce((sum, o) => sum + o.creatorRevenue, 0)
    if (total < MIN_WITHDRAWAL_CENTS) {
      return NextResponse.json({
        error: `Minimum withdrawal is $${(MIN_WITHDRAWAL_CENTS / 100).toFixed(2)}`,
      }, { status: 400 })
    }

    const transfer = await stripe.transfers.create({
      amount: total,
      currency: 'usd',
      destination: user.stripeAccountId,
      metadata: { userId: user.id },
    })

    for (const order of availableOrders) {
      await db.order.update({
        where: { id: order.id },
        data: { payoutStatus: 'paid', creatorTransferId: transfer.id },
      })
    }

    return NextResponse.json({
      success: true,
      amount: total,
      orderCount: availableOrders.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/earnings/balance/route.ts app/api/earnings/withdraw/route.ts
git commit -m "feat(earnings): creator balance + manual withdrawal with minimum threshold"
```

---

### Task 8: Settings Page — Pricing UI + Connect Onboarding

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Add pricing section and Connect status to Settings page**

The Settings page currently shows tenant list + create form. Add:
- Connect Stripe button (calls `/api/stripe/connect` on click)
- Verify connection status on page load (calls `/api/stripe/verify-connection`)
- Pricing inputs (monthly/lifetime) that POST to `/api/tenants/pricing`
- 30-day frequency guard (disable inputs + show next-available date)

Keep it as a server component that hydrates Connect status from `user.stripeAccountId` + `user.stripeConnected`. Pricing form can be a `'use client'` section.

Key UI states:
```
Not connected → "Start Selling — Link Stripe when you want to withdraw."
                [Connect Stripe Account] button

Connected → ✅ Stripe Connected · acct_xxx
            [Manage Stripe Dashboard] button

Pricing → Monthly: $[input] /mo  ·  Lifetime: $[input] one-time
          [Save Pricing] — disabled if changed < 30 days ago
          "Next price change available: YYYY-MM-DD"
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat(settings): pricing UI + Stripe Connect onboarding"
```

---

### Task 9: Dashboard Home — Earnings card

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add a simple earnings summary card**

Fetch `/api/earnings/balance` on mount. Show two numbers:
```
💰 可提现余额      $X.XX
⏳ 待入账余额      $X.XX
```

Keep it minimal — a small card in the dashboard grid, styled with existing CSS Modules.

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): earnings balance card"
```

---

### Task 10: Subscribe Page — Dynamic per-tenant pricing

**Files:**
- Modify: `app/subscribe/page.tsx`
- Modify: `app/subscribe/stripe-plans.tsx`

- [ ] **Step 1: Update `stripe-plans.tsx` to accept dynamic pricing**

```typescript
interface StripePlansProps {
  tenantId: string
  monthlyPrice?: number | null    // cents
  lifetimePrice?: number | null   // cents
}
```

Card labels show actual price from tenant or fallback "Not configured yet".

- [ ] **Step 2: Update `subscribe/page.tsx` to read tenant pricing**

```typescript
const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
// Pass monthlyPrice, lifetimePrice to StripePlans
```

- [ ] **Step 3: Commit**

```bash
git add app/subscribe/page.tsx app/subscribe/stripe-plans.tsx
git commit -m "feat(subscribe): dynamic per-tenant pricing in plan cards"
```

---

### Task 11: PaywallGuard — Multi-mode + copy rights + watermark

**Files:**
- Modify: `components/paywall-guard.tsx`
- Modify: `packages/ui/prompt-block.tsx`

**Interfaces:**
- Consumes: paywallMode, allowCopy, freePreviewCount, watermarkEnabled from PromptCase
- Produces: Conditional blur/lock/watermark per mode, copy button disabled state

- [ ] **Step 1: Extend `PaywallGuard` props**

```typescript
interface PaywallGuardProps {
  children: ReactNode
  isSubscribed: boolean
  tenantId: string
  paywallMode: 'free' | 'prompt_only' | 'full_lock'
  allowCopy?: boolean
  freePreviewCount?: number
  watermarkText?: string
}
```

Mode logic:
- `free` → render children normally
- `prompt_only` → children visible, pass `copyDisabled={!isSubscribed}` to PromptBlock
- `full_lock` → blur overlay + watermark + no copy

- [ ] **Step 2: Add `copyDisabled` prop to `PromptBlock`**

```typescript
// packages/ui/prompt-block.tsx
interface PromptBlockProps {
  // ... existing props
  copyDisabled?: boolean
}
```

When `copyDisabled` is true:
- Copy button rendered but `disabled` + greyed out
- Hover tooltip: "Subscribe to copy"
- Click handler returns early

- [ ] **Step 3: Update case detail page to pass new props**

```typescript
// [tenant]/[caseId]/page.tsx
<PaywallGuard
  isSubscribed={isSubscribed}
  tenantId={tenant.id}
  paywallMode={promptCase.paywallMode as 'free' | 'prompt_only' | 'full_lock'}
  allowCopy={promptCase.allowCopy}
  freePreviewCount={promptCase.freePreviewCount}
  watermarkText={promptCase.watermarkEnabled ? tenant.displayName : undefined}
>
```

- [ ] **Step 4: Update New/Edit case forms with paywall mode selector**

Add paywall mode radio/button group in `new-case-form.tsx` and `edit/page.tsx`:
- 🆓 Free
- 👁️ Prompt Only (images visible, prompt locked)
- 🔒 Full Lock (all locked + watermark)

Plus toggle checkboxes: "Allow Copy for Subscribers", "Enable Watermark".

- [ ] **Step 5: Update API to accept new fields**

```typescript
// app/api/cases/route.ts — POST body already destructures preview fields,
// add: paywallMode, allowCopy, freePreviewCount, watermarkEnabled
```

- [ ] **Step 6: Commit**

```bash
git add components/paywall-guard.tsx packages/ui/prompt-block.tsx app/\[tenant\]/\[caseId\]/page.tsx app/dashboard/cases/new/new-case-form.tsx app/dashboard/cases/\[id\]/edit/page.tsx app/api/cases/route.ts app/api/cases/\[id\]/route.ts
git commit -m "feat(paywall): multi-mode paywall — free/prompt_only/full_lock + copy rights + watermark"
```

---

### Task 12: End-to-End Smoke Test

- [ ] **Step 1: Create tenant + set pricing**

```bash
# Login, create store "test-store", set $4.99/month + $19.99 lifetime
curl -X POST /api/tenants/pricing ... (verify 200)
```

- [ ] **Step 2: Create cases in each paywall mode**

```bash
# POST /api/cases with paywallMode=free (verify 201)
# POST /api/cases with paywallMode=prompt_only (verify 201)
# POST /api/cases with paywallMode=full_lock (verify 201)
```

- [ ] **Step 3: Subscribe via Stripe Checkout (test mode)**

```bash
# POST /api/stripe/checkout → follow URL → complete with test card 4242...
# Verify ps_subscription + ps_order created
```

- [ ] **Step 4: Verify PaywallGuard behavior**

```bash
# Unauthenticated: free → full visible, prompt_only → text locked, full_lock → all locked
# Subscribed: all modes → full visible + copyable
```

- [ ] **Step 5: Test Connect onboarding (test mode)**

```bash
# POST /api/stripe/connect → follow URL → complete test onboarding (skip KYC)
# POST /api/stripe/verify-connection → { connected: true }
```

- [ ] **Step 6: Test earnings + withdrawal**

```bash
# GET /api/earnings/balance → { pendingAmount, availableAmount }
# POST /api/earnings/withdraw → { success: true }
```

- [ ] **Step 7: Commit everything if tests pass**

```bash
git add -A && git commit -m "test: end-to-end smoke test passes for P0 payment + paywall"
```

---

## Verification

After all tasks are complete, run:

```bash
npm -w @prompt-share/cloud run build   # zero errors
npm -w @prompt-share/cloud run test    # all tests pass
npm -w @prompt-share/cloud run dev     # http://localhost:3001 responsive
```

Expected smoke test flow:
1. Register → login → create store → set $4.99/mo pricing
2. Create cases in free / prompt_only / full_lock modes
3. Open storefront → verify levels visible/locked per mode
4. Subscribe via Stripe test → verify unlock
5. Connect Stripe → verify onboarding → withdraw earnings
