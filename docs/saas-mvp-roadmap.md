# PromptShare Cloud — SaaS MVP 功能强化路线图

> 基于 2026-07-21 全面代码审计，从商业闭环角度规划 MVP 冲刺顺序

---

## 当前状态诊断

### 能用的

| 模块 | 状态 |
|------|------|
| 注册/登录 | Better Auth email+password，注册表单 + 登录表单可用 |
| 店铺管理 | 创建 Tenant（slug + displayName），一个用户可拥有多个店铺 |
| 案例 CRUD | 新建/编辑/删除案例，支持多模态预览（image/video/web） |
| 图片上传 | `/api/upload` → Supabase Storage，客户端预览 + URL fallback |
| 公开店铺 | `/@slug` 店铺首页 + 分类卡片 + `/@slug/case-slug` 案例详情 |
| 付费墙 UI | PaywallGuard 模糊 PromptBlock，CTA 引导订阅 |
| Stripe 骨架 | Checkout Session 创建 + Webhook 处理，但用的 `sk_test_` |
| i18n | zh/en 双语，cookie-based locale，侧边栏和店铺页已接入 |

### 断了 / 残了

| 问题 | 严重程度 |
|------|:---:|
| Stripe 环境变量全是占位符（`sk_test_`、`price_`、`whsec_`），不能真收钱 | 🔴 |
| PaywallGuard 只挡了 PromptBlock 文本，ImageGallery/VideoPlayer/IframeSandbox 对未订阅用户完全裸露 | 🔴 |
| 无 rate limiting — login、upload、Stripe webhook 均无防护 | 🔴 |
| 无 OG metadata — 所有页面无法被社交平台/搜索引擎正确索引 | 🔴 |
| 无邮箱验证 / 密码重置 — 注册无需验证邮箱 | 🟡 |
| 客户无自助取消订阅入口（Stripe Customer Portal 未集成） | 🟡 |
| 搜索为纯客户端 `title.includes()`，不随案例增长扩展 | 🟡 |
| 侧边栏无移动端折叠逻辑，店铺首页在手机上无法浏览 | 🟡 |
| 无删除 Tenant 功能 | 🟢 |
| Category filter（`?cat=photography`）未在店铺首页接线 | 🟢 |
| 案例删除为硬删除，无可恢复机制 | 🟢 |

---

## 冲刺优先级

```
P0 ─ 商业闭环 + 能安全上线 ................ 本周
P1 ─ 用户自助 + 基础可用 .................. 下周
P2 ─ 创作者工具体验 ...................... 有创作者后
P3 ─ 消费者发现体验 ...................... 有流量后
```

---

## P0：商业闭环 + 安全上线（本周）

### 1. Stripe 真实支付闭环

- [ ] **配置真实 Stripe 密钥**：将 `STRIPE_SECRET_KEY`、`STRIPE_PRICE_MONTHLY`、`STRIPE_PRICE_LIFETIME`、`STRIPE_WEBHOOK_SECRET` 填入生产值
- [ ] **创建 Stripe Products**：Monthly（$9.99/mo subscription）和 Lifetime（$49.99 one-time payment）
- [ ] **验证 Webhook**：部署后在 Stripe Dashboard 注册 `https://<domain>/api/stripe/webhook`，验证 `checkout.session.completed` 和 `customer.subscription.deleted` 事件能正确写入 `ps_subscription`
- [ ] **订阅后状态即时刷新**：支付成功后重定向回店铺页，`checkSubscription()` 能立即读到 active 状态

### 2. PaywallGuard 全覆盖

- [ ] **ImageGallery 受保护**：未订阅用户看到模糊缩略图 + 锁定浮层（复用现有 PaywallGuard 组件）
- [ ] **VideoPlayer 受保护**：未订阅用户看到模糊封面/第一帧 + 锁定浮层
- [ ] **IframeSandbox 受保护**：未订阅用户看到加载骨架 + 锁定浮层，不加载实际 iframe
- [ ] **可配置免费预览策略**：每个案例可设置 `freePreview` 字段（如 "前 3 张图免费" 或 "首张图免费"），店主在新建/编辑案例时可选

### 3. Rate Limiting

- [ ] **登录接口限频**：`/api/auth/sign-in/email` — 同一 IP 每分钟最多 10 次，超限返回 429
- [ ] **注册接口限频**：`/api/auth/sign-up/email` — 同一 IP 每小时最多 5 次
- [ ] **上传接口限频**：`/api/upload` — 同一用户每小时最多 50 次
- [ ] **Stripe Webhook 不限频**：webhook 路由加入白名单
- [ ] **实现方式**：`next-rate-limiter` 或基于 Redis/Memory 的滑动窗口中间件

### 4. SEO / Social Metadata

- [ ] **店铺首页 OG**：动态 `generateMetadata` — title 取 `{tenant.displayName} - PromptShare`，og:image 取 `tenant.avatarUrl`
- [ ] **案例详情页 OG**：title 取 `{case.title} - {tenant.displayName}`，og:image 取 `case.coverImageUrl`，og:description 取 prompt 前 200 字符
- [ ] **Landing page OG**：`/` 首页静态 metadata
- [ ] **Twitter Card 支持**：`summary_large_image`
- [ ] **Canonical URL**：店铺页和案例页加 `<link rel="canonical">`

### 5. 环境变量启动校验

- [ ] **`instrumentation.ts` 或预检查脚本**：启动时检查所有必需环境变量是否存在
  - `DATABASE_URL`、`DIRECT_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_MONTHLY`、`STRIPE_PRICE_LIFETIME`
  - `NEXT_PUBLIC_APP_URL`
- [ ] 缺失时在控制台输出清晰的错误信息而非运行时崩溃

---

## P1：用户自助 + 基础可用（下周）

### 6. Stripe Customer Portal

- [ ] **订阅管理页面**：已订阅用户在 `/subscribe` 页面看到当前计划信息 + "Manage Subscription" 按钮
- [ ] **Portal Session API**：`/api/stripe/portal` 创建 Stripe Customer Portal Session（需要 `stripeCustomerId`）
- [ ] **取消/续订**：用户在 Portal 中可取消订阅，webhook 收到 `customer.subscription.deleted` 后标记过期
- [ ] **升级方案**：Portal 中支持从 Monthly 升到 Lifetime

### 7. 邮箱验证 + 密码重置

- [ ] **邮箱验证**：注册后发送验证邮件（Better Auth 内置，配置 Resend 或 SMTP provider）
- [ ] **密码重置流程**：登录页 "Forgot password?" → 输入邮箱 → 重置链接 → 新密码
- [ ] **验证状态提示**：Dashboard 顶部对未验证邮箱显示黄色提醒条

### 8. 移动端适配

- [ ] **Dashboard 侧边栏折叠**：移动端隐藏侧边栏，汉堡菜单按钮控制显示
- [ ] **店铺首页响应式**：分类卡片 `grid-template-columns` 在小屏自动切换为 2 列或 1 列
- [ ] **案例详情页**：`ImageGallery` / `VideoPlayer` / `IframeSandbox` 在小屏全宽
- [ ] **案例管理列表**：表格改为卡片式布局
- [ ] **新建/编辑案例表单**：两列布局在小屏改为单列

### 9. 完善店铺首页

- [ ] **Category filter 接线**：`?cat=photography` → 店铺首页下方只展示该分类的案例
- [ ] **案例网格**：店铺首页增加案例缩略图网格（类似 OSS 版的 CategoryGrid）
- [ ] **搜索服务端化**：`/api/tenants/[slug]/cases/search?q=` → PostgreSQL `ILIKE` 或 `tsvector`

### 10. 基础 Landing Page

- [ ] **`/` 首页改造**：当前仅显示 "PromptShare Cloud — AI Prompt Monetization"，改为包含 Hero section + Feature 卡片 + CTA 的产品首页
- [ ] **定价页**：`/subscribe` 页面可在无 tenant 参数时展示公开定价
- [ ] **Footer**：Terms of Service、Privacy Policy 链接

---

## P2：创作者工具体验（有创作者后）

### 11. 案例分析面板

- [ ] **Tracker 表**：`ps_case_analytics`（caseId, event: view/copy/subscribe, timestamp, userId?）
- [ ] **Dashboard 分析卡片**：每个店铺展示今日/本周/本月 views、copies、subscribes
- [ ] **图表**：简易折线图（近期 views 趋势）
- [ ] **实现方式**：API route 插入事件 + Dashboard 用 CSS 手绘简易图表（无需引入图表库）

### 12. 案例排序与管理

- [ ] **排序字段**：`PromptCase` 加 `sortOrder: Int` 字段
- [ ] **拖拽排序**：案例列表页支持拖拽（或上下箭头按钮）
- [ ] **固定/推荐案例**：`featured: Boolean` 字段，置顶展示

### 13. 批量导入

- [ ] **JSON/CSV 导入**：Dashboard → Import → 粘贴 JSON 或上传 CSV
- [ ] **批量操作**：案例列表支持多选 → 批量发布/取消发布/删除
- [ ] **从 OSS 版一键导入**：如果 `content/` 目录有 MDX 文件，可批量解析导入

### 14. 参数化提示词编辑器

- [ ] **提取 `{argument}` 占位符**：在案例编辑页自动检测 prompt 中的 `{argument name="xxx" default="yyy"}` 语法
- [ ] **预览表单**：在店铺详情页渲染个性化表单（输入框替换占位符）
- [ ] **复制参数化结果**：用户填写表单后一键复制完整提示词

---

## P3：消费者发现体验（有流量后）

### 15. 服务端搜索 + 分页

- [ ] **PostgreSQL Full-Text Search**：`tsvector` 列 + GIN 索引
- [ ] **搜索 API**：`/api/tenants/[slug]/cases/search` `<sup>†</sup>` 支持分页、分类过滤、排序
- [ ] **案例列表分页**：店铺首页 + 案例管理列表均支持分页（offset-based 或 cursor-based）

### 16. 动态 Table of Contents

- [ ] **Intersection Observer**：自动追踪页面中的 h2/h3 可见区域
- [ ] **高亮当前 section**：侧边栏 TOC 中当前所在 section 高亮
- [ ] **点击跳转平滑滚动**

### 17. 社交分享与嵌入

- [ ] **一键复制分享链接**（带 UTM）
- [ ] **OG Image 动态生成**：案例封面 + title 叠加文字（Vercel `@vercel/og` 或 `satori`）
- [ ] **Embed 卡片**：可嵌入到 Notion/博客的 `<iframe>` 预览卡片

### 18. 通知系统

- [ ] **订阅成功通知**：创作者 + 消费者双方邮件
- [ ] **新案例通知**：订阅者可选是否接收新案例推送
- [ ] **过期提醒**：月付到期前 3 天邮件提醒

---

## 技术债（可在各波次穿插）

| 项目 | 优先级 |
|------|:---:|
| 软删除案例（`deletedAt` 字段替代硬删除） | P1 |
| 删除 Tenant 功能 | P1 |
| 全部 API 响应加 `Cache-Control` 头 | P1 |
| 错误监控集成（Sentry/Logtail） | P2 |
| CI/CD pipeline（GitHub Actions test + deploy） | P2 |
| Stripe Connect（创作者收款分润） | 有真实交易后 |
| Team/多用户管理（Tenant 协作者） | 有团队需求后 |

---

## 参考文档

- 完整审计报告：对话中 explore agent 输出
- 数据库 Schema：`apps/cloud/prisma/schema.prisma`
- 部署检查清单：`docs/deployment-checklist.md`
- 设计 Spec：`docs/superpowers/specs/2026-07-17-prompt-share-design.md`
- Test Strategy：`docs/superpowers/specs/2026-07-20-test-strategy-design.md`
- Stripe 设计：`docs/stripe-design.md`
- Notion 设计：`docs/notion-design.md`
- Runway 设计：`docs/runway-design.md`
- Linear 设计：`docs/linear-design.md`
- Supabase 连接问题排查：`docs/supabase-connection-troubleshooting.md`
