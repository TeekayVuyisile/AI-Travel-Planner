import { createContext, useContext, useEffect, useState } from 'react'
import { API_BASE } from '../lib/apiBase'

// The API runs on a free Render instance that sleeps when idle and takes up to a minute
// to wake. This page comes from the static site, which never sleeps, so on load we start
// waking the API straight away and say what's happening if it's slow.
// status: checking | waking | ready | offline
const ServerStatusContext = createContext('ready')

export const ServerStatusProvider = ({ children, slowAfterMs = 1500, retryMs = 3000, giveUpAfterMs = 150_000 }) => {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false
    const started = Date.now()
    const slowTimer = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'checking' ? 'waking' : s))
    }, slowAfterMs)

    const poll = async () => {
      while (!cancelled && Date.now() - started < giveUpAfterMs) {
        try {
          const res = await fetch(`${API_BASE}/health`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
          if (res.ok) {
            if (!cancelled) setStatus('ready')
            return
          }
        } catch {
          // Still asleep or starting up: try again
        }
        await new Promise((resolve) => setTimeout(resolve, retryMs))
      }
      if (!cancelled) setStatus('offline')
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
    }
  }, [slowAfterMs, retryMs, giveUpAfterMs])

  return <ServerStatusContext.Provider value={status}>{children}</ServerStatusContext.Provider>
}

export const useServerStatus = () => useContext(ServerStatusContext)
