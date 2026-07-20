# PromptShare Cloud — 部署配置清单

> 最后更新：2026-07-20（Auth 已从 Supabase Auth 迁移到 Better Auth）

---

## 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                    PromptShare Cloud                         │
│  apps/cloud/  (Next.js 16 App Router, npm workspace)         │
│                                                              │
│  Auth:     Better Auth (email + password, 直连 PostgreSQL)    │
│  Database: Supabase PostgreSQL (via Prisma ORM)              │
│  Storage:  Supabase Storage (prompt-images bucket)           │
│  Payments: Stripe Checkout + Webhook                         │
│  Upload:   /api/upload → Supabase Storage (service_role)     │
└──────────────────────────────────────────────────────────────┘
```

### Auth 机制 (Better Auth)

| 原来 (Supabase Auth) | 现在 (Better Auth) |
|---|---|
| Magic Link 登录 | 邮箱 + 密码注册/登录 |
| `supabase.auth.getUser()` | `auth.api.getSession()` |
| `apps/cloud/lib/supabase/server.ts` | `apps/cloud/lib/auth.ts` |
| `apps/cloud/lib/supabase/client.ts` | `apps/cloud/lib/auth-client.ts` |
| `/api/auth/callback` + `/api/auth/signout` | `/api/auth/[...all]` (catch-all) |
| `@supabase/ssr` 依赖 | `better-auth` 依赖 |

Better Auth 直连 PostgreSQL，不依赖 Supabase Auth 服务。用户密码哈希存储在 `User.password` 字段，Session 由 `Session` 表管理。

---

## 🔴 必须配置的环境变量

部署到生产环境时，需要在 Vercel Dashboard（或你用的平台）中设置以下全部变量：

### 1. Supabase（PostgreSQL + Storage）

| 变量 | 用途 | 从哪里获取 |
|------|------|-----------|
| `DATABASE_URL` | Prisma ORM 连接 Supabase PostgreSQL | Supabase Dashboard → Database → Connection String → **Session pooler** (端口 6543) |
| `DIRECT_URL` | Prisma 迁移时的直连 | Supabase Dashboard → Database → Connection String → **Direct connection** (端口 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | 构建 Storage 公开 URL + upload API 服务端客户端 | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/upload` 使用 admin 权限上传文件到 Storage | Supabase Dashboard → Settings → API → `service_role` key |

> **注意**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` 不再需要。Better Auth 直连 PG，不调用 Supabase API。

#### `DATABASE_URL` vs `DIRECT_URL` 说明

```
# Session Pooler（用于 Prisma Client — 应用运行时）
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection（用于 Prisma Migrate — 迁移脚本）
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

Supabase 的 PgBouncer 在端口 6543，建议用 Session Pooler 作为 Prisma 运行时的连接串（配合 `pgbouncer=true`）。迁移时用直连端口 5432。

### 2. Stripe（支付）

| 变量 | 用途 | 从哪里获取 |
|------|------|-----------|
| `STRIPE_SECRET_KEY` | 创建 Checkout Session | [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys) → `sk_live_...` 或 `sk_test_...` |
| `STRIPE_PRICE_MONTHLY` | 月付订阅 Price ID | Stripe Dashboard → Products → 创建 Monthly 产品后获取 |
| `STRIPE_PRICE_LIFETIME` | 一次性买断 Price ID | Stripe Dashboard → Products → 创建 Lifetime 产品后获取 |
| `STRIPE_WEBHOOK_SECRET` | 验证 Webhook 签名 | **部署后**注册 Webhook 获取 |

### 3. 应用配置

| 变量 | 用途 | 示例值 |
|------|------|--------|
| `NEXT_PUBLIC_APP_URL` | Better Auth 的 trustedOrigins + 客户端 baseURL | `https://cloud.promptshare.app` 或 Vercel 分配的域名 |

---

## 🔴 预部署步骤（部署前必须完成）

### 1. 在 Supabase Dashboard 创建 Storage Bucket（如果还没有）

```
Dashboard → Storage → New Bucket
  Name: prompt-images
  Public bucket: ✅ ON
```

### 2. 创建 Stripe 产品和价格

1. [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products?create=true)
2. 创建 **两个** Product：

| Product | Mode | 建议价格 |
|---------|------|---------|
| PromptShare Monthly | Recurring → Subscription (monthly) | $9.99/mo |
| PromptShare Lifetime | One-time payment | $49.99 |

3. 获取每个 Product 的 **Price ID** (`price_...`)，填入环境变量。

### 3. 运行 Prisma 数据库迁移

确保 `DATABASE_URL` 已正确配置后：

```bash
# 生成 Prisma Client（每次 schema.prisma 变更后需要）
npm -w @prompt-share/cloud run db:generate

# 推送 schema 到数据库（快速，开发阶段推荐）
npm -w @prompt-share/cloud run db:push

# 或 生成迁移文件（正式环境推荐）
npm -w @prompt-share/cloud run db:migrate
```

Prisma Schema 当前包含 7 个表：
- `User` — 用户（含 `password` 字段用于 Better Auth）
- `Session` — Better Auth 会话
- `Account` — Better Auth 第三方 OAuth（预留给 Google/GitHub 登录扩展）
- `Verification` — Better Auth 邮箱验证
- `Tenant` — 创作者店铺（slug 用作 URL 子路径）
- `PromptCase` — 提示词案例
- `Subscription` — Stripe 订阅记录

---

## 🟡 部署到 Vercel

项目是 **npm workspaces monorepo**，cloud app 位于 `apps/cloud/`。

### Vercel Dashboard 设置

| 设置项 | 值 |
|--------|-----|
| **Framework** | Next.js |
| **Root Directory** | `apps/cloud` |
| **Build Command** | `cd ../.. && npm install && npm -w @prompt-share/cloud run build` |
| **Output Directory** | `apps/cloud/.next` |
| **Install Command** | `npm install` |

> 或者创建 `apps/cloud/vercel.json`（见下方模板）。

### `apps/cloud/vercel.json` (可选)

```json
{
  "buildCommand": "cd ../.. && npm -w @prompt-share/cloud run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 环境变量

将上面列出的所有环境变量添加到 Vercel Dashboard → Settings → Environment Variables。注意区分：

- `NEXT_PUBLIC_*` 变量会自动暴露给客户端
- 其他变量仅服务端可用

---

## 🟡 Stripe Webhook 注册（部署后立即执行）

1. [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint:
   - **URL**: `https://your-domain.vercel.app/api/stripe/webhook`
   - **Events to listen for**:
     - `checkout.session.completed`
     - `customer.subscription.deleted`
3. 创建后将 **Signing Secret** (`whsec_...`) 填入 `STRIPE_WEBHOOK_SECRET` 环境变量
4. 重新部署使 Webhook Secret 生效

---

## 🔴 环境变量对照速查

### 所有部署环境变量（一次复制）

```bash
# ─── Supabase ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://wvzqfmvehnfdxjqcjjbb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # service_role key

# PostgreSQL (Supabase)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# ─── Stripe ────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_LIFETIME=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── App ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 本地开发 `.env.local`

本地用 Supabase 的测试数据库 + Stripe Test Mode：

```bash
# 从 Supabase Dashboard 复制
NEXT_PUBLIC_SUPABASE_URL=https://wvzqfmvehnfdxjqcjjbb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# PostgreSQL
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# Stripe Test Mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_LIFETIME=price_...
STRIPE_WEBHOOK_SECRET=whsec_...  # 本地用 Stripe CLI 转发

NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## 📋 部署前自检清单

```
□ Supabase Dashboard → Storage → prompt-images bucket 已创建（public）
□ Supabase Dashboard → Database → 连接字符串已复制
□ Supabase Dashboard → API → NEXT_PUBLIC_SUPABASE_URL 已记录
□ Supabase Dashboard → API → SUPABASE_SERVICE_ROLE_KEY 已记录
□ DATABASE_URL 和 DIRECT_URL 已填入真实连接串（非 [YOUR-PASSWORD]）
□ Stripe Dashboard → Products → Monthly + Lifetime 产品已创建
□ Stripe Dashboard → Products → 两个 Price ID 已记录
□ Prisma db:generate + db:push 已执行成功
□ Vercel 项目已创建，Root Directory = apps/cloud
□ 所有环境变量已添加到 Vercel Dashboard
□ 部署成功，无构建错误
□ Stripe Webhook 已注册（URL = /api/stripe/webhook）
□ STRIPE_WEBHOOK_SECRET 已填入并重新部署
□ 测试：注册新账号 → 创建 Tenant → 创建 Case → 上传图片 → Stripe 支付
□ 测试：公开页面 /@tenant-slug 正常展示
□ 测试：未登录访问 /dashboard 被重定向到 /login
```

---

## 🟢 可选优化（后续迭代）

| 项目 | 说明 |
|------|------|
| CI/CD (GitHub Actions) | 当前无 `.github/workflows/`，建议加 PR test + Vercel deploy hook |
| `.env.example` | 创建 `apps/cloud/.env.example` 作为文档模板 |
| Supabase Auth 禁用 | 既然迁移到 Better Auth，可在 Supabase Dashboard → Authentication → Settings 中关闭 Auth 服务 |
| 错误监控 | 集成 Sentry / Logtail |
| OG Image | 案例详情页动态生成社交分享卡片 |
| API Rate Limiting | `/api/stripe/webhook` 和 `/api/cases` 需要 rate limit |
| Health Check | 添加 `/api/health` 端点返回 DB + Storage 连通状态 |
