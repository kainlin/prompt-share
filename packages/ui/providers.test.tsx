import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Providers } from './providers'
import { useToast } from './toast'

function ChildWithToast() {
  const showToast = useToast()
  return <button onClick={() => showToast('test')}>Click me</button>
}

describe('Providers', () => {
  it('renders children', () => {
    render(
      <Providers>
        <div data-testid="child">Hello World</div>
      </Providers>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('wraps children with ToastProvider context', () => {
    render(
      <Providers>
        <ChildWithToast />
      </Providers>,
    )
    const button = screen.getByText('Click me')
    expect(button).toBeInTheDocument()

    // Click the button to trigger a toast
    fireEvent.click(button)
    // Toast message should appear (format: "✅ test")
    expect(screen.getByText(/test/)).toBeInTheDocument()
  })
})
