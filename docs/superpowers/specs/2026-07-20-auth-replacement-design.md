# SaaS Auth 替换 — Supabase Auth → Better Auth

**日期:** 2026-07-20
**状态:** 设计中

---

## 一、决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Auth 框架 | Better Auth | 零外部依赖的 email+password，Prisma 原生集成，API 极简 |
| 登录方式 | 邮箱 + 密码 | MVP 不需要 SMTP/Resend，配好 DATABASE_URL 就能本地跑 |
| Session 传输 | httpOnly cookie（Better Auth 内置） | 安全，无需手动管理 |
| Supabase 保留范围 | PostgreSQL + Storage bucket | 仅数据库和文件托管，Auth 服务完全不用 |

---

## 二、改动文件清单（18 个）

### 新增

| 文件 | 说明 |
|------|------|
| `lib/auth.ts` | Better Auth 实例 + Prisma adapter |
| `lib/auth-client.ts` | 客户端 authClient（用于 login form） |
| `app/api/auth/[...all]/route.ts` | Better Auth 内置路由 handler |
| `__tests__/setup-auth.ts` | Auth 测试 mock 工具 |

### 修改

| 文件 | 改动 |
|------|------|
| `prisma/schema.prisma` | 已有 `User` 表扩展字段；新增 `Session`、`Account`、`Verification` 表 |
| `middleware.ts` | `createServerClient(@supabase/ssr)` → Better Auth middleware |
| `app/layout.tsx` | 无需改动（Better Auth cookie 由 middleware 处理） |
| `app/login/login-form.tsx` | `supabase.auth.signInWithOtp` → `authClient.signIn.email()` |
| `app/api/auth/callback/route.ts` | **删除** — Better Auth handler 替代 |
| `app/api/auth/signout/route.ts` | **删除** — Better Auth handler 替代 |
| `app/api/upload/route.ts` | `supabase.auth.getUser()` → `auth.api.getSession()` |
| `app/api/cases/route.ts` | 同上 |
| `app/api/cases/[id]/route.ts` | 同上 |
| `app/api/stripe/checkout/route.ts` | 同上 |
| `app/api/tenants/route.ts` | 同上 |
| `app/dashboard/layout.tsx` | 同上 |
| `app/dashboard/page.tsx` | 同上 |
| `app/dashboard/cases/page.tsx` | 同上 |
| `app/dashboard/settings/page.tsx` | 同上 |
| `app/[tenant]/[caseId]/page.tsx` | 同上 |
| `app/subscribe/page.tsx` | 同上 |

### 可删除

| 文件 | 原因 |
|------|------|
| `lib/supabase/server.ts` | 不再需要 Supabase server client |
| `lib/supabase/client.ts` | 不再需要 Supabase browser client |
| `@supabase/ssr` 依赖 | 从 package.json 移除 |

### 保留

| 文件 | 原因 |
|------|------|
| `lib/supabase-url.ts`（在 `packages/ui/lib/`） | URL 拼接，不依赖 supabase-js |
| `@supabase/supabase-js` 依赖 | 仅 `api/upload/route.ts` 的 Storage 上传需要 |

---

## 三、Prisma Schema 变更

当前 `User` 表新增 `emailVerified`、`password` 字段。Better Auth 需要三张新表：

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?               // Better Auth 默认字段名
  password      String?               // credentials 插件存储 bcrypt hash
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  tenants       Tenant[]
  sessions      Session[]             // Better Auth 关联
  accounts      Account[]             // Better Auth 关联
}

model Session {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider  String
  accountId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Better Auth 自动管理 `user`、`session`、`account` 表。`Tenant`、`PromptCase`、`Subscription` 不变。

---

## 四、核心代码变更

### 4.1 `lib/auth.ts` — Auth 实例（新增）

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from './db'

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
})
```

### 4.2 `app/api/auth/[...all]/route.ts` — Handler（新增）

```ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

这一个文件替代了 `api/auth/callback` 和 `api/auth/signout`。

### 4.3 Middleware 变更

```ts
// 改前
import { createServerClient } from '@supabase/ssr'
const supabase = createServerClient(...)
const { data: { user } } = await supabase.auth.getUser()

// 改后
import { auth } from '@/lib/auth'
const session = await auth.api.getSession({
  headers: request.headers,
})
```

### 4.4 所有 getUser() 替换

```ts
// 改前（18 处）
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// 改后
import { auth } from '@/lib/auth'
const session = await auth.api.getSession({
  headers: await headers(),  // Server Component 中
})
const userId = session?.user.id
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### 4.5 Login form 变更

```tsx
// 改前
const { error } = await supabase.auth.signInWithOtp({ email, options: {...} })

// 改后
import { authClient } from '@/lib/auth-client'
const { error } = await authClient.signIn.email({
  email,
  password,
  callbackURL: redirect,
})
```

---

## 五、env 变更

```diff
# 可删除 — Better Auth 不需要 Supabase Auth API
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
- SUPABASE_SERVICE_ROLE_KEY=   （仍用于 storage upload）

# 保留不变
+ NEXT_PUBLIC_SUPABASE_URL=    （storage URL 拼接）
+ DATABASE_URL=                （Prisma + Better Auth）
+ DIRECT_URL=                  （Prisma migrations）
+ STRIPE_*                     （支付）
+ NEXT_PUBLIC_APP_URL=         （callback URL）
```

---

## 六、测试策略

### 影响的测试文件

| 文件 | 改动 |
|------|------|
| `__tests__/setup.ts` | 移除 `supabase-js` 和 `@supabase/ssr` mock → 添加 Better Auth mock |
| `__tests__/api/cases.test.ts` | `mockGetUser` → `mockGetSession` |
| `__tests__/api/cases-id.test.ts` | 同上 |
| `__tests__/api/stripe-checkout.test.ts` | 同上 |
| `__tests__/api/stripe-webhook.test.ts` | 不需要 auth（webhook 有签名校验） |
| `__tests__/api/upload.test.ts` | 同上 |
| `__tests__/api/auth-callback.test.ts` | **删除** — 不再有自定义 callback |
| `__tests__/middleware.test.ts` | mock 从 supabase → Better Auth |
| `__tests__/lib/stripe.test.ts` | 不变 |

### 新增测试

| 文件 | 内容 |
|------|------|
| `__tests__/auth/login.test.ts` | 登录成功 → 返回 session / 密码错误 → 401 / 未注册邮箱 → 401 |
| `__tests__/auth/register.test.ts` | 注册成功 → User 写入 / 重复邮箱 → 409 |

---

## 七、迁移步骤

1. `npm install better-auth` + `npm uninstall @supabase/ssr`
2. 更新 `prisma/schema.prisma` → `prisma db push`
3. 新增 `lib/auth.ts` + `lib/auth-client.ts` + `app/api/auth/[...all]/route.ts`
4. 替换 18 处 `getUser()` → `getSession()` + 删除 `lib/supabase/server.ts` + `client.ts`
5. 删除 `api/auth/callback` 和 `api/auth/signout`
6. 更新 `middleware.ts`
7. 更新 `login-form.tsx`
8. 更新所有测试 mock + 新增 auth 测试
9. 运行全量测试确保 158+ tests pass
10. 本地启动验证

---

## 八、相关文档

- 测试策略: `docs/superpowers/specs/2026-07-20-test-strategy-design.md`
- MVP 规划: `docs/promptshare-mvp-plan.md`
