#!/usr/bin/env npx tsx
/**
 * Import pipeline: awesome-gpt-image-2 → MDX + Supabase Storage
 *
 * Usage:
 *   npx tsx scripts/import-cases.ts <path-to-awesome-gpt-image-2>
 *
 * Steps:
 *   1. Parse gallery markdown — extract case #, title, image, source, prompt
 *   2. Classify by Chinese title keywords → photography / product / people
 *   3. Resize images via sharp → upload thumbnails + full to Supabase
 *   4. Generate content/{en,zh}/{category}/case-*.mdx
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// ─── Config ───────────────────────────────────────────────────

const SUPABASE_URL = 'https://wvzqfmvehnfdxjqcjjbb.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET = 'prompt-images'

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  photography: [
    '摄影', '写真', '写实', '街拍', '自拍', '风景', '自然', '动物',
    '植物', '花卉', '微距', '人像摄影', '产品摄影', '美食摄影',
    '建筑摄影', '航拍', '水下', '黑白', '光影', '逆光',
    '柔光', '特写', '镜头', '相机', '拍照', '照片',
    '海滩', '沙漠', '极简', '氛围感', '质感', '生活感',
    '纪实', '抓拍', '日常', '居家', '毛片', '胶片'
  ],
  product: [
    '产品', '电商', '商品', '详情页', '展示', '包装', '广告',
    '直播', '带货', '促销', '商业', '品牌展示', '样机',
    '淘宝', '亚马逊', '产品图', '白底图', '场景图',
    '老干妈', '咖啡', '手机', '耳机', '手表', '香水',
    '化妆品', '口红', '护肤', '衣服', '鞋子', '包',
    '界面', '交互', '登录页', '仪表盘', '中控', '后台',
    'APP', 'UI', '网页', '网站', '深色模式', '浅色模式',
    '数据看板', '原型', '线框图', '卡片', '列表',
    '电商详情', '主图', '亚马逊', '速卖通'
  ],
  people: [
    '人物', '角色', '人像', '肖像', '自拍', '全身', '半身',
    '少女', '男孩', '女孩', '男人', '女人', '儿童', '老人',
    '明星', '运动员', '模特', 'cosplay', '二次元', '动漫',
    '赛博', '机甲', '战士', '法师', '精灵', '龙',
    '皇帝', '贵妃', '将军', '武士', '忍者',
    '特朗普', '马斯克', '明星', '演员', '歌手',
    '工笔画', '水墨', '国风', '古装', '汉服', '旗袍',
    '人物设定', '角色设定', '三视图', '表情包', '头像'
  ]
}

// ─── Types ────────────────────────────────────────────────────

interface ParsedCase {
  caseNumber: number
  title: string
  imagePath: string   // e.g. "../data/images/case1.jpg"
  sourceRaw: string   // e.g. "小红书号4264014889" or "未提供"
  promptText: string  // full prompt
  category?: string   // photography | product | people
}

// ─── Gallery Parser ───────────────────────────────────────────

function parseGallery(content: string): ParsedCase[] {
  const results: ParsedCase[] = []

  // Split by case anchors: <a name="case-N"></a>
  const blocks = content.split(/<a name="case-(\d+)"><\/a>/)
  // blocks[0] = preamble, blocks[1] = case1 number, blocks[2] = case1 content,
  // blocks[3] = case2 number, blocks[4] = case2 content, ...

  for (let i = 1; i < blocks.length; i += 2) {
    const numStr = blocks[i]
    const body = blocks[i + 1] || ''
    const caseNumber = parseInt(numStr, 10)

    // Title: ### 例 N：标题
    const titleMatch = body.match(/###\s+例\s*\d+[：:]\s*(.+)/)
    if (!titleMatch) continue
    const title = titleMatch[1].trim()

    // Image: ![alt](path)
    const imgMatch = body.match(/!\[.*?\]\((.+?)\)/)
    const imagePath = imgMatch ? imgMatch[1].trim() : ''

    // Source: **来源：**  or **来源:**
    const srcMatch = body.match(/\*\*来源[：:]\*\*\s*(.+)/)
    let sourceRaw = srcMatch ? srcMatch[1].trim() : '未提供'
    // Remove any trailing ** markers
    sourceRaw = sourceRaw.replace(/\*+/g, '').trim()

    // Prompt: **提示词[：:]** followed by ```text ... ```
    const promptMatch = body.match(/\*\*提示词[：:]\*\*[\s\S]*?```(?:text)?\s*\n([\s\S]*?)```/)
    let promptText = ''
    if (promptMatch) {
      promptText = promptMatch[1].trim()
    } else {
      // Fallback: try to grab everything after 提示词 until *** or next case
      const fallMatch = body.match(/\*\*提示词[：:]\*\*\s*\n([\s\S]*?)(?:\*\*\*|---|<a name=)/)
      if (fallMatch) {
        promptText = fallMatch[1].trim()
        // Strip code fences if present
        promptText = promptText.replace(/^```(?:text)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }
    }

    if (title && promptText) {
      results.push({ caseNumber, title, imagePath, sourceRaw, promptText })
    }
  }

  return results
}

// ─── Category Classifier ──────────────────────────────────────

function classifyCase(c: ParsedCase): string {
  const text = c.title + ' ' + c.promptText.slice(0, 200)

  const scores: Record<string, number> = {}
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (text.includes(kw)) score++
    }
    scores[cat] = score
  }

  // Find best match
  let best = 'photography' // default
  let bestScore = 0
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      best = cat
    }
  }

  // If no keywords matched at all, default to photography
  return bestScore > 0 ? best : 'photography'
}

// ─── Image Processing ─────────────────────────────────────────

async function processImage(
  sourceDir: string,
  imagePath: string,
): Promise<{ fullBuffer: Buffer; thumbBuffer: Buffer; ext: string } | null> {
  const filename = path.basename(imagePath)
  const fullPath = path.join(sourceDir, 'data', 'images', filename)

  if (!fs.existsSync(fullPath)) {
    // Try with different extensions
    const base = filename.replace(/\.[^.]+$/, '')
    for (const ext of ['.jpg', '.png', '.jpeg', '.webp']) {
      const altPath = path.join(sourceDir, 'data', 'images', base + ext)
      if (fs.existsSync(altPath)) {
        return processImageFromPath(altPath)
      }
    }
    return null
  }

  return processImageFromPath(fullPath)
}

async function processImageFromPath(
  filePath: string
): Promise<{ fullBuffer: Buffer; thumbBuffer: Buffer; ext: string }> {
  const inputBuffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).replace('.', '') || 'jpg'

  // Full: resize to max 1920px, keep quality
  const fullBuffer = await sharp(inputBuffer)
    .resize({ width: 1920, withoutEnlargement: true })
    [ext === 'png' ? 'png' : 'jpeg']({ quality: 85 })
    .toBuffer()

  // Thumb: 600px WebP
  const thumbBuffer = await sharp(inputBuffer)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer()

  return { fullBuffer, thumbBuffer, ext }
}

// ─── Supabase Upload ──────────────────────────────────────────

/** CDN cache durations for different asset types */
const CACHE_IMMUTABLE = '31536000, immutable' // 1 year — content-addressed assets
const CACHE_LONG = '604800'                   // 1 week — stable assets, may be upserted

async function uploadBuffer(
  supabase: SupabaseClient,
  buffer: Buffer,
  remotePath: string,
  contentType: string,
  cacheControl: string = CACHE_LONG,
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, buffer, { contentType, upsert: true, cacheControl })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }
}

// ─── MDX Generation ───────────────────────────────────────────

function slugify(title: string, caseNum: number): string {
  const base = title
    .replace(/[^\w一-鿿-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `case-${caseNum}-${base}`
}

function generateMdx(c: ParsedCase, lang: 'en' | 'zh'): string {
  const catEmojis: Record<string, string> = {
    photography: '📷',
    product: '🛍️',
    people: '🧍'
  }
  const emoji = catEmojis[c.category || 'photography'] || '📄'

  const title = c.title
  const ext = path.extname(c.imagePath).replace('.', '') || 'jpg'
  const thumbFile = `case${c.caseNumber}_thumb.webp`
  const fullFile = `case${c.caseNumber}_full.${ext}`

  // Escape backticks in prompt for JSX template literal
  const escapedPrompt = c.promptText
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')

  const sourcePlatform = c.sourceRaw.includes('小红书') ? '小红书' : 'Unknown'
  const sourceAuthor = c.sourceRaw
    .replace(/小红书[号號]?\s*/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')  // remove markdown links
    .replace(/[<>\[\]()\\"{}|]/g, '') // strip YAML-unsafe chars
    .replace(/https?:\/\/\S+/g, '')
    .trim()
    .slice(0, 50)
    || 'unknown'

  return `---
title: "${title.replace(/"/g, '\\"')}"
category: ${c.category || 'photography'}
tags: []
emoji: "${emoji}"
cover: ${thumbFile}
images:
  - ${fullFile}
source:
  platform: ${sourcePlatform}
  author: "${sourceAuthor}"
---

<CaseHeader
  emoji="${emoji}"
  title="${title.replace(/"/g, '\\"')}"
  tags={[]}
  source={{platform: "${sourcePlatform}", author: "${sourceAuthor}"}}
/>

<ImageGallery images={["${fullFile}"]} alt="${title.replace(/"/g, '\\"')}" />

## ${lang === 'zh' ? '提示词' : 'Prompt'}

<PromptBlock emoji="💬">
{\`${escapedPrompt}\`}
</PromptBlock>
`
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const sourceDir = process.argv[2]
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    console.error('Usage: npx tsx scripts/import-cases.ts <path-to-awesome-gpt-image-2>')
    process.exit(1)
  }

  // ── 1. Parse ──
  console.log('📖 Parsing gallery files...')
  const allCases: ParsedCase[] = []
  for (const part of ['docs/gallery-part-1.md', 'docs/gallery-part-2.md', 'docs/gallery.md']) {
    const fp = path.join(sourceDir, part)
    if (!fs.existsSync(fp)) continue
    const parsed = parseGallery(fs.readFileSync(fp, 'utf-8'))
    allCases.push(...parsed)
    console.log(`  ${part}: ${parsed.length} cases`)
  }
  console.log(`  Total parsed: ${allCases.length}`)

  // ── 2. Classify ──
  console.log('\n🏷️  Classifying...')
  const categorized = new Map<string, ParsedCase[]>()
  for (const c of allCases) {
    c.category = classifyCase(c)
    if (!categorized.has(c.category)) categorized.set(c.category, [])
    categorized.get(c.category)!.push(c)
  }
  for (const [cat, cases] of categorized) {
    console.log(`  ${cat}: ${cases.length} cases`)
  }

  // ── 3. Init Supabase ──
  if (!SUPABASE_KEY) {
    console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY not set. Set it in .env.local.')
    process.exit(1)
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('\n☁️  Supabase ready, bucket:', BUCKET)

  // ── 4. Process ──
  console.log('\n🖼️  Processing & uploading...')
  let done = 0
  let skipped = 0
  let errs = 0

  for (const [cat, cases] of categorized) {
    const dirEn = path.join('content', 'en', cat)
    const dirZh = path.join('content', 'zh', cat)
    fs.mkdirSync(dirEn, { recursive: true })
    fs.mkdirSync(dirZh, { recursive: true })

    for (const c of cases) {
      const slug = slugify(c.title, c.caseNumber)
      const ext = path.extname(c.imagePath).replace('.', '') || 'jpg'
      const thumbFile = `case${c.caseNumber}_thumb.webp`
      const fullFile = `case${c.caseNumber}_full.${ext}`

      process.stdout.write(`  [${cat}] case ${c.caseNumber}: ${c.title.slice(0, 40)}... `)

      try {
        const imgResult = await processImage(sourceDir, c.imagePath)
        if (!imgResult) {
          console.log('⚠️  image missing, skipping')
          skipped++
          continue
        }

        await uploadBuffer(supabase, imgResult.thumbBuffer, `thumbnails/${thumbFile}`, 'image/webp', CACHE_IMMUTABLE)
        await uploadBuffer(supabase, imgResult.fullBuffer, `full/${fullFile}`, `image/${ext === 'png' ? 'png' : 'jpeg'}`, CACHE_LONG)

        const mdxEn = generateMdx(c, 'en')
        const mdxZh = generateMdx(c, 'zh')
        fs.writeFileSync(path.join(dirEn, `${slug}.mdx`), mdxEn, 'utf-8')
        fs.writeFileSync(path.join(dirZh, `${slug}.mdx`), mdxZh, 'utf-8')

        console.log('✅')
        done++
      } catch (err) {
        console.log(`❌ ${(err as Error).message}`)
        errs++
      }
    }
  }

  console.log(`\n📦 Done! Processed: ${done} | Skipped: ${skipped} | Errors: ${errs}`)
}

main().catch(err => { console.error('Import failed:', err); process.exit(1) })
