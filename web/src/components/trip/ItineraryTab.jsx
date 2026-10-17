import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LuClock, LuLightbulb, LuMapPin, LuRefreshCw, LuSparkles, LuThumbsDown, LuThumbsUp, LuWandSparkles } from 'react-icons/lu'
import api, { getErrorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Spinner from '../ui/Spinner'
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

const Score = ({ score }) => {
  if (!score) return null
  const positive = score > 0
  const Icon = positive ? LuThumbsUp : LuThumbsDown
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      )}
      aria-label={`Vote score ${score}`}
    >
      <Icon className="size-3" aria-hidden /> {Math.abs(score)}
    </span>
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

const DaySection = ({ trip, day, items, canEdit }) => {
  const [replanning, setReplanning] = useState(false)
  const theme = trip.plan?.day_themes?.[day.day]
  const dateLabel = day.date
    ? new Date(`${day.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : null

  return (
    <section aria-labelledby={`day-${day.day}`} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`day-${day.day}`} className="font-semibold text-slate-900">
            Day {day.day}{theme && <span className="font-normal text-slate-500"> &middot; {theme}</span>}
          </h3>
          {dateLabel && <p className="mt-0.5 text-sm text-slate-500">{dateLabel}</p>}
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

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nothing planned for this day.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="flex w-14 shrink-0 items-start gap-1 pt-0.5 text-xs font-semibold tabular-nums text-slate-500">
                <LuClock className="mt-px size-3.5" aria-hidden />
                {item.start_time?.slice(0, 5) ?? item.slot}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <Score score={item.score} />
                </div>
                {item.description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  {item.category && <span className="capitalize">{item.category}</span>}
                  {Number(item.est_cost) > 0
                    ? <span>about {formatMoney(item.est_cost, trip.currency)} per person</span>
                    : <span>free</span>}
                  {item.lat && <span className="inline-flex items-center gap-1"><LuMapPin className="size-3" aria-hidden /> on map</span>}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

const ItineraryTab = ({ trip }) => {
  const queryClient = useQueryClient()
  const canEdit = trip.role === 'owner' || trip.role === 'editor'
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)

  const itemsQuery = useQuery({
    queryKey: ['trip', String(trip.id), 'items'],
    queryFn: () => api.get(`/trips/${trip.id}/items`).then((r) => r.data),
  })

  const generate = useMutation({
    mutationFn: () => api.post(`/trips/${trip.id}/generate-itinerary`).then((r) => r.data.plan),
    onSuccess: () => {
      setConfirmingRegenerate(false)
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id)] })
    },
  })

  if (itemsQuery.isLoading) return <Spinner className="text-brand-700" />
  if (itemsQuery.isError) return <Alert>{getErrorMessage(itemsQuery.error, 'Could not load the itinerary')}</Alert>

  const items = itemsQuery.data
  const plan = trip.plan
  // Days come from the saved plan (with weather); seeded trips without a plan fall back to the item days
  const days = plan?.days?.length
    ? plan.days
    : [...new Set(items.map((i) => i.day))].map((d) => ({ day: d, date: null, weather: null }))

  if (generate.isPending) return <GeneratingCard />

  if (items.length === 0) {
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
                Replace the whole plan?
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

      {days.map((day) => (
        <DaySection key={day.day} trip={trip} day={day} items={items.filter((i) => i.day === day.day)} canEdit={canEdit} />
      ))}
    </div>
  )
}

export default ItineraryTab
