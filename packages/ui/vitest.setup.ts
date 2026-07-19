import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Manually extend expect with jest-dom matchers
expect.extend(matchers)

// Auto-cleanup rendered components after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js navigation hooks used by CategoryGrid
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useParams: () => ({ lang: 'zh' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/zh',
}))

// Mock navigator.clipboard for PromptBlock copy tests
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn(() => Promise.resolve()) },
  writable: true,
})
