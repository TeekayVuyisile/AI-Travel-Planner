import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LuArrowLeft, LuBackpack, LuBot, LuCalendarDays, LuClock, LuListOrdered, LuMapPin, LuTrash2, LuUsers, LuWallet,
} from 'react-icons/lu'
import api, { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { formatDateRange, formatMoney, tripLength } from '../lib/format'
import { INTERESTS, ROLE_LABELS, statusLabel } from '../lib/trips'
import { Avatar } from '../components/ui/Avatar'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ItineraryTab from '../components/trip/ItineraryTab'
import PackingTab from '../components/trip/PackingTab'
import AssistantTab from '../components/trip/AssistantTab'

const TABS = [
  { id: 'itinerary', label: 'Itinerary', icon: LuListOrdered, Component: ItineraryTab },
  { id: 'packing', label: 'Packing', icon: LuBackpack, Component: PackingTab },
  { id: 'assistant', label: 'Assistant', icon: LuBot, Component: AssistantTab },
]

const Stat = ({ icon: Icon, label, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <Icon className="size-4" aria-hidden /> {label}
    </dt>
    <dd className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">{children}</dd>
  </div>
)

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

// WAI-ARIA tabs: arrow keys move between tabs, the selected tab is kept in the URL
const TabList = ({ active, onChange }) => {
  const refs = useRef([])
  const onKeyDown = (event, index) => {
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (!delta) return
    const next = (index + delta + TABS.length) % TABS.length
    refs.current[next]?.focus()
    onChange(TABS[next].id)
  }

  return (
    <div role="tablist" aria-label="Trip sections" className="flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-slate-200)]">
      {TABS.map(({ id, label, icon: Icon }, index) => (
        <button
          key={id}
          ref={(el) => { refs.current[index] = el }}
          id={`tab-${id}`}
          role="tab"
          type="button"
          aria-selected={active === id}
          aria-controls={`panel-${id}`}
          tabIndex={active === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={cn(
            'inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors',
            active === id ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-900',
          )}
        >
          <Icon className="size-4" aria-hidden /> {label}
        </button>
      ))}
    </div>
  )
}

const TripOverview = () => {
  const { tripId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'itinerary'

  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => api.get(`/trips/${tripId}`).then((r) => r.data),
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
  const { Component } = TABS.find((t) => t.id === activeTab)

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

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <TabList active={activeTab} onChange={(id) => setSearchParams(id === 'itinerary' ? {} : { tab: id }, { replace: true })} />
          <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="pt-6">
            <Component trip={trip} />
          </div>
        </div>

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
