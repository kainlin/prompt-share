import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { IframeSandbox } from './iframe-sandbox'

describe('IframeSandbox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const sampleUrl = 'https://v0.dev/r/abc123'

  function getIframe(): HTMLIFrameElement {
    return document.querySelector('iframe')!
  }

  it('renders device control buttons', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)
    expect(screen.getByText('🖥️ Desktop')).toBeInTheDocument()
    expect(screen.getByText('📟 Tablet')).toBeInTheDocument()
    expect(screen.getByText('📱 Mobile')).toBeInTheDocument()
  })

  it('renders iframe with correct src and sandbox attributes', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)
    const iframe = getIframe()
    expect(iframe).toBeInTheDocument()
    expect(iframe.src).toContain('v0.dev/r/abc123')
    const sandboxAttr = iframe.getAttribute('sandbox') || ''
    expect(sandboxAttr).toContain('allow-scripts')
    expect(sandboxAttr).toContain('allow-same-origin')
  })

  it('sets Desktop as default active device', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)
    const desktopBtn = screen.getByText('🖥️ Desktop')
    expect(desktopBtn.className).toContain('active')
  })

  it('switches active device class on button click', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)
    const tabletBtn = screen.getByText('📟 Tablet')

    fireEvent.click(tabletBtn)

    expect(tabletBtn.className).toContain('active')
  })

  it('shows loading skeleton initially', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)
    expect(screen.getByText('加载在线交互沙箱...')).toBeInTheDocument()
  })

  it('hides skeleton after iframe onLoad fires', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)
    const iframe = getIframe()

    fireEvent.load(iframe)

    expect(screen.queryByText('加载在线交互沙箱...')).not.toBeInTheDocument()
  })

  it('shows error overlay after timeout when iframe does not load', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)

    // Skeleton should be visible
    expect(screen.getByText('加载在线交互沙箱...')).toBeInTheDocument()

    // Advance past the 10s timeout
    act(() => {
      vi.advanceTimersByTime(11_000)
    })

    // Skeleton should be gone, error overlay should appear
    expect(screen.queryByText('加载在线交互沙箱...')).not.toBeInTheDocument()
    expect(screen.getByText('此网页可能不允许嵌入预览')).toBeInTheDocument()
    expect(screen.getByText('在新标签页中打开 ↗')).toBeInTheDocument()
  })

  it('error overlay link opens in new tab', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)

    act(() => {
      vi.advanceTimersByTime(11_000)
    })

    const link = screen.getByText('在新标签页中打开 ↗')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('href')).toContain('v0.dev/r/abc123')
  })

  it('resets loading state when sourceUrl changes', () => {
    const { rerender } = render(<IframeSandbox sourceUrl={sampleUrl} />)

    // Simulate load
    fireEvent.load(getIframe())
    expect(screen.queryByText('加载在线交互沙箱...')).not.toBeInTheDocument()

    // Change URL
    rerender(<IframeSandbox sourceUrl="https://v0.dev/r/new456" />)

    // Should show skeleton again
    expect(screen.getByText('加载在线交互沙箱...')).toBeInTheDocument()
  })

  it('renders LIVE PREVIEW badge', () => {
    render(<IframeSandbox sourceUrl={sampleUrl} />)
    expect(screen.getByText('LIVE PREVIEW')).toBeInTheDocument()
  })
})
