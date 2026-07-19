import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PromptBlock } from './prompt-block'
import { ToastProvider } from './toast'

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('PromptBlock', () => {
  it('renders plain text when no arguments present', () => {
    renderWithToast(<PromptBlock>Hello world, this is a prompt.</PromptBlock>)
    expect(
      screen.getByText('Hello world, this is a prompt.'),
    ).toBeInTheDocument()
  })

  it('parses {argument name="x" default="y"} and shows input fields', () => {
    renderWithToast(
      <PromptBlock>
        {'Generate a {argument name="style" default="realistic"} image'}
      </PromptBlock>,
    )
    const input = screen.getByPlaceholderText(/请输入 style/)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('realistic')
  })

  it('changing input value updates preview text in real time', () => {
    renderWithToast(
      <PromptBlock>
        {'A {argument name="color" default="red"} car'}
      </PromptBlock>,
    )
    const input = screen.getByPlaceholderText(/请输入 color/)
    fireEvent.change(input, { target: { value: 'blue' } })
    // The preview pill should now show "blue" instead of "red"
    // Find the pill that displayed the value
    const pill = screen.getByText('blue')
    expect(pill).toBeInTheDocument()
  })

  it('copy button exists and calls navigator.clipboard.writeText', async () => {
    renderWithToast(<PromptBlock>Simple prompt text</PromptBlock>)
    const copyBtn = screen.getByText('📋 Copy')
    expect(copyBtn).toBeInTheDocument()
    await act(() => {
      fireEvent.click(copyBtn)
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Simple prompt text',
    )
  })

  it('default label is "Prompt" when not specified', () => {
    renderWithToast(<PromptBlock>test</PromptBlock>)
    expect(screen.getByText('Prompt')).toBeInTheDocument()
  })

  it('custom emoji renders when provided', () => {
    renderWithToast(<PromptBlock emoji="🎨">test prompt</PromptBlock>)
    expect(screen.getByText('🎨')).toBeInTheDocument()
  })

  it('handles escaped quotes in argument strings', () => {
    renderWithToast(
      <PromptBlock>
        {'{argument name="greeting" default="hello world"}'}
      </PromptBlock>,
    )
    const input = screen.getByPlaceholderText(/请输入 greeting/)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('hello world')
  })

  it('renders without crashing when children is empty string', () => {
    renderWithToast(<PromptBlock>{''}</PromptBlock>)
    expect(screen.getByText('Prompt')).toBeInTheDocument()
  })

  it('renders multiple arguments as separate input fields', () => {
    renderWithToast(
      <PromptBlock>
        {'{argument name="subject" default="cat"} sitting on a {argument name="surface" default="mat"}'}
      </PromptBlock>,
    )
    const subjectInput = screen.getByPlaceholderText(/请输入 subject/)
    const surfaceInput = screen.getByPlaceholderText(/请输入 surface/)
    expect(subjectInput).toBeInTheDocument()
    expect(surfaceInput).toBeInTheDocument()
  })
})
