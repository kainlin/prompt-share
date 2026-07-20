import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToastProvider } from './toast'
import { CasePageLayout } from './case-page-layout'
import { PromptBlock } from './prompt-block'
import { CaseHeader } from './case-header'
import { ImageGallery } from './image-gallery'

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

const baseMetadata = {
  title: 'Test Case',
  category: 'photography',
  tags: [],
  emoji: '📷',
  cover: 'cover.webp',
  images: ['img1.jpg', 'img2.jpg'],
  source: {
    platform: '小红书',
    author: 'test_author',
  },
}

describe('CasePageLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders metadata info card', () => {
    renderWithProviders(
      <CasePageLayout metadata={baseMetadata}>
        <CaseHeader title="Test Case" category="photography" emoji="📷" />
        <PromptBlock>Test prompt</PromptBlock>
      </CasePageLayout>,
    )
    expect(screen.getByText('🏷️ 分类 / Category')).toBeInTheDocument()
    expect(screen.getByText('📍 来源平台 / Source')).toBeInTheDocument()
    expect(screen.getByText('小红书')).toBeInTheDocument()
  })

  it('renders author row when author is present', () => {
    renderWithProviders(
      <CasePageLayout metadata={baseMetadata}>
        <PromptBlock>Test</PromptBlock>
      </CasePageLayout>,
    )
    expect(screen.getByText('test_author')).toBeInTheDocument()
  })

  it('renders GPT Image-2 model estimate for photography category', () => {
    renderWithProviders(
      <CasePageLayout metadata={baseMetadata}>
        <PromptBlock>Test</PromptBlock>
      </CasePageLayout>,
    )
    expect(screen.getByText('📷 GPT Image-2 (Photography)')).toBeInTheDocument()
  })

  it('renders correct model estimate for product category', () => {
    renderWithProviders(
      <CasePageLayout
        metadata={{ ...baseMetadata, category: 'product' }}
      >
        <PromptBlock>Test</PromptBlock>
      </CasePageLayout>,
    )
    expect(
      screen.getByText('🛍️ GPT Image-2 (Product Design)'),
    ).toBeInTheDocument()
  })

  it('renders correct model estimate for people category', () => {
    renderWithProviders(
      <CasePageLayout metadata={{ ...baseMetadata, category: 'people' }}>
        <PromptBlock>Test</PromptBlock>
      </CasePageLayout>,
    )
    expect(
      screen.getByText('🧍 GPT Image-2 (Character Portrait)'),
    ).toBeInTheDocument()
  })

  it('renders IframeSandbox when preview type is web', () => {
    renderWithProviders(
      <CasePageLayout
        metadata={{
          ...baseMetadata,
          preview: { type: 'web', source: 'https://v0.dev/r/test' },
        }}
      >
        <PromptBlock>Test</PromptBlock>
      </CasePageLayout>,
    )
    expect(screen.getByText('LIVE PREVIEW')).toBeInTheDocument()
  })

  it('renders PaywallGuard when paywall.isPremium is true', () => {
    renderWithProviders(
      <CasePageLayout
        metadata={{
          ...baseMetadata,
          paywall: { isPremium: true, price: 2.99 },
        }}
      >
        <PromptBlock>Premium prompt here</PromptBlock>
      </CasePageLayout>,
    )
    // Should show paywall overlay
    expect(screen.getByText('解锁高级提示词配方')).toBeInTheDocument()
  })

  it('does not show PaywallGuard when isPremium is false', () => {
    renderWithProviders(
      <CasePageLayout
        metadata={{
          ...baseMetadata,
          paywall: { isPremium: false },
        }}
      >
        <PromptBlock>Free prompt here</PromptBlock>
      </CasePageLayout>,
    )
    expect(screen.queryByText('解锁高级提示词配方')).not.toBeInTheDocument()
    expect(screen.getByText('Free prompt here')).toBeInTheDocument()
  })

  it('falls back to raw children when no core elements are present and no preview', () => {
    const { container } = renderWithProviders(
      <CasePageLayout metadata={{}}>
        <p>Plain content without any special components</p>
      </CasePageLayout>,
    )
    expect(
      screen.getByText('Plain content without any special components'),
    ).toBeInTheDocument()
  })

  it('displays category label in info card', () => {
    renderWithProviders(
      <CasePageLayout metadata={baseMetadata}>
        <PromptBlock>Test</PromptBlock>
      </CasePageLayout>,
    )
    expect(
      screen.getByText('写实摄影 (Photography)'),
    ).toBeInTheDocument()
  })
})
