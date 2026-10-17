import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Markdown from './Markdown'

describe('Markdown', () => {
  it('renders paragraphs, bold text and lists', () => {
    const { container } = render(<Markdown>{'Pack a **jacket**.\n\n- Sunscreen\n- Hat'}</Markdown>)
    expect(screen.getByText('jacket').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Sunscreen', 'Hat'])
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('turns pipe tables into real tables and skips the separator row', () => {
    render(<Markdown>{'| Mode | Cost |\n|---|---|\n| Uber | R150 |'}</Markdown>)
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Mode', 'Cost'])
    expect(screen.getAllByRole('cell').map((td) => td.textContent)).toEqual(['Uber', 'R150'])
  })

  it('shows HTML from the model as text instead of rendering it', () => {
    const { container } = render(<Markdown>{'<img src=x onerror="alert(1)"> **hi**'}</Markdown>)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
  })
})
