import { describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from './toast'

function ToastTester({ message }: { message: string }) {
  const showToast = useToast()
  return <button onClick={() => showToast(message)}>Show Toast</button>
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})

describe('useToast', () => {
  it('returns a function', () => {
    let toastFn: ((message: string) => void) | null = null
    function TestComponent() {
      toastFn = useToast()
      return null
    }
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )
    expect(typeof toastFn).toBe('function')
  })

  it('calling toast function shows a toast message that auto-dismisses', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <ToastTester message="Test toast message" />
      </ToastProvider>,
    )

    const button = screen.getByText('Show Toast')
    act(() => {
      button.click()
    })

    expect(screen.getByText(/Test toast message/)).toBeInTheDocument()

    // Auto-dismisses after 2000ms
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.queryByText(/Test toast message/)).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
