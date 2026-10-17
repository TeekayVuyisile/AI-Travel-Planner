import { useSyncExternalStore } from 'react'

// Theme preference: 'light', 'dark' or 'system' (follow the OS). Stored per browser; index.html applies
// it before first paint so pages never flash the wrong theme.
const KEY = 'theme'
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const listeners = new Set()

const read = () => {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

const apply = (preference) => {
  const dark = preference === 'dark' || (preference === 'system' && media?.matches)
  document.documentElement.classList.toggle('dark', Boolean(dark))
}

export const setTheme = (preference) => {
  try {
    if (preference === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, preference)
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this page view only
  }
  apply(preference)
  listeners.forEach((listener) => listener())
}

// Follow OS changes while on "system"
media?.addEventListener('change', () => {
  if (read() === 'system') apply('system')
})

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useTheme = () => useSyncExternalStore(subscribe, read, () => 'system')
