import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

beforeAll(() => {
  vi.stubEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    'https://test-project.supabase.co',
  )
})

describe('ImageGallery', () => {
  let ImageGallery: React.ComponentType<{
    images: string | string[]
    alt?: string
  }>

  beforeAll(async () => {
    const mod = await import('./image-gallery')
    ImageGallery = mod.ImageGallery
  })

  it('returns null for empty array', () => {
    const { container } = render(<ImageGallery images={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('does not crash with empty images', () => {
    const { container } = render(<ImageGallery images={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders thumbnail img elements for each image in array', () => {
    render(<ImageGallery images={['case1_full.jpg', 'case2_full.jpg']} />)
    const imgs = screen.getAllByRole('img')
    // Should have at least 2 thumbnail images (one per file)
    expect(imgs.length).toBeGreaterThanOrEqual(2)
  })

  it('uses getThumbnailUrl which maps full image names to thumbnails', () => {
    render(<ImageGallery images={['case1_full.jpg']} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src')
    expect(img.getAttribute('src')).toContain('thumbnails/case1_thumb.webp')
  })

  it('renders single image when passed a string instead of array', () => {
    render(<ImageGallery images="case1_full.jpg" />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toContain('thumbnails/case1_thumb.webp')
  })

  it('clicking thumbnail opens lightbox modal', () => {
    render(<ImageGallery images={['case1_full.jpg', 'case2_full.jpg']} />)
    const thumbnails = screen.getAllByRole('button')
    fireEvent.click(thumbnails[0])
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })

  it('pressing Escape closes lightbox', () => {
    render(<ImageGallery images={['case1_full.jpg']} />)
    const thumbnail = screen.getByRole('button')
    fireEvent.click(thumbnail)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keyboard navigation: ArrowRight goes next, ArrowLeft goes previous', () => {
    render(
      <ImageGallery
        images={['case1_full.jpg', 'case2_full.jpg', 'case3_full.jpg']}
        alt="Test"
      />,
    )
    const thumbnails = screen.getAllByRole('button')
    // Open first image
    fireEvent.click(thumbnails[0])

    const dialog = screen.getByRole('dialog')
    // Should show 1 / 3 in the lightbox info bar
    expect(within(dialog).getByText(/1 \/ 3/)).toBeInTheDocument()

    // Press ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    // Should show 2 / 3
    expect(within(dialog).getByText(/2 \/ 3/)).toBeInTheDocument()

    // Press ArrowLeft
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    // Should show 1 / 3 again
    expect(within(dialog).getByText(/1 \/ 3/)).toBeInTheDocument()
  })
})
