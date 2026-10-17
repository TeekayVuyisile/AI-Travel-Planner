import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LuMapPinOff, LuMap } from 'react-icons/lu'
import api, { getErrorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatMoney, tripLength } from '../../lib/format'
import { dayColor } from '../../lib/trips'
import Alert from '../ui/Alert'
import EmptyState from '../ui/EmptyState'
import Spinner from '../ui/Spinner'

// Numbered pin in the day's colour. A divIcon avoids Leaflet's default image markers,
// which break under bundlers, and lets the number match the list beside the map.
// Unverified (AI-estimated) locations get a hollow pin.
const pinIcon = (day, number, active, verified) => L.divIcon({
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16],
  html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;
    background:${verified ? dayColor(day) : '#fff'};color:${verified ? '#fff' : dayColor(day)};
    font:600 12px/1 'Plus Jakarta Sans',sans-serif;
    border:2px ${verified ? 'solid #fff' : `dashed ${dayColor(day)}`};box-shadow:0 2px 6px rgba(15,23,42,.35);
    ${active ? 'transform:scale(1.25);' : ''}">${number}</span>`,
})

// Keeps the visible pins in view whenever the day filter changes
const FitBounds = ({ points }) => {
  const map = useMap()
  const key = points.map((p) => p.join()).join('|')
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14)
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

const FocusItem = ({ item, markerRefs }) => {
  const map = useMap()
  useEffect(() => {
    if (!item) return
    map.flyTo([item.lat, item.lng], Math.max(map.getZoom(), 14), { duration: 0.6 })
    markerRefs.current.get(item.id)?.openPopup()
  }, [item, map, markerRefs])
  return null
}

const MapTab = ({ trip }) => {
  const [dayFilter, setDayFilter] = useState('all')
  const [focused, setFocused] = useState(null)
  const markerRefs = useRef(new Map())

  const itemsQuery = useQuery({
    queryKey: ['trip', String(trip.id), 'items'],
    queryFn: () => api.get(`/trips/${trip.id}/items`).then((r) => r.data),
  })

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data])
  const dayCount = tripLength(trip.start_date, trip.end_date)
  const visible = items.filter((i) => dayFilter === 'all' || i.day === dayFilter)
  const pinned = visible.filter((i) => i.lat != null)
  const unpinned = visible.filter((i) => i.lat == null)

  // Number pins within each day, in itinerary order
  const numbers = useMemo(() => {
    const counters = {}
    return new Map(items.map((i) => [i.id, (counters[i.day] = (counters[i.day] ?? 0) + 1)]))
  }, [items])

  const routesByDay = new Map()
  for (const item of pinned) {
    if (!routesByDay.has(item.day)) routesByDay.set(item.day, [])
    routesByDay.get(item.day).push([item.lat, item.lng])
  }
  const routes = [...routesByDay.entries()].filter(([, points]) => points.length > 1)

  if (itemsQuery.isLoading) return <Spinner className="text-brand-700" />
  if (itemsQuery.isError) return <Alert>{getErrorMessage(itemsQuery.error, 'Could not load the itinerary')}</Alert>
  if (items.length === 0) {
    return (
      <EmptyState icon={LuMap} title="Nothing to map yet">
        Generate or add activities in the itinerary and they will appear here.
      </EmptyState>
    )
  }

  const fallbackCenter = trip.destination_lat != null ? [trip.destination_lat, trip.destination_lng] : [0, 0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show day">
        {['all', ...Array.from({ length: dayCount }, (_, i) => i + 1)].map((day) => (
          <button
            key={day}
            type="button"
            aria-pressed={dayFilter === day}
            onClick={() => { setDayFilter(day); setFocused(null) }}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
              dayFilter === day ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-400',
            )}
          >
            {day !== 'all' && <span className="size-2.5 rounded-full" style={{ backgroundColor: dayColor(day) }} aria-hidden />}
            {day === 'all' ? 'All days' : `Day ${day}`}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_16rem]">
        <div className="relative isolate h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-[34rem]">
          <MapContainer center={fallbackCenter} zoom={12} scrollWheelZoom={false} className="size-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routes.map(([day, points]) => (
              <Polyline key={day} positions={points} pathOptions={{ color: dayColor(day), weight: 3, opacity: 0.7, dashArray: '6 8' }} />
            ))}
            {pinned.map((item) => (
              <Marker
                key={item.id}
                position={[item.lat, item.lng]}
                icon={pinIcon(item.day, numbers.get(item.id), focused?.id === item.id, item.location_verified)}
                ref={(marker) => { if (marker) markerRefs.current.set(item.id, marker); else markerRefs.current.delete(item.id) }}
                eventHandlers={{ click: () => setFocused(item) }}
                title={item.title}
              >
                <Popup>
                  <p className="!m-0 text-xs font-medium text-slate-500">Day {item.day}{item.start_time ? ` · ${item.start_time.slice(0, 5)}` : ''}</p>
                  <p className="!m-0 font-semibold text-slate-900">{item.title}</p>
                  {Number(item.est_cost) > 0 && <p className="!m-0 text-xs text-slate-600">about {formatMoney(item.est_cost, trip.currency)} per person</p>}
                  {!item.location_verified && <p className="!m-0 !mt-1 text-xs text-amber-700">Approximate location (AI estimate)</p>}
                </Popup>
              </Marker>
            ))}
            <FitBounds points={pinned.map((i) => [i.lat, i.lng])} />
            <FocusItem item={focused} markerRefs={markerRefs} />
          </MapContainer>
        </div>

        <div className="space-y-4">
          <ol className="max-h-[34rem] space-y-1 overflow-y-auto" aria-label="Activities on the map">
            {pinned.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setFocused(item)}
                  aria-current={focused?.id === item.id || undefined}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                    focused?.id === item.id ? 'bg-brand-50' : 'hover:bg-slate-100',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                      item.location_verified ? 'text-white' : 'border-2 border-dashed bg-white',
                    )}
                    style={item.location_verified ? { backgroundColor: dayColor(item.day) } : { borderColor: dayColor(item.day), color: dayColor(item.day) }}
                    aria-label={`Day ${item.day}, stop ${numbers.get(item.id)}`}
                  >
                    {numbers.get(item.id)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{item.title}</span>
                  {!item.location_verified && <span className="shrink-0 text-[11px] font-medium text-amber-700">approx.</span>}
                </button>
              </li>
            ))}
          </ol>

          {pinned.some((i) => !i.location_verified) && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              <span className="mt-0.5 inline-block size-3 shrink-0 rounded-full border-2 border-dashed border-amber-700" aria-hidden />
              Hollow pins are AI estimates that could not be matched to OpenStreetMap, so they may be off. Editors can fix them by searching for the place.
            </p>
          )}

          {unpinned.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <LuMapPinOff className="size-3.5" aria-hidden /> Not on the map
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {unpinned.map((item) => <li key={item.id} className="truncate">Day {item.day}: {item.title}</li>)}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Editors can pin these by editing the activity and searching for a location.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapTab
