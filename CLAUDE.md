# PromptShare — 交接文档 (Handoff)

**项目**：飞书文档风格的 AI 图像提示词分享站
**仓库**：`git@github.com:kainlin/prompt-share.git`
**本地路径**：`~/home/code/prompt-share`
**在线地址**：（待部署）

---

## 项目概述

基于 **Nextra 4.6.0** + **Next.js 16.0.7** 构建的静态站点，仿飞书云文档风格展示 AI 图像生成提示词（来自 GPT Image-2）。支持中英双语、分类浏览、一键复制提示词、图片 Lightbox 查看。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16.0.7 (App Router, Turbopack) |
| 内容引擎 | Nextra 4.6.0 + nextra-theme-docs 4.6.0 |
| 样式 | CSS Modules + CSS 自定义属性（无 Tailwind） |
| 图片存储 | Supabase Storage (`prompt-images` bucket) |
| 国际化 | Next.js i18n 路由 (`[lang]` → `zh`/`en`) |
| 数据导入 | 自定义 tsx 脚本 (`scripts/import-cases.ts`) |
| 搜索 | Pagefind (postbuild 自动索引) |

---

## ⚠️ 关键踩坑记录

### 1. Nextra 版本锁死 4.6.0

**不要升级到 4.6.1！** `nextra-theme-docs@4.6.1` 有严重 bug：
```
Error: ✖ Invalid input: expected nonoptional, received undefined → at children
```
这个 bug 导致 `<Layout>` 组件无法渲染任何页面。4.6.0 和 4.5.1 都正常。

### 2. 不能同时使用 `<Layout>` + 缺失 `pageMap`

`Layout` 必须传 `pageMap` prop（来自 `getPageMap()`），否则 Nextra 报错。

### 3. MDX Frontmatter 中的 YAML 转义

`author` 字段如果包含 `\`、`[`、`]`、`(`、`)`、`<`、`>`、URL 等字符，YAML 解析会直接崩溃。
导入脚本 (`scripts/import-cases.ts`) 已在 `generateMdx()` 中做了清洗。

如果遇到 `YAMLParseError`，运行修复脚本：
```bash
npx tsx scripts/fix-yaml.ts
```

### 4. 分类 `_meta.ts` 不要用 `type: 'page'`

```
# ❌ 错误：会导致 /zh/photography 404
photography: { type: 'page', title: '📷 摄影与写实' }

# ✅ 正确：分类只做侧边栏文件夹
photography: '📷 摄影与写实'
```

---

## 目录结构

```
prompt-share/
├── app/[lang]/                    # Next.js App Router
│   ├── layout.tsx                 # 根布局（Navbar + Layout + LocaleSwitch + Providers）
│   ├── globals.css                # 飞书风格 CSS 变量
│   └── [[...mdxPath]]/page.tsx    # Nextra MDX catch-all 页面
│
├── content/{en,zh}/               # 双语内容（镜像结构）
│   ├── _meta.ts                   # 根侧边栏配置
│   ├── index.mdx                  # 首页
│   ├── photography/               # 📷 摄影与写实（309 cases）
│   ├── product/                   # 🛍️ 产品与电商（140 cases）
│   └── people/                    # 🧍 人物与角色（65 cases）
│
├── components/                    # 飞书风格自定义组件
│   ├── case-header.tsx            # 页面头部（emoji + 标题 + 标签 + 来源）
│   ├── prompt-block.tsx           # 提示词卡片（左侧蓝色边框 + hover Copy 按钮）
│   ├── image-gallery.tsx          # 缩略图网格 + Lightbox（ESC/左右键切换）
│   ├── toast.tsx + providers.tsx  # 全局 Toast（复制成功提示）
│   └── language-switcher.tsx      # 语言切换按钮（备用，实际用 LocaleSwitch）
│
├── dictionaries/                  # UI 文案 i18n
│   ├── en.ts, zh.ts
│   ├── i18n-config.ts
│   └── get-dictionary.ts
│
├── lib/
│   ├── supabase.ts                # Supabase 客户端 + URL 构建函数
│   └── constants.ts               # 分类定义 + 站点配置
│
├── scripts/
│   ├── import-cases.ts            # 数据导入管道（主要脚本）
│   └── fix-yaml.ts                # YAML 修复工具
│
├── next.config.ts                 # Nextra + i18n + images.remotePatterns
├── mdx-components.tsx              # MDX 组件注册（CaseHeader, PromptBlock, ImageGallery）
├── package.json                   # nextra@4.6.0, next@16.0.7
└── docs/superpowers/specs/        # 设计文档
```

---

## 常用命令

```bash
# 开发
cd ~/home/code/prompt-share
npm run dev

# 构建
npm run build
npm run postbuild  # Pagefind 搜索索引

# 重新导入数据（需要先 clone awesome-gpt-image-2）
SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/import-cases.ts ~/home/code/awesome-gpt-image-2

# 修复 YAML 格式问题
npx tsx scripts/fix-yaml.ts

# 查看 Supabase 存储桶
npx tsx -e "
const {createClient} = require('@supabase/supabase-js');
const s = createClient('https://wvzqfmvehnfdxjqcjjbb.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);
s.storage.listBuckets().then(r => console.log(r.data?.map(b=>b.name)));
"
```

---

## Supabase 配置

```
URL:   https://wvzqfmvehnfdxjqcjjbb.supabase.co
Bucket: prompt-images (public)
  ├── thumbnails/  (600px WebP, ~150KB each)
  └── full/        (1920px JPEG, ~550KB each)
```

环境变量在 `.env.local`：
```
NEXT_PUBLIC_SUPABASE_URL=https://wvzqfmvehnfdxjqcjjbb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...（完整 key）
```

---

## MDX Frontmatter Schema

```yaml
---
title: "城市生命系统图谱"
category: photography        # photography | product | people
tags: []
emoji: "📷"
cover: case1_thumb.webp      # Supabase 中缩略图文件名
images:
  - case1_full.jpg           # Supabase 中原图文件名
source:
  platform: 小红书
  author: "insight_express"
---
```

---

## 待完成事项

1. **部署**：标准 Next.js 项目，Vercel 一键部署。需配置环境变量和 `images.remotePatterns`
2. **中文 title → 英文 title 翻译**：目前 en 版 MDX 的 title 用的还是中文。需要在导入脚本中接入 LLM 翻译 API 或手动翻译
3. **标签 (tags) 完善**：目前 tags 字段为空 `[]`，可从 prompt 文本中自动提取
4. **首页美化**：当前首页是简单的 Markdown 列表，可改为飞书风格的卡片网格
5. **标题去重**：很多 case 标题相同（如"信息图可视化设计"出现了几十次），可能需要人工标注更具体的标题
6. **OG Image**：当前没有动态 OG 图，可以用 `generateMetadata` + Supabase 图片 URL 做社交分享卡片
7. **移动端适配**：侧边栏和 Lightbox 的移动端体验还需要优化

---

## 设计文档

完整设计 spec：`docs/superpowers/specs/2026-07-17-prompt-share-design.md`
