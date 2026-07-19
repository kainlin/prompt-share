import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryGrid } from './category-grid'

describe('CategoryGrid', () => {
  it('renders 3 category cards', () => {
    render(<CategoryGrid />)
    const cards = screen.getAllByRole('button')
    expect(cards).toHaveLength(3)
  })

  it('renders Chinese category titles', () => {
    render(<CategoryGrid />)
    expect(screen.getByText('摄影与写实')).toBeInTheDocument()
    expect(screen.getByText('产品与电商')).toBeInTheDocument()
    expect(screen.getByText('人物与角色')).toBeInTheDocument()
  })

  it('shows category counts in the cards', () => {
    render(<CategoryGrid />)
    expect(screen.getByText('309 例')).toBeInTheDocument()
    expect(screen.getByText('140 例')).toBeInTheDocument()
    expect(screen.getByText('65 例')).toBeInTheDocument()
  })

  it('has clickable cards that navigate', () => {
    render(<CategoryGrid />)
    const cards = screen.getAllByRole('button')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach((card) => {
      expect(card).toHaveAttribute('tabIndex', '0')
    })
  })
})
