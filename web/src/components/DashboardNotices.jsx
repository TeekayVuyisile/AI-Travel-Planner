import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LuCheck, LuCloudRain, LuMailOpen, LuX } from 'react-icons/lu'
import api, { getErrorMessage } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import { formatDateRange } from '../lib/format'
import { ROLE_LABELS } from '../lib/trips'
import { Avatar } from './ui/Avatar'
import Alert from './ui/Alert'
import Button from './ui/Button'

// Pending trip invites for the signed-in user
export const InviteInbox = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: invites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: () => api.get('/invites').then((r) => r.data),
  })

  const respond = useMutation({
    mutationFn: ({ id, action }) => api.post(`/invites/${id}/${action}`).then((r) => r.data),
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['invites'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      if (action === 'accept') {
        toast.success('You joined the trip')
        navigate(`/trips/${data.trip_id}`)
      } else {
        toast.success('Invite declined')
      }
    },
  })

  if (invites.length === 0) return null

  return (
    <section aria-labelledby="invites-heading" className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
      <h2 id="invites-heading" className="flex items-center gap-2 font-semibold text-slate-900">
        <LuMailOpen className="size-4 text-brand-700" aria-hidden /> Trip invites ({invites.length})
      </h2>
      {respond.isError && <div className="mt-3"><Alert>{getErrorMessage(respond.error, 'Could not answer the invite')}</Alert></div>}
      <ul className="mt-3 space-y-2">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3.5 shadow-sm ring-1 ring-slate-200">
            <Avatar user={{ first_name: invite.invited_by_first_name, last_name: invite.invited_by_last_name, avatar_color: invite.invited_by_avatar_color }} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{invite.title || `${invite.destination_city} trip`}</p>
              <p className="text-sm text-slate-600">
                {invite.invited_by_first_name} invited you as {ROLE_LABELS[invite.role].toLowerCase()} &middot; {formatDateRange(invite.start_date, invite.end_date)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: invite.id, action: 'decline' })} disabled={respond.isPending}>
                <LuX className="size-4" aria-hidden /> Decline
              </Button>
              <Button size="sm" onClick={() => respond.mutate({ id: invite.id, action: 'accept' })} loading={respond.isPending && respond.variables?.id === invite.id && respond.variables?.action === 'accept'}>
                <LuCheck className="size-4" aria-hidden /> Join trip
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Rain or wind forecast on days with outdoor plans, for trips in the next 5 days
export const WeatherAlerts = () => {
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/trips/alerts').then((r) => r.data),
    staleTime: 15 * 60_000,
  })

  if (alerts.length === 0) return null

  return (
    <section aria-labelledby="alerts-heading" className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 id="alerts-heading" className="flex items-center gap-2 font-semibold text-amber-950">
        <LuCloudRain className="size-4 text-amber-700" aria-hidden /> Weather to plan around
      </h2>
      <ul className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <li key={`${alert.trip_id}-${alert.day}`} className="rounded-xl bg-surface p-3.5 text-sm shadow-sm ring-1 ring-amber-200">
            <p className="text-slate-900">
              <span className="font-semibold">{alert.trip_title}, day {alert.day}:</span> {alert.reason}
              {alert.changed_since_plan && <span className="text-amber-800"> (the forecast has turned since you planned it)</span>}.
            </p>
            <p className="mt-0.5 text-slate-600">Affects {alert.activities.join(', ')}.</p>
            <Link to={`/trips/${alert.trip_id}`} className="mt-1.5 inline-block rounded font-medium text-brand-700 hover:text-brand-800">
              Open the trip to replan day {alert.day}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
