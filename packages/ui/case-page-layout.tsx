'use client'

import React from 'react'
import styles from './case-layout.module.css'
import { ColorPalette } from './color-palette'
import { ImageGallery } from './image-gallery'
import { CaseHeader } from './case-header'
import { PromptBlock } from './prompt-block'
import { getFullImageUrl } from './lib/supabase-url'

interface CasePageLayoutProps {
  children: React.ReactNode
  metadata: {
    title?: string
    category?: string
    tags?: string[]
    emoji?: string
    cover?: string
    images?: string | string[]
    source?: {
      platform?: string
      author?: string
    }
  }
  [key: string]: any
}

const getCategoryLabel = (category: string) => {
  const map: Record<string, string> = {
    photography: '写实摄影 (Photography)',
    product: '产品渲染 (Product Render)',
    people: '人物角色设计 (Character Design)'
  }
  return map[category] || category
}

function getTextContent(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return node.toString()
  if (Array.isArray(node)) return node.map(getTextContent).join('')
  if (node.props?.children) return getTextContent(node.props.children)
  return ''
}

const isComponent = (child: any, component: any, name: string) => {
  if (!child || !child.type) return false
  if (child.type === component) return true
  const typeName = child.type.displayName || child.type.name || ''
  if (typeName === name) return true
  if (child.props?.mdxType === name) return true
  return false
}

export function CasePageLayout({ children, metadata, ...props }: CasePageLayoutProps) {
  const childrenArray = React.Children.toArray(children)
  
  let imageGalleryNode: any = null
  let caseHeaderNode: any = null
  let promptBlockNode: any = null
  const otherNodes: any[] = []

  childrenArray.forEach(child => {
    if (isComponent(child, ImageGallery, 'ImageGallery')) {
      imageGalleryNode = child
    } else if (isComponent(child, CaseHeader, 'CaseHeader')) {
      caseHeaderNode = child
    } else if (isComponent(child, PromptBlock, 'PromptBlock')) {
      promptBlockNode = child
    } else {
      // Filter out empty headers or general spacing if they are just the "## 提示词" heading
      if (React.isValidElement(child) && (child.type === 'h2' || (child.props as any)?.mdxType === 'h2')) {
        const text = getTextContent(child)
        if (text.includes('提示词') || text.includes('Prompt') || text.trim() === '提示词') {
          return // Skip "提示词" heading as the PromptBlock card is self-explanatory
        }
      }
      otherNodes.push(child)
    }
  })

  // Fallback to standard flow if core elements are missing
  if (!imageGalleryNode && !caseHeaderNode && !promptBlockNode) {
    return <>{children}</>
  }

  // Get image URL for color palette
  const images = imageGalleryNode?.props?.images
  const firstImage = Array.isArray(images) ? images[0] : images
  const imageUrl = firstImage ? getFullImageUrl(firstImage) : ''

  const categoryLabel = metadata.category ? getCategoryLabel(metadata.category) : ''

  // Determine model estimate from metadata or defaults
  let modelEstimate = '🤖 Midjourney / Stable Diffusion'
  if (metadata.category === 'photography') {
    modelEstimate = '📷 Midjourney v6 / SDXL (Photography)'
  } else if (metadata.category === 'product') {
    modelEstimate = '🛍️ Midjourney v6 (Product Design)'
  } else if (metadata.category === 'people') {
    modelEstimate = '🧍 Midjourney v6 (Character Portrait)'
  }

  const renderLayout = () => (
    <div className={styles.container}>
      {/* Left Column: Image View & Color Palette */}
      <div className={styles.leftColumn}>
        {imageGalleryNode}
        {imageUrl && <ColorPalette imageUrl={imageUrl} />}
      </div>
      
      {/* Right Column: Metadata & Prompt Configurator */}
      <div className={styles.rightColumn}>
        {caseHeaderNode}
        
        {/* Modern Prompt Parameters Card */}
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>🏷️ 分类 / Category</span>
            <span className={styles.infoValue}>
              <span className={styles.tagPill}>{categoryLabel || metadata.category}</span>
            </span>
          </div>
          {metadata.source && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>📍 来源平台 / Source</span>
              <span className={styles.infoValue}>
                {metadata.source.platform || 'Unknown'}
              </span>
            </div>
          )}
          {metadata.source?.author && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>👤 作者 / Author</span>
              <span className={styles.infoValue}>
                {metadata.source.author}
              </span>
            </div>
          )}
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>⚙️ 预估模型 / Estimated Model</span>
            <span className={styles.infoValue}>
              {modelEstimate}
            </span>
          </div>
        </div>

        {/* The Prompt Editor Panel */}
        {promptBlockNode}
        
        {/* Render any additional paragraphs, notes, or tags */}
        {otherNodes.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--feishu-border)', paddingTop: '1.5rem' }}>
            {otherNodes}
          </div>
        )}
      </div>
    </div>
  )

  return renderLayout()
}
