import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServerStatusProvider } from '../contexts/ServerStatusContext'
import ServerNotice from './ServerNotice'

// Plain functions rather than mock spies: see the Vitest note in CLAUDE.md
const ok = () => Promise.resolve(new Response('{}', { status: 200 }))
const never = () => new Promise(() => {})

const renderNotice = (props) =>
  render(
    <ServerStatusProvider slowAfterMs={20} retryMs={10} {...props}>
      <ServerNotice />
    </ServerStatusProvider>,
  )

describe('ServerNotice', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stays hidden when the API answers straight away', async () => {
    vi.stubGlobal('fetch', ok)
    renderNotice()
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('explains a slow wake-up, then hides once the API responds', async () => {
    let wake
    vi.stubGlobal('fetch', () => new Promise((resolve) => { wake = () => resolve(new Response('{}', { status: 200 })) }))
    renderNotice()

    expect(await screen.findByText('Waking up the demo server…')).toBeInTheDocument()
    wake()
    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('keeps retrying while the API is unreachable', async () => {
    let calls = 0
    vi.stubGlobal('fetch', () => {
      calls += 1
      return calls < 3 ? Promise.reject(new TypeError('Failed to fetch')) : ok()
    })
    renderNotice()

    await vi.waitFor(() => expect(calls).toBe(3))
    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('says so when the API never comes back', async () => {
    vi.stubGlobal('fetch', never)
    renderNotice({ giveUpAfterMs: 0 })
    expect(await screen.findByText('The server isn’t responding right now.')).toBeInTheDocument()
  })
})
