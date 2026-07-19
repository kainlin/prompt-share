# PromptShare MVP 产品规划

**日期:** 2026-07-19  
**状态:** 执行中

---

## 一、两个版本的定位

| | 开源版 (OSS) | SaaS 版 (Cloud) |
|---|---|---|
| **目标用户** | 极客/设计师，自建部署 | 博主/AI 创作者，零代码变现 |
| **数据存储** | 本地 MDX 文件 (Nextra) | PostgreSQL (Supabase) |
| **内容管理** | Git + Decap CMS | Web 端 CMS 后台 |
| **变现** | 无 | Stripe 订阅/买断 |
| **部署** | Vercel 一键 | Vercel + Supabase |
| **路由** | 静态 MDX catch-all | 动态 `/[tenant]/[case]` |

**核心原则：展示组件 100% 复用于两个版本。** SaaS 版只是换了数据层 + 加了付费墙和后台。

---

## 二、项目架构：Monorepo

```
prompt-share/
├── packages/                    # 共享包
│   ├── ui/                      # 组件库 (PromptBlock, ImageGallery, CategoryGrid, CaseHeader, Toast)
│   ├── styles/                  # globals.css + CSS Variables + 滚动条/选区样式
│   └── i18n/                    # dictionaries/ + i18n-config
│
├── apps/
│   ├── oss/                     # 开源版 — 当前项目迁移至此 (Nextra 静态站)
│   └── cloud/                   # SaaS 版 — Next.js App Router 动态应用 (无 Nextra)
│
├── turbo.json                   # Turborepo 编排
└── package.json                 # Root workspace
```

### 技术栈补充

| 层 | OSS | Cloud |
|---|---|---|
| 框架 | Next.js 16 + Nextra 4.6 | Next.js 16 (纯 App Router) |
| 数据库 | 无（MDX 文件） | Supabase PostgreSQL |
| 认证 | 无 | Supabase Auth (email + OAuth) |
| 支付 | 无 | Stripe Checkout + Webhook |
| 图片存储 | Supabase Storage | Supabase Storage (同 bucket，按 tenant 分目录) |
| ORM | 无 | Prisma |
| 样式 | CSS Modules + CSS Variables（两个版本共享） |

---

## 三、MVP 功能清单

### OSS — 开源版（当前已有 + 待补）

- [x] 飞书风格 Wiki 主页 + CategoryGrid 卡片
- [x] 侧边栏分类导航（505 cases）
- [x] Pagefind 全文搜索
- [x] 提示词复制 + Toast
- [x] 图片画廊 + Lightbox + 骨架屏
- [x] 中英双语 i18n 路由
- [ ] **参数化提示词编辑器** — 自动提取 `{argument}` 渲染配置表单
- [ ] **Decap CMS** — `/admin` 网页录入后台
- [ ] **README + Vercel 一键部署徽章**

### Cloud — SaaS MVP（全新）

- [ ] **组件库提取** — 把 UI/Styles/i18n 拆入 `packages/`
- [ ] **Supabase Auth** — 创作者邮箱注册/登录
- [ ] **动态路由** — `/[tenant]/[case]` 替换 Nextra MDX 路由
- [ ] **创作者 CMS** — 增删改查提示词案例 + 图片直传
- [ ] **Stripe 支付** — Checkout Session + Webhook 回调
- [ ] **付费墙 PaywallGuard** — 未订阅锁定复制 + 大图模糊
- [ ] **创作者 Dashboard** — 案例管理 + 付费设置 + 简易数据

---

## 四、关键架构决策

### 4.1 为什么 SaaS 版不能用 Nextra

- Nextra 依赖文件系统 `content/` 目录 + `_meta.ts` 生成路由和侧边栏
- SaaS 版数据来自 PostgreSQL，没有静态 MDX 文件
- Nextra 的 `getPageMap`、`importPage`、`generateStaticParams` 全部走文件系统
- **结论：SaaS 版是纯 Next.js App Router，UI 组件复用但路由/数据层全部自建**

### 4.2 多租户：MVP 用路径路由

```
promptshare.com/@kainlin/case-1    → 博主 kainlin 的子站
promptshare.com/@kainlin           → 博主主页
promptshare.com/dashboard          → 创作者控制台
```

不用子域名 (`kainlin.promptshare.com`)，原因：
- 省去 DNS wildcard + SSL 证书自动化
- Vercel 免费层无子域名限制
- 路径路由足够验证 PMF，后续再切

### 4.3 Stripe 作为唯一支付通道

- Stripe Checkout 处理订阅（月卡）和一次性买断
- Webhook `checkout.session.completed` 写入订阅状态
- 不做分润/打款（MVP 阶段创作者自己注册 Stripe Connect，平台只做内容托管）
- 微信/支付宝：Stripe 有条件支持，通过 Payment Method 扩展

### 4.4 Supabase 统一 Auth + DB + Storage

- 项目已用 Supabase Storage 存图
- Supabase Auth 免费（月活 5 万以下）
- Supabase PostgreSQL 免费（500MB，MVP 够用）
- 一个平台解决认证、数据库、存储，不引入额外服务

---

## 五、数据库 Schema（SaaS 版 Prisma）

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  avatarUrl String?
  tenants   Tenant[]
  createdAt DateTime @default(now())
}

model Tenant {
  id          String       @id @default(uuid())
  slug        String       @unique       // URL: /@slug
  displayName String
  bio         String?
  avatarUrl   String?
  ownerId     String
  owner       User         @relation(fields: [ownerId], references: [id])
  cases       PromptCase[]
  createdAt   DateTime     @default(now())
}

model PromptCase {
  id            String   @id @default(uuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  title         String
  category      String                       // photography | product | people
  tags          String[] @default([])
  emoji         String   @default("📷")
  coverImageUrl String
  images        String[]                     // Supabase 图片 URL 数组
  promptText    String                       // 完整 prompt 文本
  sourcePlatform String?
  sourceAuthor  String?
  published     Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Subscription {
  id              String    @id @default(uuid())
  userId          String
  tenantId        String
  stripeSessionId String    @unique
  stripeCustomerId String?
  status          String    // active | cancelled | expired
  plan            String    // monthly | lifetime
  createdAt       DateTime  @default(now())
  expiresAt       DateTime?
}
```

---

## 六、组件复用设计

### PromptBlock — 复制拦截

```tsx
// packages/ui/prompt-block.tsx  — 开源版，不加付费墙代码
export function PromptBlock({ text, onCopy }) { ... }

// apps/cloud 中包裹一层
<PaywallGuard fallback={<BlurredPrompt text={text} />}>
  <PromptBlock text={text} onCopy={handleCopy} />
</PaywallGuard>
```

### ImageGallery — 大图拦截

```tsx
// 开源版：点击 → 全屏 Lightbox
// SaaS 版：未订阅 → 弹窗引导付费；已订阅 → 正常 Lightbox
<PaywallGuard fallback={<BlurredGallery images={images} />}>
  <ImageGallery images={images} />
</PaywallGuard>
```

### PaywallGuard 组件

```tsx
interface PaywallGuardProps {
  children: ReactNode
  fallback: ReactNode        // 未付费时的替代展示
  tenantId: string
}

// 检查当前用户对该 tenant 的订阅状态
// 已订阅 → 渲染 children
// 未订阅 → 渲染 fallback + 付费弹窗入口
```

---

## 七、MVP 执行路线

### Phase 1: Monorepo 搭建 + 组件提取（P0）

| # | 任务 | 说明 |
|---|------|------|
| 1.1 | 根目录 `package.json` → workspaces | 配置 `packages/*` + `apps/*` |
| 1.2 | `turbo.json` | 基础 Turborepo 编排 |
| 1.3 | 提取 `packages/ui/` | PromptBlock, ImageGallery, CategoryGrid, CaseHeader, Toast, LanguageSwitcher |
| 1.4 | 提取 `packages/styles/` | globals.css + CSS Variables |
| 1.5 | 提取 `packages/i18n/` | dictionaries + i18n-config |
| 1.6 | 迁移 `apps/oss/` | 当前项目移入，指向 packages |
| 1.7 | OSS 端到端验证 | 确保迁移后功能完整 |

### Phase 2: SaaS 核心（P0）

| # | 任务 | 说明 |
|---|------|------|
| 2.1 | `apps/cloud/` 脚手架 | Next.js App Router 项目 |
| 2.2 | Supabase Auth 集成 | 邮箱注册 + 登录 |
| 2.3 | Prisma Schema + Migration | 建表 |
| 2.4 | 动态路由 `/[tenant]/[case]` | 替换 Nextra catch-all |
| 2.5 | 案例展示页 | 复用 UI 包组件 |
| 2.6 | 创作者 CMS CRUD | 案例增删改查 |
| 2.7 | 图片上传 | 直传 Supabase Storage |

### Phase 3: 变现 + 付费墙（P1）

| # | 任务 | 说明 |
|---|------|------|
| 3.1 | Stripe Checkout 集成 | 月卡 + 买断 |
| 3.2 | Webhook 处理 | `checkout.session.completed` → 写 Subscription |
| 3.3 | PaywallGuard 组件 | 复制拦截 + 大图模糊 |
| 3.4 | 订阅状态检查 | Middleware 层 + 组件层双重校验 |

### Phase 4: Dashboard + 打磨（P2）

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | 创作者 Dashboard | 案例列表 + 付费设置 |
| 4.2 | 简易数据分析 | 案例浏览量 + 复制次数 |
| 4.3 | OSS Decap CMS | `/admin` 后台录入 |
| 4.4 | OSS README + Deploy 徽章 | 开源规范 |

---

## 八、相关文档

- 原始路线图：`/Users/linkai/.gemini/antigravity/brain/a09a0aee-d061-496d-b7a9-60f912ae0dcb/product_roadmap.md`
- 设计 Spec：`docs/superpowers/specs/2026-07-17-prompt-share-design.md`
- 项目交接：`CLAUDE.md`
