import { useEffect, useId, useRef, useState } from 'react'
import { LuMapPin, LuSearch } from 'react-icons/lu'
import api from '../lib/api'
import { cn } from '../lib/cn'
import { describePlace } from '../lib/trips'
import Spinner from './ui/Spinner'

// WAI-ARIA combobox with a listbox popup. `type` is 'city' for destinations or 'place' for
// activities (biased towards `near`). Calls onSelect with { name, city, region, country, lat, lng }.
// onUnavailable(true/false) reports whether the search service is down, so the parent can offer a fallback.
const LocationAutocomplete = ({ label, type = 'city', near, value, onInputChange, onSelect, onUnavailable, error, hint, placeholder, autoFocus }) => {
  const id = useId()
  const listId = `${id}-list`
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const skipNextSearch = useRef(false)

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    const query = value.trim()
    if (query.length < 2) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = { q: query, type, ...(near ? { lat: near.lat, lng: near.lng } : {}) }
        const response = await api.get('/places/autocomplete', { params, signal: controller.signal })
        setResults(response.data)
        setActive(-1)
        setOpen(true)
        setUnavailable(false)
        onUnavailable?.(false)
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setResults([])
          setUnavailable(true)
          setOpen(false)
          onUnavailable?.(true)
        }
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value, type, near, onUnavailable])

  const choose = (place) => {
    skipNextSearch.current = true
    setOpen(false)
    onSelect(place)
  }

  const onKeyDown = (event) => {
    if (!showList || results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      choose(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  // Short queries never search, so hide whatever the last search returned
  const showList = open && value.trim().length >= 2
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={cn(
            'block h-11 w-full rounded-xl border bg-surface pl-10 pr-10 text-base text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15',
            error ? 'border-rose-400' : 'border-slate-300',
          )}
        />
        {loading && <Spinner className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-surface p-1.5 shadow-xl shadow-black/10"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">No matching places</li>
          ) : results.map((place, index) => (
            <li
              key={`${place.name}-${place.lat}-${place.lng}`}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(place)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2',
                index === active ? 'bg-brand-50' : 'hover:bg-slate-50',
              )}
            >
              <LuMapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">{place.name}</span>
                <span className="block truncate text-xs text-slate-500">{describePlace(place) || place.kind}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">{showList ? `${results.length} suggestions available` : ''}</p>
      {unavailable && !error && (
        <p className="mt-1.5 text-sm text-amber-700" role="status">Place search is unavailable right now.</p>
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-rose-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export default LocationAutocomplete
