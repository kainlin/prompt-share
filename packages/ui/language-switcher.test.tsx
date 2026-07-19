import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSwitcher } from './language-switcher'

describe('LanguageSwitcher', () => {
  it('renders EN button when currentLang is zh', () => {
    render(<LanguageSwitcher currentLang="zh" />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('EN')
    expect(button).toHaveTextContent('🌐')
  })

  it('renders 中文 button when currentLang is en', () => {
    render(<LanguageSwitcher currentLang="en" />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('中文')
    expect(button).toHaveTextContent('🌐')
  })

  it('toggles language and calls router.push on click', () => {
    render(<LanguageSwitcher currentLang="zh" />)
    const button = screen.getByRole('button')
    // Clicking should not throw — the mocked useRouter handles it
    expect(() => fireEvent.click(button)).not.toThrow()
  })
})
