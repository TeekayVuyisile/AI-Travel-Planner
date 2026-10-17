import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LuArrowLeft, LuCalendarDays, LuClock, LuMapPin, LuSparkles, LuThumbsDown, LuThumbsUp, LuTrash2, LuUsers, LuWallet,
} from 'react-icons/lu'
import api, { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { formatDateRange, formatMoney, tripLength } from '../lib/format'
import { INTERESTS, ROLE_LABELS, statusLabel } from '../lib/trips'
import { Avatar } from '../components/ui/Avatar'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

const Stat = ({ icon: Icon, label, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <Icon className="size-4" aria-hidden /> {label}
    </dt>
    <dd className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">{children}</dd>
  </div>
)

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

const Itinerary = ({ items }) => {
  const days = Object.entries(Object.groupBy(items, (item) => item.day))
  return (
    <div className="space-y-6">
      {days.map(([day, dayItems]) => (
        <section key={day} aria-label={`Day ${day}`} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Day {day}</h3>
          <ol className="mt-4 space-y-3">
            {dayItems.map((item) => (
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
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="capitalize">{item.category}</span>
                    {Number(item.est_cost) > 0 && <> &middot; about {formatMoney(item.est_cost)} per person</>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

const DeleteTrip = ({ tripId }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({
    mutationFn: () => api.delete(`/trips/${tripId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      navigate('/dashboard', { replace: true })
    },
  })

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-rose-700 hover:bg-rose-50">
        <LuTrash2 className="size-4" aria-hidden /> Delete trip
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 pl-3 text-sm text-rose-900" role="group" aria-label="Confirm delete">
      This removes the trip for everyone.
      <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete</Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
    </div>
  )
}

const TripOverview = () => {
  const { tripId } = useParams()
  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => api.get(`/trips/${tripId}`).then((r) => r.data),
  })
  const itemsQuery = useQuery({
    queryKey: ['trip', tripId, 'items'],
    queryFn: () => api.get(`/trips/${tripId}/items`).then((r) => r.data),
    enabled: tripQuery.isSuccess,
  })

  if (tripQuery.isLoading) {
    return <div className="flex justify-center py-24 text-brand-700"><Spinner className="size-8" /></div>
  }
  if (tripQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Alert>{getErrorMessage(tripQuery.error, 'Could not load this trip')}</Alert>
        <Button as={Link} to="/dashboard" variant="secondary" className="mt-4"><LuArrowLeft className="size-4" aria-hidden /> Back to trips</Button>
      </div>
    )
  }

  const trip = tripQuery.data
  const interests = (trip.interests ?? []).map((id) => INTERESTS.find((i) => i.id === id)?.label ?? id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900">
        <LuArrowLeft className="size-4" aria-hidden /> All trips
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{statusLabel(trip)}</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance text-slate-900">{trip.title || `${trip.destination_city} trip`}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-slate-600">
            <LuMapPin className="size-4" aria-hidden />
            {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ''}
          </p>
        </div>
        {trip.role === 'owner' && <DeleteTrip tripId={trip.id} />}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={LuCalendarDays} label="Dates">{formatDateRange(trip.start_date, trip.end_date)}</Stat>
        <Stat icon={LuClock} label="Length">{tripLength(trip.start_date, trip.end_date)} days</Stat>
        <Stat icon={LuWallet} label="Budget">{formatMoney(trip.total_budget, trip.currency)}</Stat>
        <Stat icon={LuUsers} label="Travellers">{trip.travelers_count}</Stat>
      </dl>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="itinerary-heading">
          <h2 id="itinerary-heading" className="text-lg font-semibold tracking-tight text-slate-900">Itinerary</h2>
          <div className="mt-4">
            {itemsQuery.isLoading && <Spinner className="text-brand-700" />}
            {itemsQuery.isError && <Alert>{getErrorMessage(itemsQuery.error, 'Could not load the itinerary')}</Alert>}
            {itemsQuery.data?.length === 0 && (
              <EmptyState icon={LuSparkles} title="No itinerary yet">
                AI itinerary generation is part of the next update. The plan will appear here day by day.
              </EmptyState>
            )}
            {itemsQuery.data?.length > 0 && <Itinerary items={itemsQuery.data} />}
          </div>
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="group-heading" className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="group-heading" className="text-sm font-semibold text-slate-900">Group</h2>
            <ul className="mt-4 space-y-3">
              {trip.members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Avatar user={member} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{member.first_name} {member.last_name}</span>
                  <span className="text-xs text-slate-500">{ROLE_LABELS[member.role]}</span>
                </li>
              ))}
            </ul>
          </section>

          {interests.length > 0 && (
            <section aria-labelledby="interests-heading" className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 id="interests-heading" className="text-sm font-semibold text-slate-900">Interests</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {interests.map((label) => (
                  <li key={label} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{label}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

export default TripOverview
