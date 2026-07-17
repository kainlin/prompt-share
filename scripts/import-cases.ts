#!/usr/bin/env npx tsx
/**
 * Data import pipeline: awesome-gpt-image-2 → MDX + Supabase Storage
 *
 * Usage:
 *   npx tsx scripts/import-cases.ts --source <path-to-awesome-gpt-image-2>
 *
 * Process:
 *   1. Parse docs/gallery-*.md to extract case data
 *   2. Load data/style-library.json for category/template mapping
 *   3. Filter cases matching our 3 target categories
 *   4. Process images: download → sharp thumbnails → upload to Supabase
 *   5. Generate content/{en,zh}/{category}/case-*.mdx files
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// ─── Config ───────────────────────────────────────────────────

const TARGET_CATEGORIES = ['cat-photography', 'cat-product', 'cat-character'] as const

const CATEGORY_MAP: Record<string, { id: string; enName: string; zhName: string }> = {
  'cat-photography': { id: 'photography', enName: 'Photography & Realism', zhName: '摄影与写实' },
  'cat-product': { id: 'product', enName: 'Products & E-commerce', zhName: '产品与电商' },
  'cat-character': { id: 'people', enName: 'Characters & People', zhName: '人物与角色' }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wvzqfmvehnfdxjqcjjbb.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET = 'prompt-images'

// ─── Types ────────────────────────────────────────────────────

interface GalleryCase {
  caseNumber: number
  title: string
  category: string
  sourcePlatform: string
  sourceAuthor: string
  promptText: string
  imagePath: string // e.g. ../data/images/case1.jpg
}

interface StyleLibrary {
  version: number
  categories: Array<{
    id: string
    value: string
    title: { en: string; zh: string }
    description: { en: string; zh: string }
  }>
  templates: Array<{
    id: string
    title: { en: string; zh: string }
    category: string
    styles: string[]
    scenes: string[]
    tags: string[]
    useWhen: { en: string; zh: string }
    guidance: { en: string[]; zh: string[] }
    pitfalls: { en: string[]; zh: string[] }
    exampleCases: number[]
    cover: string
  }>
}

// ─── Parse Gallery Markdown ───────────────────────────────────

function parseGalleryMarkdown(content: string): GalleryCase[] {
  const cases: GalleryCase[] = []

  // Each case starts with <a name="case-N"></a> and ends before the next <a> or at <hr>
  const caseRegex = /<a name="case-(\d+)"><\/a>\s*\n\s*\n\s*###\s+(.+?)\n\s*\n\s*!\[(.+?)\]\((.+?)\)\s*\n\s*\n\s*\*?\*?来源：?\*?\*?\s*(.+?)\s*\n\s*\n\s*\*?\*?提示词：?\*?\*?\s*\n\s*\n\s*```text?\s*\n([\s\S]*?)```/g

  let match: RegExpExecArray | null
  while ((match = caseRegex.exec(content)) !== null) {
    const [, numStr, title, , imagePath, sourceRaw, promptText] = match
    const caseNumber = parseInt(numStr, 10)
    const sourceClean = sourceRaw.replace(/\*+/g, '').trim()
    const sourceParts = sourceClean.split(/[@小红书]/)

    cases.push({
      caseNumber,
      title: title.trim(),
      category: '', // will be filled from style-library
      sourcePlatform: sourceClean.includes('小红书') || sourceClean.includes('小紅書') ? '小红书' : 'Unknown',
      sourceAuthor: extractSourceId(sourceClean),
      promptText: promptText.trim(),
      imagePath: imagePath.trim()
    })
  }

  return cases
}

function extractSourceId(source: string): string {
  // Extract numeric ID or handle from source string
  const numMatch = source.match(/(\d{8,})/)
  if (numMatch) return numMatch[1]
  const handleMatch = source.match(/[号號]\s*(\S+)/)
  if (handleMatch) return handleMatch[1]
  if (source === '未提供' || source === 'Not provided') return ''
  return source.trim().slice(0, 30)
}

// ─── Category Matching ───────────────────────────────────────

function matchCategories(
  cases: GalleryCase[],
  styleLibrary: StyleLibrary
): Map<string, GalleryCase[]> {
  // Build case number → case index
  const caseMap = new Map<number, GalleryCase>()
  for (const c of cases) {
    caseMap.set(c.caseNumber, c)
  }

  // For each target category, find templates and their exampleCases
  const result = new Map<string, GalleryCase[]>()
  for (const targetCatId of TARGET_CATEGORIES) {
    const matched: GalleryCase[] = []
    const catInfo = styleLibrary.categories.find(c => c.id === targetCatId)
    const catValue = catInfo?.value || ''

    for (const template of styleLibrary.templates) {
      if (template.category === catValue) {
        for (const caseNum of template.exampleCases) {
          const galCase = caseMap.get(caseNum)
          if (galCase) {
            galCase.category = targetCatId
            if (!matched.some(c => c.caseNumber === caseNum)) {
              matched.push(galCase)
            }
          }
        }
      }
    }
    result.set(targetCatId, matched)
  }

  return result
}

// ─── Image Processing ─────────────────────────────────────────

async function processImage(
  sourceDir: string,
  imagePath: string,
  caseNumber: number
): Promise<{ fullBuffer: Buffer; thumbBuffer: Buffer; ext: string }> {
  // imagePath is like "../data/images/case1.jpg"
  const filename = path.basename(imagePath)
  const fullPath = path.join(sourceDir, 'data', 'images', filename)

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Image not found: ${fullPath}`)
  }

  const inputBuffer = fs.readFileSync(fullPath)
  const ext = path.extname(filename).replace('.', '') || 'jpg'
  const metadata = await sharp(inputBuffer).metadata()

  // Full image: optimize but keep quality
  const fullBuffer = await sharp(inputBuffer)
    .resize({ width: 1920, withoutEnlargement: true })
    [ext === 'png' ? 'png' : 'jpeg']({ quality: 85 })
    .toBuffer()

  // Thumbnail: 800px wide WebP
  const thumbBuffer = await sharp(inputBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  return { fullBuffer, thumbBuffer, ext }
}

// ─── Supabase Upload ──────────────────────────────────────────

async function uploadToSupabase(
  supabase: ReturnType<typeof createClient>,
  buffer: Buffer,
  remotePath: string,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, buffer, {
      contentType,
      upsert: true
    })

  if (error) {
    throw new Error(`Upload failed for ${remotePath}: ${error.message}`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`
}

// ─── MDX Generation ───────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function generateMdx(caseData: GalleryCase, lang: 'en' | 'zh', thumbFilename: string): string {
  const catInfo = CATEGORY_MAP[caseData.category]
  const title = lang === 'zh'
    ? caseData.title // Chinese title from source
    : translateTitle(caseData.title)

  const tags = extractTags(caseData.promptText, lang)

  const mdx = `---
title: "${title}"
category: ${catInfo.id}
tags: [${tags.join(', ')}]
emoji: "${getEmoji(catInfo.id)}"
cover: ${thumbFilename}
images:
  - case${caseData.caseNumber}_full.${getExt(caseData.imagePath)}
source:
  platform: ${caseData.sourcePlatform}
  author: "${caseData.sourceAuthor}"
---

<CaseHeader
  emoji="${getEmoji(catInfo.id)}"
  title="${title}"
  tags={[${tags.map(t => `"${t}"`).join(', ')}]}
  source={{platform: "${caseData.sourcePlatform}", author: "${caseData.sourceAuthor}"}}
/>

<ImageGallery images={["case${caseData.caseNumber}_full.${getExt(caseData.imagePath)}"]} alt="${title}" />

## ${lang === 'zh' ? '提示词' : 'Prompt'}

<PromptBlock emoji="💬">
{\`${caseData.promptText}\`}
</PromptBlock>
`

  return mdx
}

function translateTitle(cnTitle: string): string {
  // Simple placeholder — replace with LLM call in production
  const known: Record<string, string> = {
    '城市生命系统图谱': 'Urban Metabolism Atlas',
    '足球主题电影海报': 'Football Theme Movie Poster',
    '老干妈风味': 'Trump Selling Lao Gan Ma on TikTok Live',
    '极致特写美妆': 'Extreme Close-up Beauty',
    '奢侈品编辑人像': 'Luxury Editorial Portrait',
    '极简电水壶': 'Minimalist Electric Kettle',
    '主题海报版式设计': 'Epic Narrative Theme Poster',
    'Ailln AI 社媒截图': 'Ailln AI Social Post',
    '信息图可视化设计': 'Infographic Visualization Design',
    '社媒界面截图': 'Social Media UI Screenshot'
  }
  return known[cnTitle] || cnTitle
}

function getEmoji(categoryId: string): string {
  const emojis: Record<string, string> = {
    photography: '📷',
    product: '🛍️',
    people: '🧍'
  }
  return emojis[categoryId] || '📄'
}

function getExt(imagePath: string): string {
  const ext = path.extname(imagePath).replace('.', '')
  return ext || 'jpg'
}

function extractTags(prompt: string, _lang: 'en' | 'zh'): string[] {
  const tags: string[] = []
  const lower = prompt.toLowerCase()

  if (lower.includes('8k') || lower.includes('4k')) tags.push('High-Res')
  if (lower.includes('poster') || prompt.includes('海报')) tags.push('Poster')
  if (lower.includes('photorealistic') || prompt.includes('写实')) tags.push('Realistic')
  if (lower.includes('cinematic') || prompt.includes('电影')) tags.push('Cinematic')
  if (lower.includes('3d') || lower.includes('isometric')) tags.push('3D')
  if (lower.includes('dark mode') || prompt.includes('深色')) tags.push('Dark UI')
  if (tags.length === 0) tags.push('GPT-Image-2')

  return tags
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const sourceIdx = args.indexOf('--source')
  if (sourceIdx === -1) {
    console.error('Usage: npx tsx scripts/import-cases.ts --source <path-to-awesome-gpt-image-2>')
    process.exit(1)
  }

  const sourceDir = args[sourceIdx + 1]
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`)
    process.exit(1)
  }

  // 1. Parse gallery files
  console.log('📖 Parsing gallery markdown files...')
  const allCases: GalleryCase[] = []
  for (const part of ['docs/gallery-part-1.md', 'docs/gallery-part-2.md', 'docs/gallery.md']) {
    const filePath = path.join(sourceDir, part)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = parseGalleryMarkdown(content)
      allCases.push(...parsed)
      console.log(`  ${part}: ${parsed.length} cases`)
    }
  }
  console.log(`Total cases parsed: ${allCases.length}`)

  // 2. Load style library
  const stylePath = path.join(sourceDir, 'data', 'style-library.json')
  if (!fs.existsSync(stylePath)) {
    console.error('style-library.json not found in source directory')
    process.exit(1)
  }
  const styleLibrary: StyleLibrary = JSON.parse(fs.readFileSync(stylePath, 'utf-8'))
  console.log(`Style library loaded: ${styleLibrary.categories.length} categories, ${styleLibrary.templates.length} templates`)

  // 3. Filter by category
  const categorized = matchCategories(allCases, styleLibrary)
  const totalMatched = Array.from(categorized.values()).reduce((sum, arr) => sum + arr.length, 0)
  console.log(`\n📊 Category matching results:`)
  for (const [catId, cases] of categorized) {
    const info = CATEGORY_MAP[catId]
    console.log(`  ${info.zhName}: ${cases.length} cases`)
  }
  console.log(`Total matched: ${totalMatched}`)

  if (totalMatched === 0) {
    console.log('No cases matched. Check category mappings.')
    return
  }

  // 4. Initialize Supabase
  if (!SUPABASE_KEY) {
    console.warn('\n⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Skipping image upload. Set the env var to upload images.')
    console.log('Skipping image processing — generating MDX files only.')
    await generateMdxFilesOnly(categorized, sourceDir)
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 5. Ensure storage bucket exists
  console.log('\n☁️  Checking Supabase storage...')
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET)
  if (!bucketExists) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10_485_760 // 10MB
    })
    if (createErr) {
      console.error(`Failed to create bucket ${BUCKET}:`, createErr.message)
      process.exit(1)
    }
    console.log(`Created bucket: ${BUCKET}`)
  } else {
    console.log(`Bucket ${BUCKET} exists`)
  }

  // 6. Process and upload each case
  console.log('\n🖼️  Processing images...')
  let processed = 0
  let skipped = 0
  let errors = 0

  for (const [catId, cases] of categorized) {
    const catInfo = CATEGORY_MAP[catId]
    const contentEnDir = path.join('content', 'en', catInfo.id)
    const contentZhDir = path.join('content', 'zh', catInfo.id)

    for (const caseData of cases) {
      const slug = slugify(caseData.title)
      const ext = getExt(caseData.imagePath)
      const thumbFile = `case${caseData.caseNumber}_thumb.webp`
      const fullFile = `case${caseData.caseNumber}_full.${ext}`

      try {
        // Process image
        const { fullBuffer, thumbBuffer } = await processImage(
          sourceDir,
          caseData.imagePath,
          caseData.caseNumber
        )

        // Upload
        console.log(`  Uploading case ${caseData.caseNumber}: ${caseData.title}`)
        await uploadToSupabase(supabase, thumbBuffer, `thumbnails/${thumbFile}`, 'image/webp')
        await uploadToSupabase(supabase, fullBuffer, `full/${fullFile}`, `image/${ext === 'png' ? 'png' : 'jpeg'}`)

        // Generate MDX
        const mdxEn = generateMdx(caseData, 'en', thumbFile)
        const mdxZh = generateMdx(caseData, 'zh', thumbFile)

        fs.writeFileSync(path.join(contentEnDir, `case-${slug}.mdx`), mdxEn, 'utf-8')
        fs.writeFileSync(path.join(contentZhDir, `case-${slug}.mdx`), mdxZh, 'utf-8')

        processed++
        console.log(`    ✅ Done`)
      } catch (err) {
        console.error(`    ❌ Error: ${(err as Error).message}`)
        errors++
      }
    }
  }

  console.log(`\n📦 Import summary:`)
  console.log(`  Processed: ${processed}`)
  console.log(`  Skipped:   ${skipped}`)
  console.log(`  Errors:    ${errors}`)
}

async function generateMdxFilesOnly(
  categorized: Map<string, GalleryCase[]>,
  sourceDir: string
) {
  for (const [catId, cases] of categorized) {
    const catInfo = CATEGORY_MAP[catId]
    const contentEnDir = path.join('content', 'en', catInfo.id)
    const contentZhDir = path.join('content', 'zh', catInfo.id)
    fs.mkdirSync(contentEnDir, { recursive: true })
    fs.mkdirSync(contentZhDir, { recursive: true })

    for (const caseData of cases) {
      const slug = slugify(caseData.title)
      const thumbFile = `case${caseData.caseNumber}_thumb.webp`

      const mdxEn = generateMdx(caseData, 'en', thumbFile)
      const mdxZh = generateMdx(caseData, 'zh', thumbFile)

      fs.writeFileSync(path.join(contentEnDir, `case-${slug}.mdx`), mdxEn, 'utf-8')
      fs.writeFileSync(path.join(contentZhDir, `case-${slug}.mdx`), mdxZh, 'utf-8')
    }
  }
  console.log('MDX files generated (images not uploaded).')
}

main().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})
