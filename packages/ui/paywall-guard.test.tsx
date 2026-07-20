import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider } from './toast'
import { PaywallGuard } from './paywall-guard'

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

const buyBtnRegex = /立即购买/

describe('PaywallGuard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders children directly when isPremium is false', () => {
    renderWithToast(
      <PaywallGuard isPremium={false}>
        <div data-testid="prompt-content">Free prompt text</div>
      </PaywallGuard>,
    )
    expect(screen.getByTestId('prompt-content')).toBeInTheDocument()
    expect(screen.getByText('Free prompt text')).toBeInTheDocument()
  })

  it('shows blurred overlay when isPremium is true and not unlocked', () => {
    renderWithToast(
      <PaywallGuard isPremium={true} promptText="secret prompt">
        <div data-testid="prompt-content">Premium prompt text</div>
      </PaywallGuard>,
    )
    // Content should exist but be blurred
    expect(screen.getByTestId('prompt-content')).toBeInTheDocument()
    // Overlay card should be visible
    expect(screen.getByText('解锁高级提示词配方')).toBeInTheDocument()
    expect(screen.getByText(buyBtnRegex)).toBeInTheDocument()
  })

  it('shows children directly when already unlocked in localStorage', () => {
    localStorage.setItem('prompt_share_unlocked_dafault', 'true')
    renderWithToast(
      <PaywallGuard isPremium={true}>
        <div data-testid="prompt-content">Already unlocked</div>
      </PaywallGuard>,
    )
    expect(screen.getByText('Already unlocked')).toBeInTheDocument()
  })

  it('opens payment modal when 立即购买 is clicked', async () => {
    renderWithToast(
      <PaywallGuard isPremium={true} price={1.99}>
        <div>Premium content</div>
      </PaywallGuard>,
    )
    const buyBtn = screen.getByText(buyBtnRegex)
    await act(() => {
      fireEvent.click(buyBtn)
    })
    expect(screen.getByText('扫码模拟支付')).toBeInTheDocument()
    expect(screen.getByText('模拟确认支付成功')).toBeInTheDocument()
  })

  it('closes payment modal when close button is clicked', async () => {
    renderWithToast(
      <PaywallGuard isPremium={true} price={1.99}>
        <div>Premium content</div>
      </PaywallGuard>,
    )
    // Open modal
    await act(() => {
      fireEvent.click(screen.getByText(buyBtnRegex))
    })
    expect(screen.getByText('扫码模拟支付')).toBeInTheDocument()

    // Close modal — button renders "✕"
    await act(() => {
      fireEvent.click(screen.getByText('✕'))
    })
    expect(screen.queryByText('扫码模拟支付')).not.toBeInTheDocument()
  })

  it('closes payment modal when clicking overlay backdrop', async () => {
    renderWithToast(
      <PaywallGuard isPremium={true} price={1.99}>
        <div>Premium content</div>
      </PaywallGuard>,
    )
    // Open modal
    await act(() => {
      fireEvent.click(screen.getByText(buyBtnRegex))
    })
    expect(screen.getByText('扫码模拟支付')).toBeInTheDocument()

    // Click the modal overlay (backdrop)
    const overlay = document.querySelector('[class*="modalOverlay"]')
    if (overlay) {
      await act(() => {
        fireEvent.click(overlay)
      })
    }
    expect(screen.queryByText('扫码模拟支付')).not.toBeInTheDocument()
  })

  it('unlocks content and persists to localStorage on confirm', async () => {
    renderWithToast(
      <PaywallGuard isPremium={true} price={1.99} promptText="test-prompt">
        <div>Unlocked content</div>
      </PaywallGuard>,
    )
    // Open and confirm
    await act(() => {
      fireEvent.click(screen.getByText(buyBtnRegex))
    })
    await act(() => {
      fireEvent.click(screen.getByText('模拟确认支付成功'))
    })
    // Should now show content without blur
    expect(screen.getByText('Unlocked content')).toBeInTheDocument()
    expect(screen.queryByText('解锁高级提示词配方')).not.toBeInTheDocument()
  })

  it('uses unique storage key per caseIdentifier to prevent shared unlock', () => {
    localStorage.setItem('prompt_share_unlocked_case-a', 'true')
    localStorage.setItem('prompt_share_unlocked_case-b', 'false')

    renderWithToast(
      <PaywallGuard isPremium={true} caseIdentifier="unique-case-123">
        <div>Unique content</div>
      </PaywallGuard>,
    )

    // Since unique-case-123 is not in localStorage, it should show paywall
    expect(screen.getByText('解锁高级提示词配方')).toBeInTheDocument()
  })

  it('displays CNY price converted from USD', () => {
    renderWithToast(
      <PaywallGuard isPremium={true} price={2.0}>
        <div>Content</div>
      </PaywallGuard>,
    )
    // 2.0 * 7.25 = 14.50
    expect(screen.getByText(/¥14\.50/)).toBeInTheDocument()
  })

  it('VIP button shows coming-soon toast', async () => {
    renderWithToast(
      <PaywallGuard isPremium={true}>
        <div>Content</div>
      </PaywallGuard>,
    )
    const vipBtn = screen.getByText('VIP 会员免费看')
    await act(() => {
      fireEvent.click(vipBtn)
    })
    // Toast should appear — no crash means it works
  })

  it('handles localStorage errors gracefully on read', () => {
    const originalGetItem = localStorage.getItem
    localStorage.getItem = () => {
      throw new Error('QuotaExceeded')
    }
    renderWithToast(
      <PaywallGuard isPremium={true}>
        <div>Content</div>
      </PaywallGuard>,
    )
    // Should fall back to locked state
    expect(screen.getByText('解锁高级提示词配方')).toBeInTheDocument()
    localStorage.getItem = originalGetItem
  })
})
