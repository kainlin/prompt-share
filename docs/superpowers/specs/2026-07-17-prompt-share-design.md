# Feishu-Style Image Prompt Sharing Website — Design Spec

**Date:** 2026-07-17
**Status:** Approved — proceeding to implementation

## Overview

A Nextra-based static site for sharing AI image generation prompts (GPT Image-2, Midjourney, Flux, SDXL), styled to resemble Feishu (Lark) cloud documents. Clean typographic hierarchy, structured prompt cards, and categorized browsing.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| i18n strategy | Nextra native `[lang]` routing with dual MDX files | Full SEO, semantically correct URLs (`/zh/`, `/en/`) |
| CSS approach | CSS Modules + CSS custom properties | No Tailwind; lightweight, Nextra-compatible, Feishu-accurate |
| Image hosting | Supabase Storage, public bucket | Already provisioned; thumbnail + full image layering |
| Prompt format | Raw text block (original form) | Source data lacks structured params; defer to v2 |
| Search | Nextra built-in Pagefind | Zero setup, indexes all MDX at build time |
| Dark mode | Light-first with `.dark` class overrides | Nextra auto-toggles `.dark` on `<html>`; CSS variables handle the rest |
| Initial categories | Photography (75), Product (40), Characters (26) | ~140 cases, high visual impact |
| Project location | `~/home/code/prompt-share` (independent repo) | Clean separation from Nextra monorepo |

## Architecture

```
prompt-share/
├── app/[lang]/                        # Next.js App Router i18n
│   ├── layout.tsx                     # Root layout: Navbar, Footer, LocaleSwitch
│   ├── globals.css                    # CSS variables + Feishu styles
│   └── [[...mdxPath]]/page.tsx        # Nextra MDX catch-all
├── content/{en,zh}/                   # Mirrored content by locale
│   ├── _meta.ts                       # Root sidebar config
│   ├── index.mdx                      # Landing page
│   └── {photography,product,people}/  # Category folders
│       ├── _meta.ts
│       └── case-*.mdx
├── dictionaries/                      # UI string translations
│   ├── en.ts, zh.ts
│   ├── i18n-config.ts
│   └── get-dictionary.ts
├── components/                        # Custom Feishu-style components
│   ├── prompt-block.tsx + .module.css
│   ├── image-gallery.tsx + .module.css
│   ├── case-header.tsx + .module.css
│   ├── toast.tsx + .module.css
│   └── language-switcher.tsx
├── lib/
│   ├── supabase.ts                    # Supabase client
│   └── constants.ts                   # Category definitions
├── scripts/
│   └── import-cases.ts                # Data pipeline: gallery markdown → MDX + Supabase
├── next.config.ts, mdx-components.tsx, package.json, tsconfig.json
```

## Component Tree

```
[layout.tsx]
├── Navbar: Logo + Search (Pagefind) + <LanguageSwitcher>
├── Sidebar: Nextra-built, driven by _meta files
├── Content Area (MDX):
│   ├── <CaseHeader>: emoji + title + tags + source + date
│   ├── <ImageGallery>: thumbnail grid → <Lightbox> on click
│   └── <PromptBlock>: Feishu callout card + <CopyButton> + toast
├── TOC: Nextra-built right sidebar
└── <Toast>: Global clipboard notification
```

## MDX Frontmatter Schema

```yaml
---
title: "极致特写美妆"
category: photography          # photography | product | people
tags: [美妆, 人像, Flux]
emoji: "💄"
cover: case1_thumb.webp        # Supabase thumbnail filename
images:                         # Full-res images in Supabase
  - case1_full.jpg
source:
  platform: 小红书
  author: "4264014889"
date: 2025-01-15
---
```

All fields optional except `category` and `cover`.

## Image Pipeline

```
awesome-gpt-image-2 local clone
  ├── docs/gallery-*.md          → parse → extract cases
  ├── data/style-library.json    → template→category mapping
  └── data/images/case{N}.jpg   → download → sharp process

For each matching case:
  1. sharp: 800px WebP (quality 80)  → Supabase /thumbnails/
  2. sharp: optimize original         → Supabase /full/
  3. Generate content/{en,zh}/{category}/case-{slug}.mdx

Supabase Bucket: prompt-images (public)
  URL: https://wvzqfmvehnfdxjqcjjbb.supabase.co/storage/v1/object/public/prompt-images/
```

## Feishu Style Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--feishu-bg` | `#FFFFFF` | `#1A1A1A` |
| `--feishu-card-bg` | `#F2F3F5` | `#2A2A2A` |
| `--feishu-accent` | `#3370FF` | `#3370FF` |
| `--feishu-text-primary` | `#1F2329` | `#E5E5E5` |
| `--feishu-text-secondary` | `#8F959E` | `#8B8B8B` |
| `--feishu-border` | `#E5E6EB` | `#333333` |

Font: system-ui, -apple-system, sans-serif. Title weight: 600. Body line-height: 1.7.

## Verification

1. `npm install && npm run dev` starts without error
2. `/zh/photography/*` and `/en/photography/*` render correctly with sidebar
3. Language switcher toggles between locales, preserving path
4. Copy button copies prompt text; toast appears and auto-dismisses
5. Lightbox opens on image click, closes on ESC/mask click
6. Pagefind search indexes at build time (`npm run build && npm run postbuild`)
7. Dark mode toggle updates all custom components
