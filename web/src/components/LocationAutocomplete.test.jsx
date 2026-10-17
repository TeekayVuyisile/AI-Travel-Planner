import { useState } from 'react'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import api from '../lib/api'
import LocationAutocomplete from './LocationAutocomplete'

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }))

const places = [
  { name: 'Knysna', region: 'Western Cape', country: 'South Africa', lat: -34.03, lng: 23.04 },
  { name: 'Knysa', region: 'Panevėžys County', country: 'Lithuania', lat: 55.7, lng: 24.9 },
]

// Small harness that owns the input text, like the trip wizard does
const Harness = ({ onSelect, onUnavailable }) => {
  const [value, setValue] = useState('')
  return <LocationAutocomplete label="City" value={value} onInputChange={setValue} onSelect={onSelect} onUnavailable={onUnavailable} />
}

describe('LocationAutocomplete', () => {
  beforeEach(() => vi.mocked(api.get).mockReset())

  it('suggests places and picks one with the keyboard', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: places })
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox', { name: 'City' }), 'knys')
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['KnysnaWestern Cape, South Africa', 'KnysaPanevėžys County, Lithuania'])
    expect(api.get).toHaveBeenCalledWith('/places/autocomplete', expect.objectContaining({ params: expect.objectContaining({ q: 'knys', type: 'city' }) }))

    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith(places[0])
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('does not search for a single character', async () => {
    render(<Harness onSelect={vi.fn()} />)
    await userEvent.type(screen.getByRole('combobox'), 'k')
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(api.get).not.toHaveBeenCalled()
  })

  it('says when place search is down and reports it to the parent', async () => {
    // A plain function rather than a spy: Vitest 5 reports a rejection returned from a spy as a test
    // failure even when the code under test catches it, as the component does here.
    const spy = api.get
    api.get = () => Promise.reject(Object.assign(new Error('503'), { name: 'AxiosError' }))
    onTestFinished(() => { api.get = spy })
    const onUnavailable = vi.fn()
    render(<Harness onSelect={vi.fn()} onUnavailable={onUnavailable} />)

    await userEvent.type(screen.getByRole('combobox'), 'knysna')
    expect(await screen.findByText('Place search is unavailable right now.')).toBeInTheDocument()
    expect(onUnavailable).toHaveBeenLastCalledWith(true)
  })
})
