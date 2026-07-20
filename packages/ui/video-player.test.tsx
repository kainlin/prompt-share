import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { VideoPlayer } from './video-player'

describe('VideoPlayer', () => {
  beforeEach(() => {
    // Mock HTMLMediaElement.prototype.play
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      value: vi.fn(() => Promise.resolve()),
      writable: true,
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      value: vi.fn(),
      writable: true,
    })
  })

  const sampleVideoUrl = 'https://example.com/video.mp4'
  const samplePosterUrl = 'https://example.com/poster.jpg'

  function getVideo(): HTMLVideoElement {
    return document.querySelector('video')!
  }

  it('renders video element with src and poster', () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} posterUrl={samplePosterUrl} />,
    )
    const video = getVideo()
    expect(video).toBeInTheDocument()
    expect(video.src).toContain('video.mp4')
    expect(video.poster).toContain('poster.jpg')
  })

  it('shows play overlay in gallery card mode', () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} isGalleryCard={true} />,
    )
    expect(screen.getByText('悬停自动播放')).toBeInTheDocument()
  })

  it('does not show play overlay in detail player mode', () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} isGalleryCard={false} />,
    )
    expect(screen.queryByText('悬停自动播放')).not.toBeInTheDocument()
  })

  it('shows controls in detail player mode', () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} isGalleryCard={false} />,
    )
    const video = getVideo()
    expect(video.controls).toBe(true)
  })

  it('hides controls in gallery card mode', () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} isGalleryCard={true} />,
    )
    const video = getVideo()
    expect(video.controls).toBe(false)
  })

  it('has muted and loop attributes for autoplay', () => {
    render(<VideoPlayer videoUrl={sampleVideoUrl} />)
    const video = getVideo()
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
  })

  it('calls play on mouse enter in gallery card mode', async () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} isGalleryCard={true} />,
    )
    const container = document.querySelector('[class*="container"]')
    expect(container).not.toBeNull()

    await act(() => {
      fireEvent.mouseEnter(container!)
    })
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })

  it('calls pause and resets currentTime on mouse leave in gallery card mode', async () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} isGalleryCard={true} />,
    )
    const container = document.querySelector('[class*="container"]')

    await act(() => {
      fireEvent.mouseEnter(container!)
    })

    const video = getVideo()
    Object.defineProperty(video, 'currentTime', { value: 5, writable: true })

    await act(() => {
      fireEvent.mouseLeave(container!)
    })
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('does not call play on mouse enter in detail mode', async () => {
    render(
      <VideoPlayer videoUrl={sampleVideoUrl} isGalleryCard={false} />,
    )
    const container = document.querySelector('[class*="container"]')

    await act(() => {
      fireEvent.mouseEnter(container!)
    })
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
  })

  it('renders without poster when posterUrl is omitted', () => {
    render(<VideoPlayer videoUrl={sampleVideoUrl} />)
    const video = getVideo()
    expect(video).toBeInTheDocument()
    expect(video.poster).toBe('')
  })

  it('uses preload metadata attribute', () => {
    render(<VideoPlayer videoUrl={sampleVideoUrl} />)
    const video = getVideo()
    expect(video.preload).toBe('metadata')
  })
})
