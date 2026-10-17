import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LuLightbulb, LuPlus, LuRefreshCw, LuSparkles, LuWandSparkles } from 'react-icons/lu'
import api, { getErrorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import { tripLength } from '../../lib/format'
import { dayColor } from '../../lib/trips'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Spinner from '../ui/Spinner'
import ItemCard, { ItemBody } from './ItemCard'
import ItemForm from './ItemForm'
import WeatherBadge from './WeatherBadge'

const PROGRESS_STEPS = ['Checking the forecast', 'Picking places that match your interests', 'Balancing the budget', 'Writing the packing list']

const GeneratingCard = () => {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5" role="status" aria-live="polite">
      <Spinner className="size-6 shrink-0 text-brand-700" />
      <div>
        <p className="font-semibold text-brand-900">Planning your trip</p>
        <p className="text-sm text-brand-800">{PROGRESS_STEPS[step]}...</p>
      </div>
    </div>
  )
}

const ReplanForm = ({ tripId, day, onClose }) => {
  const queryClient = useQueryClient()
  const [request, setRequest] = useState('')
  const regenerate = useMutation({
    mutationFn: () => api.post(`/trips/${tripId}/days/${day}/regenerate`, { request: request.trim() || undefined }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', String(tripId)] })
      onClose()
    },
  })

  return (
    <form
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => { event.preventDefault(); regenerate.mutate() }}
    >
      <label htmlFor={`replan-${day}`} className="text-sm font-medium text-slate-700">
        What should change? <span className="font-normal text-slate-500">(optional)</span>
      </label>
      <input
        id={`replan-${day}`}
        autoFocus
        value={request}
        onChange={(event) => setRequest(event.target.value)}
        maxLength={300}
        placeholder="More relaxed, fewer museums, somewhere for sunset..."
        className="mt-1.5 block h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
      />
      <p className="mt-1.5 text-xs text-slate-500">Activities the group voted down are replaced too.</p>
      {regenerate.isError && <div className="mt-3"><Alert>{getErrorMessage(regenerate.error, 'Could not replan this day')}</Alert></div>}
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={regenerate.isPending}>Cancel</Button>
        <Button type="submit" size="sm" loading={regenerate.isPending}>
          {!regenerate.isPending && <LuWandSparkles className="size-4" aria-hidden />} Replan day
        </Button>
      </div>
    </form>
  )
}

const DaySection = ({ trip, day, itemIds, itemsById, canEdit, near }) => {
  const [replanning, setReplanning] = useState(false)
  const [adding, setAdding] = useState(false)
  // Lets an item be dropped onto a day that has no activities yet. Only active while the day is
  // empty: otherwise the list itself would win collisions over the activities inside it.
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.day}`, disabled: !canEdit || itemIds.length > 0 })
  const theme = trip.plan?.day_themes?.[day.day]
  const dateLabel = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <section aria-labelledby={`day-${day.day}`} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`day-${day.day}`} className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: dayColor(day.day) }} aria-hidden />
            Day {day.day}{theme && <span className="font-normal text-slate-500"> &middot; {theme}</span>}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WeatherBadge weather={day.weather} />
          {canEdit && trip.plan && trip.plan.source !== 'rules' && !replanning && (
            <Button variant="ghost" size="sm" onClick={() => setReplanning(true)}>
              <LuRefreshCw className="size-4" aria-hidden /> Replan day
            </Button>
          )}
        </div>
      </div>
      {replanning && <ReplanForm tripId={trip.id} day={day.day} onClose={() => setReplanning(false)} />}

      <SortableContext id={`day-${day.day}`} items={itemIds} strategy={verticalListSortingStrategy}>
        <ol
          ref={setNodeRef}
          className={cn(
            'mt-4 min-h-14 space-y-3 rounded-xl transition-colors',
            isOver && itemIds.length === 0 && 'bg-brand-50 outline-2 outline-dashed outline-brand-300',
          )}
        >
          {itemIds.length === 0 && !adding && (
            <li className="flex min-h-14 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
              {canEdit ? 'Nothing planned yet. Drag an activity here or add one.' : 'Nothing planned for this day.'}
            </li>
          )}
          {itemIds.map((id) => (
            <ItemCard key={id} item={itemsById.get(id)} trip={trip} canEdit={canEdit} near={near} />
          ))}
        </ol>
      </SortableContext>

      {canEdit && (adding ? (
        <div className="mt-3"><ItemForm trip={trip} day={day.day} near={near} onClose={() => setAdding(false)} /></div>
      ) : (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setAdding(true)}>
          <LuPlus className="size-4" aria-hidden /> Add activity
        </Button>
      ))}
    </section>
  )
}

// { 1: [ids], 2: [ids], ... } in display order
const groupByDay = (items, dayCount) => {
  const columns = Object.fromEntries(Array.from({ length: dayCount }, (_, i) => [i + 1, []]))
  for (const item of items) (columns[item.day] ??= []).push(item.id)
  return columns
}

const findDay = (columns, id) => {
  if (typeof id === 'string' && id.startsWith('day-')) return Number(id.slice(4))
  return Number(Object.keys(columns).find((day) => columns[day].includes(id)))
}

const ItineraryTab = ({ trip }) => {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const canEdit = trip.role === 'owner' || trip.role === 'editor'
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)
  const [dragColumns, setDragColumns] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const autoStarted = useRef(false)
  const itemsKey = ['trip', String(trip.id), 'items']

  const itemsQuery = useQuery({
    queryKey: itemsKey,
    queryFn: () => api.get(`/trips/${trip.id}/items`).then((r) => r.data),
  })

  const generate = useMutation({
    mutationFn: () => api.post(`/trips/${trip.id}/generate-itinerary`).then((r) => r.data.plan),
    onSuccess: () => {
      setConfirmingRegenerate(false)
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id)] })
    },
  })

  const reorder = useMutation({
    mutationFn: (days) => api.put(`/trips/${trip.id}/items/order`, { days }).then((r) => r.data),
    onSuccess: (items) => queryClient.setQueryData(itemsKey, items),
    onError: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Coming from the new-trip wizard with "plan with AI right away" ticked
  const shouldAutoGenerate = searchParams.get('generate') === '1'
  useEffect(() => {
    if (!shouldAutoGenerate || autoStarted.current || !itemsQuery.isSuccess) return
    autoStarted.current = true
    setSearchParams({}, { replace: true })
    if (canEdit && itemsQuery.data.length === 0) generate.mutate()
  }, [shouldAutoGenerate, itemsQuery.isSuccess, itemsQuery.data, canEdit, generate, setSearchParams])

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data])
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const dayCount = tripLength(trip.start_date, trip.end_date)
  const savedColumns = useMemo(() => groupByDay(items, dayCount), [items, dayCount])
  const columns = dragColumns ?? savedColumns

  // Every trip day is shown, with the forecast from the saved plan when there is one
  const days = useMemo(() => {
    const weatherByDay = new Map((trip.plan?.days ?? []).map((d) => [d.day, d.weather]))
    const start = new Date(`${String(trip.start_date).slice(0, 10)}T00:00:00`)
    return Array.from({ length: dayCount }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const pad = (n) => String(n).padStart(2, '0')
      return { day: i + 1, date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, weather: weatherByDay.get(i + 1) ?? null }
    })
  }, [trip.plan, trip.start_date, dayCount])

  // Centre for place search: the destination, or the average of pinned activities
  const near = useMemo(() => {
    if (trip.destination_lat != null) return { lat: trip.destination_lat, lng: trip.destination_lng }
    const pinned = items.filter((i) => i.lat != null)
    if (pinned.length === 0) return null
    return {
      lat: pinned.reduce((sum, i) => sum + i.lat, 0) / pinned.length,
      lng: pinned.reduce((sum, i) => sum + i.lng, 0) / pinned.length,
    }
  }, [trip.destination_lat, trip.destination_lng, items])

  const title = (id) => itemsById.get(id)?.title ?? 'activity'
  // "position 2 of 4 in day 1" for screen reader users moving items with the keyboard
  const place = (overId) => {
    const day = findDay(columns, overId)
    const list = columns[day] ?? []
    const index = list.indexOf(overId)
    return `position ${index === -1 ? 1 : index + 1} of ${Math.max(list.length, 1)} in day ${day}`
  }
  const announcements = {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) => over ? `${title(active.id)} is at ${place(over.id)}.` : `${title(active.id)} is not over a day.`,
    onDragEnd: ({ active, over }) => over ? `${title(active.id)} was dropped at ${place(over.id)}.` : `${title(active.id)} was dropped.`,
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  }

  const onDragStart = ({ active }) => {
    setActiveId(active.id)
    setDragColumns(savedColumns)
  }

  // Moves the item into another day's list while it is dragged across
  const onDragOver = ({ active, over }) => {
    if (!over) return
    setDragColumns((current) => {
      const from = findDay(current, active.id)
      const to = findDay(current, over.id)
      if (!from || !to || from === to) return current
      const target = current[to]
      const overIndex = target.indexOf(over.id)
      const insertAt = overIndex === -1 ? target.length : overIndex
      return {
        ...current,
        [from]: current[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, insertAt), active.id, ...target.slice(insertAt)],
      }
    })
  }

  const onDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || !dragColumns) {
      setDragColumns(null)
      return
    }

    const day = findDay(dragColumns, active.id)
    const list = dragColumns[day]
    const overIndex = list.indexOf(over.id)
    const finalColumns = overIndex === -1
      ? dragColumns
      : { ...dragColumns, [day]: arrayMove(list, list.indexOf(active.id), overIndex) }

    const changed = Object.keys(finalColumns)
      .filter((d) => finalColumns[d].join() !== savedColumns[d].join())
      .map((d) => ({ day: Number(d), ids: finalColumns[d] }))

    if (changed.length > 0) {
      // Optimistic: show the new order straight away, then replace with the server's answer
      queryClient.setQueryData(itemsKey, (old) => {
        const position = new Map(Object.entries(finalColumns).flatMap(([d, ids]) => ids.map((id, i) => [id, [Number(d), i]])))
        return old
          .map((item) => ({ ...item, day: position.get(item.id)[0], position: position.get(item.id)[1] }))
          .sort((a, b) => a.day - b.day || a.position - b.position)
      })
      reorder.mutate(changed)
    }
    setDragColumns(null)
  }

  if (itemsQuery.isLoading) return <Spinner className="text-brand-700" />
  if (itemsQuery.isError) return <Alert>{getErrorMessage(itemsQuery.error, 'Could not load the itinerary')}</Alert>
  if (generate.isPending) return <GeneratingCard />

  const plan = trip.plan

  if (items.length === 0 && !plan) {
    return (
      <div className="space-y-4">
        {generate.isError && <Alert>{getErrorMessage(generate.error, 'Could not generate the itinerary')}</Alert>}
        <EmptyState
          icon={LuSparkles}
          title="No itinerary yet"
          action={canEdit && (
            <Button onClick={() => generate.mutate()}>
              <LuWandSparkles className="size-4" aria-hidden /> Generate itinerary
            </Button>
          )}
        >
          {canEdit
            ? 'The assistant builds a day-by-day plan around your interests, budget and the forecast, plus a packing list.'
            : 'An organiser or editor can generate the plan.'}
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {generate.isError && <Alert>{getErrorMessage(generate.error, 'Could not generate the itinerary')}</Alert>}
      {reorder.isError && <Alert>{getErrorMessage(reorder.error, 'Could not save the new order')}</Alert>}

      {plan && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Plan summary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              plan.source !== 'rules' ? 'bg-brand-50 text-brand-800' : 'bg-slate-100 text-slate-700',
            )}>
              <LuSparkles className="size-3.5" aria-hidden />
              {{ ai: 'Planned with AI', sample: 'Sample plan' }[plan.source] ?? 'Basic plan (AI unavailable)'}
            </span>
            {canEdit && (confirmingRegenerate ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                Replace the whole plan, including your edits?
                <Button size="sm" onClick={() => generate.mutate()}>Regenerate</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingRegenerate(false)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirmingRegenerate(true)}>
                <LuRefreshCw className="size-4" aria-hidden /> Regenerate all
              </Button>
            ))}
          </div>
          {plan.summary && <p className="mt-3 leading-relaxed text-slate-700">{plan.summary}</p>}
          {plan.tips?.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {plan.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                  <LuLightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden /> {tip}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canEdit && items.length > 1 && (
        <p className="text-sm text-slate-500">Drag the handle on an activity to reorder it or move it to another day. Keyboard: focus the handle, press Space, then use the arrow keys.</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setActiveId(null); setDragColumns(null) }}
      >
        {days.map((day) => (
          <DaySection
            key={day.day}
            trip={trip}
            day={day}
            itemIds={columns[day.day] ?? []}
            itemsById={itemsById}
            canEdit={canEdit}
            near={near}
          />
        ))}
        <DragOverlay>
          {activeId && itemsById.get(activeId) && (
            <ItemBody item={itemsById.get(activeId)} currency={trip.currency} className="bg-white shadow-xl ring-2 ring-brand-600/30" />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default ItineraryTab
