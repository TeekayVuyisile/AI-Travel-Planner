import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LuClock, LuLogOut, LuMail, LuUserMinus, LuUserPlus, LuX } from 'react-icons/lu'
import { useAuth } from '../../contexts/AuthContext'
import api, { getErrorMessage } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'
import { ROLE_LABELS } from '../../lib/trips'
import { Avatar } from '../ui/Avatar'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Field from '../ui/Field'

const ROLE_HELP = {
  owner: 'Organiser: full control, including deleting the trip.',
  editor: 'Editor: can change the plan, invite viewers and log expenses.',
  viewer: 'Viewer: can see everything, vote, chat and log expenses.',
}

const selectClass = 'h-9 rounded-lg border border-slate-300 bg-surface px-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15'

const InviteForm = ({ trip, invites }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [sent, setSent] = useState('')
  const isOwner = trip.role === 'owner'

  // Demo accounts make the invite flow easy to try; suggest the ones not already in the group
  const { data: demoUsers = [] } = useQuery({
    queryKey: ['demo-users'],
    queryFn: () => api.get('/auth/demo-users').then((r) => r.data),
    enabled: Boolean(user.is_demo),
    staleTime: Infinity,
  })
  const memberIds = new Set(trip.members.map((m) => m.id))
  const invited = new Set(invites.map((i) => i.email.toLowerCase()))
  const suggestions = demoUsers.filter((d) => !memberIds.has(d.id) && !invited.has(d.email.toLowerCase()))

  const invite = useMutation({
    mutationFn: () => api.post(`/trips/${trip.id}/invites`, { email: email.trim(), role: isOwner ? role : undefined }),
    onSuccess: () => {
      setSent(email.trim())
      setEmail('')
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'invites'] })
    },
  })

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); setSent(''); invite.mutate() }}
      className="space-y-3 rounded-2xl border border-slate-200 bg-surface p-5"
      noValidate
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <LuUserPlus className="size-4 text-slate-500" aria-hidden /> Invite someone
      </h3>
      {invite.isError && <Alert>{getErrorMessage(invite.error, 'Could not send the invite')}</Alert>}
      {sent && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">Invite sent to {sent}. It appears in their trips inbox.</p>}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Email" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
        {isOwner && (
          <div>
            <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)} className={`${selectClass} h-11 w-full px-3`}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        )}
        <Button type="submit" loading={invite.isPending} disabled={!email.trim()}>
          {!invite.isPending && <LuMail className="size-4" aria-hidden />} Send invite
        </Button>
      </div>
      {!isOwner && <p className="text-xs text-slate-500">Editors can invite viewers. The organiser can make them editors.</p>}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          Demo travellers:
          {suggestions.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setEmail(d.email)}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-300 py-1 pl-1 pr-3 hover:border-brand-600"
            >
              <Avatar user={d} size="sm" /> {d.first_name}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}

const GroupTab = ({ trip }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const isOwner = trip.role === 'owner'
  const canInvite = isOwner || trip.role === 'editor'
  const [confirmLeave, setConfirmLeave] = useState(false)

  const invitesQuery = useQuery({
    queryKey: ['trip', String(trip.id), 'invites'],
    queryFn: () => api.get(`/trips/${trip.id}/invites`).then((r) => r.data),
  })

  const refreshTrip = () => queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id)] })

  const changeRole = useMutation({
    mutationFn: ({ userId, role }) => api.patch(`/trips/${trip.id}/members/${userId}`, { role }),
    onSuccess: (_data, { role }) => {
      refreshTrip()
      toast.success(`Role changed to ${role}`)
    },
  })
  const removeMember = useMutation({
    mutationFn: (userId) => api.delete(`/trips/${trip.id}/members/${userId}`),
    onSuccess: (_data, userId) => {
      if (userId === user.id) {
        queryClient.invalidateQueries({ queryKey: ['trips'] })
        toast.success('You left the trip')
        navigate('/dashboard', { replace: true })
      } else {
        refreshTrip()
        toast.success('Removed from the trip')
      }
    },
  })
  const cancelInvite = useMutation({
    mutationFn: (inviteId) => api.delete(`/trips/${trip.id}/invites/${inviteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'invites'] })
      toast.success('Invite cancelled')
    },
  })

  const error = changeRole.error || removeMember.error || cancelInvite.error
  const invites = invitesQuery.data ?? []

  return (
    <div className="space-y-6">
      {error && <Alert>{getErrorMessage(error, 'That did not work')}</Alert>}

      <section aria-labelledby="members-heading" className="rounded-2xl border border-slate-200 bg-surface p-5">
        <h3 id="members-heading" className="text-sm font-semibold text-slate-900">Members ({trip.members.length})</h3>
        <ul className="mt-4 divide-y divide-slate-100">
          {trip.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar user={m} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{m.first_name} {m.last_name}{m.id === user.id && <span className="font-normal text-slate-500"> (you)</span>}</p>
                <p className="truncate text-xs text-slate-500">{m.email}</p>
              </div>
              {isOwner && m.role !== 'owner' ? (
                <>
                  <label htmlFor={`role-${m.id}`} className="sr-only">Role for {m.first_name}</label>
                  <select
                    id={`role-${m.id}`}
                    value={m.role}
                    onChange={(e) => changeRole.mutate({ userId: m.id, role: e.target.value })}
                    className={selectClass}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMember.mutate(m.id)}
                    aria-label={`Remove ${m.first_name} from the trip`}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <LuUserMinus className="size-4" aria-hidden />
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{ROLE_LABELS[m.role]}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{ROLE_HELP[trip.role]}</p>
      </section>

      {canInvite && <InviteForm trip={trip} invites={invites} />}

      {invites.length > 0 && (
        <section aria-labelledby="pending-heading" className="rounded-2xl border border-slate-200 bg-surface p-5">
          <h3 id="pending-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <LuClock className="size-4 text-slate-500" aria-hidden /> Waiting to accept
          </h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                  {i.first_name ? `${i.first_name} ${i.last_name}` : i.email}
                  <span className="text-slate-500"> &middot; {ROLE_LABELS[i.role]}</span>
                </span>
                {canInvite && (
                  <button
                    type="button"
                    onClick={() => cancelInvite.mutate(i.id)}
                    aria-label={`Cancel the invite for ${i.email}`}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <LuX className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isOwner && (
        <div className="flex flex-wrap items-center gap-2">
          {confirmLeave ? (
            <>
              <span className="text-sm text-slate-700">Leave this trip? You will need a new invite to rejoin.</span>
              <Button size="sm" variant="danger" loading={removeMember.isPending} onClick={() => removeMember.mutate(user.id)}>Leave</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmLeave(false)}>Stay</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50" onClick={() => setConfirmLeave(true)}>
              <LuLogOut className="size-4" aria-hidden /> Leave trip
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default GroupTab
