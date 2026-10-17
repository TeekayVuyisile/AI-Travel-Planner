import { Link } from 'react-router-dom'
import { LuCalendarDays, LuEye, LuMapPin, LuPencil, LuCrown } from 'react-icons/lu'
import { AvatarStack } from './ui/Avatar'
import { formatDateRange, formatMoney, tripLength } from '../lib/format'
import { statusLabel } from '../lib/trips'

// Deterministic cover gradient per trip, so cards are distinguishable without photos
const covers = [
  'from-sky-600 to-indigo-700',
  'from-teal-600 to-sky-700',
  'from-orange-500 to-rose-600',
  'from-violet-600 to-fuchsia-600',
  'from-emerald-600 to-teal-700',
]

const roleMeta = {
  owner: { label: 'Organiser', icon: LuCrown },
  editor: { label: 'Editor', icon: LuPencil },
  viewer: { label: 'Viewer', icon: LuEye },
}

const TripCard = ({ trip }) => {
  const role = roleMeta[trip.role] ?? roleMeta.viewer
  const RoleIcon = role.icon
  const title = trip.title || `${trip.destination_city} trip`

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5"
    >
      <div className={`relative h-28 bg-gradient-to-br ${covers[trip.id % covers.length]} p-4`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.25),transparent_60%)]" />
        <span className="relative inline-flex items-center rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-slate-800">
          {statusLabel(trip)}
        </span>
        <LuMapPin className="absolute bottom-3 right-4 size-12 text-white/25" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold tracking-tight text-slate-900 group-hover:text-brand-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ''}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="sr-only">Dates</dt>
            <dd className="flex items-center gap-1.5 text-slate-700">
              <LuCalendarDays className="size-4 text-slate-400" aria-hidden />
              {tripLength(trip.start_date, trip.end_date)} days
            </dd>
          </div>
          <div>
            <dt className="sr-only">Budget</dt>
            <dd className="text-right font-semibold text-slate-900">{formatMoney(trip.total_budget, trip.currency)}</dd>
          </div>
        </dl>
        <p className="mt-1 text-xs text-slate-500">{formatDateRange(trip.start_date, trip.end_date)}</p>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <AvatarStack users={trip.members ?? []} />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <RoleIcon className="size-3.5" aria-hidden /> {role.label}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default TripCard
