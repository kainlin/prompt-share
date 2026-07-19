# PromptShare — 测试策略设计文档

**日期:** 2026-07-20
**状态:** 执行中

---

## 一、决策总结

| 决策 | 选择 | 理由 |
|------|------|------|
| 测试框架 | Vitest | Next.js 16 原生 Vite/Turbopack 生态，ESM 原生支持，配置量少 |
| 组件测试 | @testing-library/react + jsdom | React 19 兼容，鼓励按用户行为测试 |
| API 测试 | Vitest 直接 import handler | 不需要启动 dev server，mock 在 setup 层统一 |
| 外部依赖 mock | vi.mock + MSW (按需) | Stripe/Supabase/Prisma 需要统一 mock |
| 文件组织 | 混合模式 | 组件并排、API 集中在 `__tests__/` |

---

## 二、文件组织

```
packages/ui/
├── prompt-block.tsx
├── prompt-block.test.tsx          ← 组件测试（并排）
├── image-gallery.tsx
├── image-gallery.test.tsx
├── category-grid.tsx
├── category-grid.test.tsx
├── case-header.tsx
├── case-header.test.tsx
├── toast.tsx + toast.test.tsx
├── providers.tsx + providers.test.tsx
├── language-switcher.tsx + language-switcher.test.tsx
├── lib/
│   ├── supabase-url.ts + supabase-url.test.ts
│   └── constants.ts + constants.test.ts

apps/cloud/
├── __tests__/
│   ├── setup.ts                   ← Vitest setup + 全局 mock
│   ├── api/
│   │   ├── cases.test.ts
│   │   ├── cases-id.test.ts
│   │   ├── stripe-checkout.test.ts
│   │   ├── stripe-webhook.test.ts
│   │   ├── auth-callback.test.ts
│   │   └── auth-signout.test.ts
│   ├── middleware.test.ts
│   └── lib/
│       └── stripe.test.ts         ← Stripe lib 逻辑测试
├── vitest.config.ts               ← Cloud 专项 vitest 配置
└── package.json                   ← test 脚本

packages/ui/
├── vitest.config.ts               ← UI 专项 vitest 配置
└── package.json                   ← test 脚本
```

---

## 三、测试范围

### 3.1 packages/ui — 组件测试

| 被测对象 | 测试用例 | 优先级 |
|----------|---------|--------|
| **PromptBlock** | | |
| | 渲染纯文本（无 argument） | P0 |
| | 提取 `{argument}` 并渲染表单控件 | P0 |
| | 修改参数 → 预览文本实时更新 | P0 |
| | 一键复制按钮 → 剪贴板写入 | P0 |
| | 无 `children` 不崩溃 | P1 |
| | 自定义 `emoji` / `label` 生效 | P1 |
| | 包含转义引号的 argument 正确解析 | P1 |
| **ImageGallery** | | |
| | 渲染缩略图网格 | P0 |
| | `getThumbnailUrl` 映射 `caseN_full.jpg` → `caseN_thumb.webp` | P0 |
| | 点击缩略图 → Lightbox 打开 | P0 |
| | ESC 关闭 Lightbox | P0 |
| | 左右箭头切换图片 | P0 |
| | 单图不显示切换按钮 | P1 |
| | 空数组不渲染 | P1 |
| **CategoryGrid** | | |
| | 中文渲染 3 个分类卡片（摄影/产品/人物） | P0 |
| | 英文渲染 3 个分类卡片 | P0 |
| | 点击卡片跳转到 `/{lang}/{category}` | P1 |
| **CaseHeader** | | |
| | 渲染 emoji + title | P0 |
| | 渲染 tags（string / string[] 兼容） | P0 |
| | 渲染 source 信息 | P0 |
| | 缺少 source 不崩溃 | P1 |
| | 缺少 emoji 不崩溃 | P1 |
| **Toast / Providers** | | |
| | ToastProvider 包裹子组件 | P1 |
| | useToast 触发 → toast 出现 → 自动消失 | P1 |
| **LanguageSwitcher** | | |
| | 当前语言高亮 | P1 |

### 3.2 packages/ui — 工具函数

| 被测函数 | 测试用例 |
|----------|---------|
| `getThumbnailUrl` | `case1_full.jpg` → `thumbnails/case1_thumb.webp` |
| | `case100_full.png` → `thumbnails/case100_thumb.webp` |
| | 已经是 `case1_thumb.webp` → 不变 |
| | 无匹配 → 保持原文件名 |
| `getFullImageUrl` | 正确拼接 `full/` 前缀 |
| `getImageUrl` | 正确拼接基础路径 |
| `getCategory('photography')` | 返回对应分类对象 |
| `getCategory('invalid')` | 返回 null |

### 3.3 apps/cloud — API 路由测试

| API | 测试场景 |
|-----|---------|
| **POST /api/cases** | 创建成功返回 201 |
| | 缺少 Authorization → 401 |
| | tenantId 不属于当前用户 → 403 |
| | 缺少 title → 400 |
| **GET /api/cases** | 查询列表成功 |
| | 缺少 tenantId → 400 |
| **GET /api/cases/[id]** | 查询单条成功 |
| | 记录不存在 → 404 |
| **PUT /api/cases/[id]** | 编辑成功 |
| | 非 owner → 403 |
| **DELETE /api/cases/[id]** | 删除成功 |
| | 非 owner → 403 |
| **POST /api/stripe/checkout** | 月卡创建 session 返回 URL |
| | 买断创建 session 返回 URL |
| | 未登录 → 401 |
| | tenant 不存在 → 404 |
| **POST /api/stripe/webhook** | `checkout.session.completed` → 写 Subscription |
| | `customer.subscription.deleted` → 过期 Subscription |
| | 签名校验失败 → 400 |
| **POST /api/auth/callback** | code 交换 → 重定向 |
| | 无 code → 重定向到 login |
| **Middleware** | `/dashboard/*` 未登录 → 重定向 /login |
| | `/login` 公开访问 |
| | `/_next/static/*` 放行 |

### 3.4 跳过不测的

- `apps/cloud/lib/db.ts` — Prisma 单例，无需测试
- `apps/cloud/lib/supabase/client.ts` — Supabase createBrowserClient 工厂
- `apps/cloud/lib/supabase/server.ts` — Supabase createServerClient 工厂
- Prisma schema 本身 — 由类型系统保证

---

## 四、Mock 策略

### 组件测试 — 全局 mock

```ts
// packages/ui/vitest.setup.ts
// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ lang: 'zh' }),
}))
```

### API 测试 — 全局 mock

```ts
// apps/cloud/__tests__/setup.ts
// Mock Prisma
vi.mock('@/lib/db', () => ({ db: mockDeep<PrismaClient>() }))
// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))
// Mock Stripe
vi.mock('@/lib/stripe', () => ({ stripe, STRIPE_PRICE_MONTHLY: 'price_xxx', ... }))
```

### Stripe Webhook — 特殊处理

Webhook handler 需要 `request.text()` 获取原始 body（Stripe 签名校验需要 raw body）。Vitest 测试中直接构造 `Request` 对象传入：

```ts
const body = JSON.stringify({ type: 'checkout.session.completed', ... })
const req = new Request('http://localhost/api/stripe/webhook', {
  method: 'POST',
  body,
  headers: { 'stripe-signature': 'test_sig' },
})
```

---

## 五、配置

### vitest.config.ts

```ts
// packages/ui/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})

// apps/cloud/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
  },
  resolve: {
    alias: { '@': __dirname },
  },
})
```

### package.json scripts

```json
// packages/ui/package.json
"scripts": { "test": "vitest run", "test:watch": "vitest" }

// apps/cloud/package.json
"scripts": { "test": "vitest run", "test:watch": "vitest" }

// Root package.json
"scripts": {
  "test": "npm -w @prompt-share/ui run test && npm -w @prompt-share/cloud run test",
  "test:ui": "npm -w @prompt-share/ui run test",
  "test:cloud": "npm -w @prompt-share/cloud run test"
}
```

---

## 六、实施估算

| 层 | 测试数量（预估） | 预计耗时 |
|----|-----------------|---------|
| packages/ui 组件 | ~35 条 | 主要区域 |
| packages/ui 工具函数 | ~15 条 | 快速 |
| apps/cloud API | ~30 条 | 主要区域 |
| Middleware | ~5 条 | 快速 |
| **合计** | **~85 条** | |

---

## 七、相关文档

- 产品规划: `docs/promptshare-mvp-plan.md`
- 工作 Review: `docs/promptshare-mvp-review.md`
- 原始设计 Spec: `docs/superpowers/specs/2026-07-17-prompt-share-design.md`
