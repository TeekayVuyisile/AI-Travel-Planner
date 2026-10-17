import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LuBackpack, LuCheck, LuSparkles, LuUsers, LuUser } from 'react-icons/lu'
import api, { getErrorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import Alert from '../ui/Alert'
import EmptyState from '../ui/EmptyState'
import Spinner from '../ui/Spinner'

const PackingItem = ({ item, disabled, onToggle }) => (
  <li>
    <label
      className={cn(
        'flex min-h-11 gap-3 rounded-xl border p-3.5 transition-colors',
        item.packed ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-slate-300',
      )}
    >
      <input type="checkbox" className="peer sr-only" checked={item.packed} disabled={disabled} onChange={() => onToggle(item)} />
      <span
        className={cn(
          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600',
          item.packed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white',
        )}
        aria-hidden
      >
        {item.packed && <LuCheck className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className={cn('block font-medium', item.packed ? 'text-slate-500 line-through' : 'text-slate-900')}>{item.label}</span>
        {item.reason && <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{item.reason}</span>}
      </span>
    </label>
  </li>
)

const Section = ({ icon: Icon, title, hint, items, canToggle, onToggle }) => {
  const packed = items.filter((i) => i.packed).length
  return (
    <section aria-labelledby={`packing-${title}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 id={`packing-${title}`} className="flex items-center gap-2 font-semibold text-slate-900">
            <Icon className="size-4 text-slate-500" aria-hidden /> {title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{hint}</p>
        </div>
        <span className="text-sm font-medium tabular-nums text-slate-600">{packed}/{items.length} packed</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${items.length ? (packed / items.length) * 100 : 0}%` }} />
      </div>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {items.map((item) => <PackingItem key={item.id} item={item} disabled={!canToggle} onToggle={onToggle} />)}
      </ul>
    </section>
  )
}

const PackingTab = ({ trip }) => {
  const queryClient = useQueryClient()
  const queryKey = ['trip', String(trip.id), 'packing']
  const canEdit = trip.role === 'owner' || trip.role === 'editor'

  const packingQuery = useQuery({
    queryKey,
    queryFn: () => api.get(`/trips/${trip.id}/packing`).then((r) => r.data),
  })

  // Optimistic toggle so ticking items feels instant; rolled back if the server refuses
  const toggle = useMutation({
    mutationFn: (item) => api.patch(`/trips/${trip.id}/packing/${item.id}`, { packed: !item.packed }),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (items) => items.map((i) => (i.id === item.id ? { ...i, packed: !i.packed } : i)))
      return { previous }
    },
    onError: (_error, _item, context) => queryClient.setQueryData(queryKey, context.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  if (packingQuery.isLoading) return <Spinner className="text-brand-700" />
  if (packingQuery.isError) return <Alert>{getErrorMessage(packingQuery.error, 'Could not load the packing list')}</Alert>

  const items = packingQuery.data
  if (items.length === 0) {
    return (
      <EmptyState icon={LuBackpack} title="No packing list yet">
        Generating the itinerary also writes a packing list based on the forecast and your activities.
      </EmptyState>
    )
  }

  const shared = items.filter((i) => i.user_id === null)
  const mine = items.filter((i) => i.user_id !== null)
  const hasReasons = items.some((i) => i.reason)

  return (
    <div className="space-y-10">
      {toggle.isError && <Alert>{getErrorMessage(toggle.error, 'Could not update that item')}</Alert>}
      {hasReasons && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <LuSparkles className="size-4 text-brand-700" aria-hidden /> Each suggestion says why it is on the list.
        </p>
      )}
      {mine.length > 0 && (
        <Section icon={LuUser} title="Your bag" hint="Only you see these." items={mine} canToggle onToggle={toggle.mutate} />
      )}
      {shared.length > 0 && (
        <Section
          icon={LuUsers}
          title="Shared with the group"
          hint={canEdit ? 'One person brings these for everyone.' : 'One person brings these. Editors can tick them off.'}
          items={shared}
          canToggle={canEdit}
          onToggle={toggle.mutate}
        />
      )}
    </div>
  )
}

export default PackingTab
