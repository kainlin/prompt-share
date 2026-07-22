-- ============================================================
-- PromptShare Cloud — Full Database Schema (v1)
-- Run in: https://supabase.com/dashboard/project/wvzqfmvehnfdxjqcjjbb/sql/new
-- Or: psql $DATABASE_URL -f migrations/0001_initial_schema.sql
-- ============================================================

-- 1. ps_user — Better Auth user + Stripe Connect fields
CREATE TABLE IF NOT EXISTS ps_user (
  id                 TEXT PRIMARY KEY,
  email              TEXT UNIQUE NOT NULL,
  email_verified     BOOLEAN DEFAULT false,
  name               TEXT,
  image              TEXT,
  password           TEXT,
  stripe_account_id  TEXT,
  stripe_connected   BOOLEAN DEFAULT false,
  is_trusted_user    BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- 2. ps_session — Better Auth sessions
CREATE TABLE IF NOT EXISTS ps_session (
  id         TEXT PRIMARY KEY,
  token      TEXT UNIQUE NOT NULL,
  user_id    TEXT NOT NULL REFERENCES ps_user(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ps_account — Better Auth OAuth accounts
CREATE TABLE IF NOT EXISTS ps_account (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES ps_user(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  account_id  TEXT NOT NULL,
  password    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, account_id)
);

-- 4. ps_verification — Better Auth email verification
CREATE TABLE IF NOT EXISTS ps_verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ps_tenant — Creator stores
CREATE TABLE IF NOT EXISTS ps_tenant (
  id                TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  bio               TEXT,
  avatar_url        TEXT,
  owner_id          TEXT NOT NULL REFERENCES ps_user(id) ON DELETE CASCADE,
  monthly_price     INT,
  lifetime_price    INT,
  monthly_price_id  TEXT,
  lifetime_price_id TEXT,
  price_changed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 6. ps_prompt_case — Individual prompt cases
CREATE TABLE IF NOT EXISTS ps_prompt_case (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES ps_tenant(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  category          TEXT DEFAULT 'photography',
  tags              TEXT[] DEFAULT '{}',
  emoji             TEXT DEFAULT '📷',
  cover_image_url   TEXT NOT NULL DEFAULT '',
  images            TEXT[] DEFAULT '{}',
  prompt_text       TEXT NOT NULL,
  source_platform   TEXT,
  source_author     TEXT,
  preview_type      TEXT DEFAULT 'image',
  preview_source    TEXT,
  preview_poster    TEXT,
  published         BOOLEAN DEFAULT true,
  paywall_mode      TEXT DEFAULT 'free',
  allow_copy        BOOLEAN DEFAULT true,
  free_preview_count INT DEFAULT 0,
  watermark_enabled BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- 7. ps_subscription — Consumer subscriptions
CREATE TABLE IF NOT EXISTS ps_subscription (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL,
  tenant_id               TEXT NOT NULL REFERENCES ps_tenant(id) ON DELETE CASCADE,
  stripe_session_id       TEXT UNIQUE NOT NULL,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_customer_id      TEXT,
  status                  TEXT DEFAULT 'active',
  plan                    TEXT DEFAULT 'monthly',
  created_at              TIMESTAMPTZ DEFAULT now(),
  expires_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscription_user_tenant ON ps_subscription(user_id, tenant_id);

-- 8. ps_order — Revenue tracking
CREATE TABLE IF NOT EXISTS ps_order (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES ps_user(id) ON DELETE CASCADE,
  tenant_id           TEXT NOT NULL REFERENCES ps_tenant(id) ON DELETE CASCADE,
  stripe_session_id   TEXT UNIQUE NOT NULL,
  amount_total        INT NOT NULL,
  platform_fee        INT DEFAULT 0,
  creator_revenue     INT DEFAULT 0,
  payout_status       TEXT DEFAULT 'pending',
  payout_ready_at     TIMESTAMPTZ,
  creator_transfer_id TEXT,
  dispute_id          TEXT,
  dispute_status      TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_creator_revenue ON ps_order(creator_revenue);
CREATE INDEX IF NOT EXISTS idx_order_user_id       ON ps_order(user_id);
CREATE INDEX IF NOT EXISTS idx_order_tenant_id     ON ps_order(tenant_id);
