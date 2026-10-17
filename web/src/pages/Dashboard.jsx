import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LuPlane, LuPlus, LuRefreshCw } from 'react-icons/lu'
import { useAuth } from '../contexts/AuthContext'
import api, { getErrorMessage } from '../lib/api'
import { daysUntil } from '../lib/format'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import TripCard from '../components/TripCard'
import { InviteInbox, WeatherAlerts } from '../components/DashboardNotices'

const CardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="h-28 animate-pulse bg-slate-200" />
    <div className="space-y-3 p-5">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
    </div>
  </div>
)

const TripGrid = ({ title, trips }) => (
  <section className="mt-10" aria-label={title}>
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
    <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {trips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
    </div>
  </section>
)

const Dashboard = () => {
  const { user } = useAuth()
  const { data: trips, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.get('/trips').then((r) => r.data),
  })

  const upcoming = trips?.filter((t) => daysUntil(t.end_date) >= 0) ?? []
  const past = trips?.filter((t) => daysUntil(t.end_date) < 0) ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Hi {user.first_name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Your trips</h1>
        </div>
        <Button as={Link} to="/trips/new">
          <LuPlus className="size-4" aria-hidden /> Plan a trip
        </Button>
      </div>

      <InviteInbox />
      <WeatherAlerts />

      {isLoading && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      )}

      {isError && (
        <div className="mt-10 space-y-4">
          <Alert>{getErrorMessage(error, 'Could not load your trips')}</Alert>
          <Button variant="secondary" onClick={() => refetch()}>
            <LuRefreshCw className="size-4" aria-hidden /> Try again
          </Button>
        </div>
      )}

      {trips?.length === 0 && (
        <div className="mt-10">
          <EmptyState
            icon={LuPlane}
            title="No trips yet"
            action={<Button as={Link} to="/trips/new"><LuPlus className="size-4" aria-hidden /> Plan your first trip</Button>}
          >
            Pick a destination and dates, and the assistant will put together a day-by-day plan.
          </EmptyState>
        </div>
      )}

      {upcoming.length > 0 && <TripGrid title="Upcoming" trips={upcoming} />}
      {past.length > 0 && <TripGrid title="Past trips" trips={past} />}
    </div>
  )
}

export default Dashboard
