'use client'

import React from 'react'
import styles from './case-layout.module.css'
import { ColorPalette } from './color-palette'
import { ImageGallery } from './image-gallery'
import { CaseHeader } from './case-header'
import { PromptBlock } from './prompt-block'
import { getFullImageUrl } from './lib/supabase-url'
import { IframeSandbox } from './iframe-sandbox'
import { VideoPlayer } from './video-player'
import { PaywallGuard } from './paywall-guard'

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
    preview?: {
      type: 'image' | 'video' | 'web'
      source: string | string[]
      poster?: string
    }
    paywall?: {
      isPremium: boolean
      price?: number
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

export function CasePageLayout({ children, metadata }: CasePageLayoutProps) {
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

  // Fallback to standard flow if core elements are missing (allowing preview-only or header-only cases just in case)
  if (!imageGalleryNode && !caseHeaderNode && !promptBlockNode && !metadata.preview) {
    return <>{children}</>
  }

  // Get image URL for color palette
  const images = imageGalleryNode?.props?.images
  const firstImage = Array.isArray(images) ? images[0] : images
  const imageUrl = firstImage ? getFullImageUrl(firstImage) : ''

  const categoryLabel = metadata.category ? getCategoryLabel(metadata.category) : ''

  // Determine model estimate from metadata or defaults
  let modelEstimate = '🤖 GPT Image-2'
  if (metadata.category === 'photography') {
    modelEstimate = '📷 GPT Image-2 (Photography)'
  } else if (metadata.category === 'product') {
    modelEstimate = '🛍️ GPT Image-2 (Product Design)'
  } else if (metadata.category === 'people') {
    modelEstimate = '🧍 GPT Image-2 (Character Portrait)'
  }

  // Helper to render the appropriate preview container
  const renderPreviewElement = () => {
    const previewType = metadata.preview?.type
    const previewSource = metadata.preview?.source

    if (previewType === 'web' && typeof previewSource === 'string') {
      return <IframeSandbox sourceUrl={previewSource} />
    }

    if (previewType === 'video' && typeof previewSource === 'string') {
      return <VideoPlayer videoUrl={previewSource} posterUrl={metadata.preview?.poster} />
    }

    return (
      <>
        {imageGalleryNode}
        {imageUrl && <ColorPalette imageUrl={imageUrl} />}
      </>
    )
  }

  // Helper to wrap the PromptBlock with PaywallGuard if it is premium
  const renderPromptBlockElement = () => {
    if (!promptBlockNode) return null

    const paywallInfo = metadata.paywall
    if (paywallInfo?.isPremium) {
      const promptText = promptBlockNode.props?.children || ''
      return (
        <PaywallGuard
          price={paywallInfo.price}
          isPremium={true}
          promptText={promptText}
          caseIdentifier={metadata.title || ''}
        >
          {promptBlockNode}
        </PaywallGuard>
      )
    }

    return promptBlockNode
  }

  const renderLayout = () => (
    <div className={styles.container}>
      {/* Left Column: Image View, Video View or Iframe Sandbox */}
      <div className={styles.leftColumn}>
        {renderPreviewElement()}
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

        {/* The Prompt Editor Panel (with optional Paywall Guard) */}
        {renderPromptBlockElement()}
        
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
