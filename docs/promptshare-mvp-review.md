# PromptShare MVP — 工作 Review 文档

**日期:** 2026-07-19  
**Review 范围:** Monorepo 拆分 + OSS 修复 + SaaS MVP 搭建

---

## 一、项目背景

PromptShare 是一个飞书文档风格的 AI 图像提示词分享站。原始项目基于 Nextra 4.6.0 + Next.js 16.0.7 构建，包含 514 个案例（摄影、产品、人物三分类），支持中英双语。

本次工作的目标：将项目拆分为**开源版 (OSS)** 和 **SaaS 云服务版 (Cloud)** 的双版本 Monorepo 架构，源代码 100% 复用 UI 组件。

---

## 二、整体架构决策

### 2.1 Monorepo 结构

```
prompt-share/
├── packages/                    # 共享包（npm workspaces）
│   ├── styles/                  # globals.css + CSS Variables
│   ├── i18n/                    # dictionaries + i18n-config
│   └── ui/                      # 7 个组件 + lib
├── apps/cloud/                  # SaaS 版（Next.js + Supabase + Stripe）
└── (root)                       # OSS 版（Nextra 静态站）
```

**选型理由:**
- OSS 用 Nextra 做静态 MDX 路由，Cloud 用纯 Next.js App Router 做动态路由
- UI 组件通过 `@prompt-share/ui` 包引用，两端完全复用
- npm workspaces 而非 Turborepo（MVP 阶段避免额外复杂度）

### 2.2 为什么 SaaS 版不用 Nextra

| | OSS | Cloud |
|---|---|---|
| 内容引擎 | Nextra (MDX filesystem) | Next.js App Router |
| 数据来源 | `content/` MDX 文件 | PostgreSQL (Prisma) |
| 路由方式 | `getPageMap` + `importPage` | `[tenant]/[caseId]` 动态路由 |
| 侧边栏 | Nextra `_meta.ts` 生成 | 自建组件 |
| MDX 渲染 | Nextra wrapper + MDX providers | 无需（PromptBlock 直接用文本） |

Nextra 的 `getPageMap()`、`_meta.ts`、`importPage()` 全部依赖文件系统，无法对接数据库。Cloud 版提取了 OSS 的 UI 组件，但路由和数据层全部自建。

### 2.3 多租户策略：路径路由

```
promptshare.com/@kainlin/case-1    → 博主子站
promptshare.com/dashboard          → 创作者后台
```

**不做子域名的理由:**
- MVP 阶段子域名需要 DNS wildcard + SSL 自动化
- Vercel 免费层对子域名有限制
- 路径路由足够验证 PMF

### 2.4 支付：只用 Stripe

| 功能 | Stripe 方案 |
|------|------------|
| 月卡订阅 | Stripe Billing + Checkout Session |
| 一次性买断 | Checkout Session (mode: payment) |
| 回调处理 | Webhook `checkout.session.completed` |
| 订阅管理 | Stripe Customer Portal + API 查询 |

无中间层（不用 LemonSqueezy），原因：已有 Stripe MCP 工具链，MVP 阶段税务合规非刚需，手续费更低。

### 2.5 基础设施统一用 Supabase

| 层 | 方案 |
|---|---|
| 认证 | Supabase Auth (magic link) |
| 数据库 | Supabase PostgreSQL |
| 存储 | Supabase Storage（复用现有 bucket） |
| ORM | Prisma |

一个平台解决 Auth + DB + Storage，免费层满足 MVP（500MB DB，5 万月活）。

---

## 三、已完成的代码工作

### 3.1 Bug 修复（OSS 版）

| 问题 | 根因 | 修复 | 提交 |
|------|------|------|------|
| `/` 根路径 404 | Next.js 16 不再自动 i18n 重定向 | 新增 `app/page.tsx` → `redirect('/zh')` | `65d2f6a` |
| `/en` 页面样式丢失 | Nextra 4.6 `useFSRoute` 剥离了 `/en` locale 前缀 | `next.config.ts` 添加 `unstable_shouldAddLocaleToLinks: true` | `65d2f6a` |
| 全站图片 404 | `getThumbnailUrl("case1_full.jpg")` → `thumbnails/case1_full.jpg` (不存在)，实际文件名为 `case1_thumb.webp` | 添加 `toThumbnailFilename()` 映射 `caseN_full.ext` → `caseN_thumb.webp` | `4887d7c` |
| `_meta.ts` index 定义不规范 | `type: 'page'` 会导致 Nextra 404 | 简化为 `index: '首页'` / `index: 'Home'` | `65d2f6a` |
| Dictionary 类型不兼容 | `Dictionary extends typeof en` 缺少 DeepStringify | 添加 `DeepStringify<T>` 泛型 | `65d2f6a` |

### 3.2 Monorepo 拆分（Phase 1）

**`packages/styles/`**
- 从 `app/[lang]/globals.css` 提取飞书风格 CSS Variables + 滚动条 + 选区样式
- 导出路径: `@prompt-share/styles/globals.css`

**`packages/i18n/`**
- 从 `dictionaries/` 提取 `en.ts`, `zh.ts`, `i18n-config.ts`, `get-dictionary.ts`
- 移除 `server-only` 依赖（Cloud 版需要客户端访问）
- 导出路径: `@prompt-share/i18n`

**`packages/ui/`**
- 7 个组件: `PromptBlock`, `ImageGallery`, `CategoryGrid`, `CaseHeader`, `Toast`, `Providers`, `LanguageSwitcher`
- `lib/supabase-url.ts` — URL 构建函数（剥离 Supabase 客户端依赖）
- `lib/constants.ts` — 分类定义 + 站点配置
- 导出路径: `@prompt-share/ui`

**根 `package.json`**
- 添加 `workspaces: ["packages/*", "apps/*"]`
- OSS 版添加 `@prompt-share/*` 依赖
- `next.config.ts` 添加 `transpilePackages`

### 3.3 SaaS MVP（apps/cloud/）— 25 个文件

#### 数据库 Schema (Prisma)

| 模型 | 字段 | 说明 |
|------|------|------|
| `User` | id, email, name, avatarUrl | Supabase Auth 同步 |
| `Tenant` | id, slug (唯一), displayName, ownerId | 博主子站 |
| `PromptCase` | id, tenantId, title, slug, category, promptText, images[] | 提示词案例 |
| `Subscription` | id, userId, tenantId, stripeSessionId, status, plan, expiresAt | 粉丝订阅 |

`PromptCase` 使用 `@@unique([tenantId, slug])` 保证同一博主下案例不重名。

#### 路由设计

```
/                                    Landing page
/login                               Magic link 登录
/@kainlin                            Tenant 主页 (CategoryGrid + 案例列表)
/@kainlin/case-slug                  Case 详情页 (CaseHeader + ImageGallery + PromptBlock)
/dashboard                           创作者后台首页
/dashboard/cases                     案例管理列表
/dashboard/settings                  Store + Stripe 配置
/api/auth/callback                   Supabase Auth 回调
/api/cases                           CRUD API
/api/stripe/checkout                 Stripe Checkout Session 创建
/api/stripe/webhook                  Stripe Webhook 处理
```

#### 核心业务逻辑

**Middleware：** 保护 `/dashboard/*` 路径，未登录重定向到 `/login`

**PaywallGuard：** 未订阅时渲染磨砂玻璃遮罩，已订阅则正常展示
```tsx
<PaywallGuard isSubscribed={subscribed} tenantId={t.id}>
  <PromptBlock text={prompt} />
</PaywallGuard>
```
- 开源版组件不感知付费墙（完全不改动）
- SaaS 版在外层注入拦截逻辑

**Stripe 流程：**
1. 粉丝点击「Subscribe Now」→ POST `/api/stripe/checkout` → 返回 Stripe Checkout URL
2. 粉丝在 Stripe 页面完成支付 → Stripe 回调 `/api/stripe/webhook`
3. Webhook 写入 `Subscription` 表 → 粉丝立即获得访问权限

---

## 四、功能覆盖对比

| 功能 | OSS | Cloud | 复用方式 |
|------|-----|-------|---------|
| 分类卡片网格 | ✅ CategoryGrid | ✅ 同一组件 | `@prompt-share/ui` |
| 提示词展示+复制 | ✅ PromptBlock | ✅ + 付费墙包裹 | `@prompt-share/ui` |
| 图片画廊+Lightbox | ✅ ImageGallery | ✅ | `@prompt-share/ui` |
| 案例头部 | ✅ CaseHeader | ✅ | `@prompt-share/ui` |
| Toast 提示 | ✅ Toast | ✅ | `@prompt-share/ui` |
| 飞书风格 UI | ✅ globals.css | ✅ | `@prompt-share/styles` |
| 中英双语 | ✅ i18n routing | 🔲 待接入 | `@prompt-share/i18n` |
| 全文搜索 | ✅ Pagefind | 🔲 待实现 | - |
| 内容管理 | Decap CMS | Web 端 CRUD | - |
| 用户认证 | - | ✅ Supabase Auth | - |
| 付费墙 | - | ✅ PaywallGuard | - |
| 支付 | - | ✅ Stripe Checkout | - |
| 多租户 | - | ✅ `/[tenant]` 路由 | - |
| 数据看板 | - | 🔲 待实现 | - |

---

## 四-B. Review 发现 Bug 及修复记录

本次 verification review 发现 3 个真实 Bug，均已修复：

### BUG 1 🔴 PromptBlock props 不匹配（阻止渲染）

| 项 | 内容 |
|---|---|
| **严重度** | Critical — 提示词完全不渲染 |
| **文件** | `apps/cloud/app/[tenant]/[caseId]/page.tsx` |
| **问题** | `<PromptBlock emoji="💬" text={...} />` 传入 `text` prop |
| **根因** | 组件接口是 `children: string`，需用 JSX children 语法传内容 |
| **修复** | 改为 `<PromptBlock emoji="💬">{promptCase.promptText}</PromptBlock>` |

### BUG 2 🟠 CategoryGrid props 不匹配（数据错误）

| 项 | 内容 |
|---|---|
| **严重度** | High — Cloud 租户页显示硬编码 OSS 数据 |
| **文件** | `apps/cloud/app/[tenant]/page.tsx` |
| **问题** | `<CategoryGrid categories={...} />` 传入动态数据 |
| **根因** | CategoryGrid 组件接受 0 个 props，内部硬编码分类（309/140/65），`categories` prop 被忽略 |
| **修复** | 替换为内联分类卡片 JSX，使用租户真实案例数 |

### BUG 3 🟡 Stripe Webhook 取消订阅永不生效

| 项 | 内容 |
|---|---|
| **严重度** | Medium — 用户取消订阅后 DB 永不过期 |
| **文件** | `apps/cloud/app/api/stripe/webhook/route.ts` |
| **问题** | `customer.subscription.deleted` handler 查找 `subscription.metadata?.stripeSessionId` |
| **根因** | Checkout Session metadata 只包含 `{tenantId, userId, plan}`，不含 `stripeSessionId`。且 Stripe 不会将 Session metadata 自动传给 Subscription。 |
| **修复** | (1) `Subscription` 模型新增 `stripeSubscriptionId` 字段，(2) `checkout.session.completed` handler 保存 `session.subscription` (Stripe Subscription ID)，(3) `customer.subscription.deleted` handler 直接通过 `subscription.id` 匹配 DB 记录 |

### 文档勘误

| 项 | 修正前 | 修正后 |
|---|---|---|
| Commit hash | `ed9bbaa` (import 514 cases) | `a587a1c` |

---

## 五、待完成工作

### 高优先级

1. **Supabase PostgreSQL 配置** — 在 Supabase Dashboard 创建数据库，获取连接字符串填 `DATABASE_URL`
2. **Prisma 初始化** — `cd apps/cloud && npx prisma db push` 建表
3. **Stripe Products 创建** — 在 Stripe Dashboard 创建月卡和买断 Product，填 Price ID
4. **Supabase Auth 配置** — 在 Supabase Dashboard 开启 Email OTP，配置 redirect URL

### 中优先级

5. **Cloud 版 i18n** — 接入 `@prompt-share/i18n`，实现中英双语
6. **Cloud 版 Pagefind** — 动态站点的全文搜索方案
7. **OSS Decap CMS** — 网页端录入后台
8. **OSS README** — 一键部署徽章 + 配置指引

### 低优先级

9. **创作者数据看板** — 浏览量、复制次数、订阅转化
10. **图片上传优化** — 直传 Supabase Storage + 进度条
11. **移动端适配** — 侧边栏和 Lightbox 优化

---

## 六、关键技术要点

### 6.1 Nextra 4.6.0 版本锁死
不能升级到 4.6.1，有 `Invalid input: expected nonoptional` 错误。

### 6.2 Next.js 16 App Router params
`params` 是 Promise 类型，必须 `await` 后才能访问属性。

### 6.3 Next.js i18n 与 App Router 冲突
`next.config.ts` 中的 `i18n` 字段曾被禁用导致 500。Nextra 通过 `parseInt` 处理 `NEXTRA_LOCALES` 环境变量，去掉会导致 getPageMap 失败。

### 6.4 组件包无 Supabase 客户端依赖
`packages/ui/lib/supabase-url.ts` 只包含 URL 构建函数。原始的 Supabase `createClient` 调用保留在 OSS 的 `lib/supabase.ts` 和 Cloud 的 `lib/supabase/` 中。

### 6.5 NPM Workspace 引用
```json
"dependencies": {
  "@prompt-share/ui": "*",
  "@prompt-share/styles": "*",
  "@prompt-share/i18n": "*"
}
```
`*` 表示使用本地 workspace 版本，npm install 自动软链接。

---

## 七、相关文件

| 文件 | 说明 |
|------|------|
| `docs/promptshare-mvp-plan.md` | 完整产品规划 |
| `docs/superpowers/specs/2026-07-17-prompt-share-design.md` | 原始设计 Spec |
| `CLAUDE.md` | 项目交接文档 |
| `/Users/linkai/.gemini/antigravity/brain/a09a0aee-d061-496d-b7a9-60f912ae0dcb/product_roadmap.md` | 原始产品路线图 |

---

## 八、Commit 记录

| Commit | 说明 |
|--------|------|
| `65d2f6a` | fix: root redirect + EN layout + i18n config |
| `4887d7c` | fix: thumbnail filename mapping |
| `291754f` | feat: CategoryGrid + UI polish |
| `04e3264` | chore: next-env.d.ts update |
| `d070bb5` | chore: image-gallery CSS tweak |
| `a587a1c` | feat: import 514 cases |
| `11b3e51` | feat: monorepo — extract shared packages |
| `93f599a` | feat: SaaS MVP — apps/cloud |
