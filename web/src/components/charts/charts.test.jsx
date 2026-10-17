import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BarList from './BarList'
import ChartCard from './ChartCard'
import ColumnChart from './ColumnChart'

const format = (v) => `R${v}`
const categories = [{ label: 'Food', value: 300 }, { label: 'Transport', value: 120 }]

describe('charts', () => {
  it('gives every bar an accessible name with its value', () => {
    render(<BarList data={categories} format={format} />)
    expect(screen.getByLabelText('Food: R300')).toBeInTheDocument()
    expect(screen.getByLabelText('Transport: R120')).toHaveAttribute('tabindex', '0')
  })

  it('labels only the tallest column until one is focused', async () => {
    const days = [
      { key: 'a', label: 'Monday', short: 'Mon', value: 100 },
      { key: 'b', label: 'Tuesday', short: 'Tue', value: 400 },
    ]
    render(<ColumnChart data={days} format={format} />)
    expect(screen.getByText('R400')).toBeInTheDocument()
    expect(screen.queryByText('R100')).toBeNull()

    await userEvent.tab()
    expect(screen.getByLabelText('Monday: R100')).toHaveFocus()
    expect(screen.getByText('R100')).toBeInTheDocument()
  })

  it('switches to a table view with every value', async () => {
    render(
      <ChartCard title="Spending" rows={categories} columns={[{ key: 'label', label: 'Category' }, { key: 'value', label: 'Spent', numeric: true, format }]}>
        <BarList data={categories} format={format} />
      </ChartCard>,
    )
    await userEvent.click(screen.getByRole('button', { name: /table/i }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /chart/i })).toHaveAttribute('aria-pressed', 'true')
  })
})
