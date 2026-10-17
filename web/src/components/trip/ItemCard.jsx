import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LuClock, LuGripVertical, LuMapPin, LuPencil, LuThumbsDown, LuThumbsUp, LuTrash2 } from 'react-icons/lu'
import api, { getErrorMessage } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'
import Button from '../ui/Button'
import ItemForm from './ItemForm'

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

// Thumbs up / down for every group member. Clicking your current vote again clears it.
const VoteButtons = ({ item, trip }) => {
  const queryClient = useQueryClient()
  const itemsKey = ['trip', String(trip.id), 'items']
  const vote = useMutation({
    mutationFn: (value) => api.put(`/trips/${trip.id}/items/${item.id}/vote`, { vote: value }).then((r) => r.data),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: itemsKey })
      const previous = queryClient.getQueryData(itemsKey)
      queryClient.setQueryData(itemsKey, (items) => items.map((i) => (
        i.id === item.id ? { ...i, my_vote: value, score: i.score - i.my_vote + value } : i
      )))
      return { previous }
    },
    onError: (_error, _value, context) => queryClient.setQueryData(itemsKey, context.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  })

  const button = (value, Icon, label) => {
    const pressed = item.my_vote === value
    return (
      <button
        type="button"
        aria-pressed={pressed}
        aria-label={`${label} ${item.title}`}
        onClick={() => vote.mutate(pressed ? 0 : value)}
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-lg transition-colors',
          pressed
            ? value > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </button>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={`Votes for ${item.title}`}>
      {button(1, LuThumbsUp, 'Vote for')}
      <span className={cn('min-w-6 text-center text-sm font-semibold tabular-nums', item.score > 0 ? 'text-emerald-700' : item.score < 0 ? 'text-rose-700' : 'text-slate-500')} aria-label={`Score ${item.score}`}>
        {item.score > 0 ? `+${item.score}` : item.score}
      </span>
      {button(-1, LuThumbsDown, 'Vote against')}
    </div>
  )
}

// Visual body of an activity. Also rendered inside the DragOverlay, so it holds no hooks.
// `votes` replaces the read-only score badge when the card is interactive.
export const ItemBody = ({ item, currency, handle, actions, votes, className }) => (
  <div className={cn('flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4', className)}>
    {handle}
    <span className="flex w-14 shrink-0 items-start gap-1 pt-0.5 text-xs font-semibold tabular-nums text-slate-500">
      <LuClock className="mt-px size-3.5" aria-hidden />
      {item.start_time?.slice(0, 5) ?? item.slot ?? '--:--'}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-900">{item.title}</p>
        {votes ?? <Score score={item.score} />}
      </div>
      {item.description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          {item.category && <span className="capitalize">{item.category}</span>}
          {Number(item.est_cost) > 0 ? <span>about {formatMoney(item.est_cost, currency)} per person</span> : <span>free</span>}
          {item.lat != null && <span className="inline-flex items-center gap-1"><LuMapPin className="size-3" aria-hidden /> on map</span>}
        </p>
        {actions}
      </div>
    </div>
  </div>
)

const ItemCard = ({ item, trip, canEdit, near }) => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canEdit || editing,
  })

  const toast = useToast()
  const remove = useMutation({
    mutationFn: () => api.delete(`/trips/${trip.id}/items/${item.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'items'] })
      toast.success(`Removed ${item.title}`)
    },
  })

  const style = { transform: CSS.Translate.toString(transform), transition }

  if (editing) {
    return (
      <li ref={setNodeRef} style={style}>
        <ItemForm trip={trip} day={item.day} item={item} near={near} onClose={() => setEditing(false)} />
      </li>
    )
  }

  const handle = canEdit && (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Move ${item.title}`}
      className="-my-1 -ml-1 inline-flex w-8 shrink-0 cursor-grab touch-none items-center justify-center self-stretch rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing"
    >
      <LuGripVertical className="size-4" aria-hidden />
    </button>
  )

  const actions = canEdit && (
    confirmingDelete ? (
      <span className="flex items-center gap-1.5 text-xs text-slate-700">
        Remove?
        <Button size="sm" variant="danger" className="h-8" loading={remove.isPending} onClick={() => remove.mutate()}>Remove</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setConfirmingDelete(false)}>Keep</Button>
      </span>
    ) : (
      <span className="flex items-center gap-1">
        <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${item.title}`} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900">
          <LuPencil className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={() => setConfirmingDelete(true)} aria-label={`Remove ${item.title}`} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700">
          <LuTrash2 className="size-4" aria-hidden />
        </button>
      </span>
    )
  )

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
      <ItemBody item={item} currency={trip.currency} handle={handle} actions={actions} votes={<VoteButtons item={item} trip={trip} />} />
      {remove.isError && <p className="mt-1 text-sm text-rose-600">{getErrorMessage(remove.error, 'Could not remove it')}</p>}
    </li>
  )
}

export default ItemCard
