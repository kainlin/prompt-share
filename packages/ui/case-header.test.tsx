import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaseHeader } from './case-header'

describe('CaseHeader', () => {
  it('renders title in an h1 element', () => {
    render(<CaseHeader title="Test Title" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Test Title')
  })

  it('renders emoji when provided', () => {
    render(<CaseHeader title="Test" emoji="📷" />)
    expect(screen.getByText('📷')).toBeInTheDocument()
  })

  it('does not crash when emoji is not provided', () => {
    render(<CaseHeader title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('renders tags when provided as string[]', () => {
    render(<CaseHeader title="Test" tags={['tag1', 'tag2']} />)
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
  })

  it('renders tags when provided as comma-separated string', () => {
    render(<CaseHeader title="Test" tags="tag1, tag2, tag3" />)
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
  })

  it('renders source platform and author when both provided', () => {
    render(
      <CaseHeader
        title="Test"
        source={{ platform: '小红书', author: 'test_author' }}
      />,
    )
    expect(screen.getByText(/小红书/)).toBeInTheDocument()
    expect(screen.getByText(/@test_author/)).toBeInTheDocument()
  })

  it('renders only platform when author is missing', () => {
    render(
      <CaseHeader title="Test" source={{ platform: '小红书' }} />,
    )
    expect(screen.getByText(/小红书/)).toBeInTheDocument()
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
  })

  it('does not crash when source is not provided', () => {
    render(<CaseHeader title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('renders date when provided', () => {
    render(<CaseHeader title="Test" date="2024-01-15" />)
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
  })
})
