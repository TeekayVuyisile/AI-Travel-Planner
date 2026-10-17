import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api, { getErrorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'
import { EXPENSE_CATEGORIES } from '../../lib/trips'
import { Avatar } from '../ui/Avatar'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Field from '../ui/Field'

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP']
const selectClass = 'block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15'

const todayWithinTrip = (trip) => {
  const today = new Date().toISOString().slice(0, 10)
  if (today < trip.start_date) return trip.start_date
  if (today > trip.end_date) return trip.end_date
  return today
}

const ExpenseForm = ({ trip, onClose }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const members = trip.members
  const [form, setForm] = useState({
    amount: '',
    currency: trip.currency,
    paid_by: user.id,
    category: 'food',
    description: '',
    spent_at: todayWithinTrip(trip),
  })
  const [mode, setMode] = useState('even')
  const [included, setIncluded] = useState(() => new Set(members.map((m) => m.id)))
  const [custom, setCustom] = useState({})
  const [fieldError, setFieldError] = useState('')

  const save = useMutation({
    mutationFn: (body) => api.post(`/trips/${trip.id}/expenses`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'expenses'] })
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'budget'] })
      onClose()
    },
  })

  const update = (event) => {
    const { name, value } = event.target
    setForm((f) => ({ ...f, [name]: name === 'paid_by' ? Number(value) : value }))
  }

  const amount = Number(form.amount) || 0
  const customTotal = Object.values(custom).reduce((sum, v) => sum + (Number(v) || 0), 0)
  const perPerson = included.size ? amount / included.size : 0

  const toggle = (id) => setIncluded((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const submit = (event) => {
    event.preventDefault()
    setFieldError('')
    if (!(amount > 0)) return setFieldError('Enter an amount above 0')
    if (mode === 'even' && included.size === 0) return setFieldError('Pick at least one person to split with')
    if (mode === 'custom' && Math.round(customTotal * 100) !== Math.round(amount * 100)) {
      return setFieldError(`The shares add up to ${formatMoney(customTotal, form.currency, { exact: true })}, not ${formatMoney(amount, form.currency, { exact: true })}`)
    }

    save.mutate({
      ...form,
      amount,
      description: form.description.trim() || undefined,
      split: mode === 'even'
        ? { mode, user_ids: [...included] }
        : { mode, shares: Object.entries(custom).map(([userId, value]) => ({ user_id: Number(userId), amount: Number(value) || 0 })).filter((s) => s.amount > 0) },
    })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <p className="font-semibold text-slate-900">Log an expense</p>
      {(save.isError || fieldError) && <Alert>{fieldError || getErrorMessage(save.error, 'Could not save the expense')}</Alert>}

      <div className="grid gap-4 sm:grid-cols-[1fr_6.5rem_1fr]">
        <Field label="Amount" name="amount" type="number" min={0} step="0.01" inputMode="decimal" autoFocus value={form.amount} onChange={update} />
        <div>
          <label htmlFor="expense-currency" className="mb-1.5 block text-sm font-medium text-slate-700">Currency</label>
          <select id="expense-currency" name="currency" value={form.currency} onChange={update} className={selectClass}>
            {[...new Set([trip.currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="expense-payer" className="mb-1.5 block text-sm font-medium text-slate-700">Paid by</label>
          <select id="expense-payer" name="paid_by" value={form.paid_by} onChange={update} className={selectClass}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.id === user.id ? `${m.first_name} (you)` : m.first_name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="expense-category" className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
          <select id="expense-category" name="category" value={form.category} onChange={update} className={selectClass}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <Field label="What was it? (optional)" name="description" maxLength={255} value={form.description} onChange={update} className="sm:col-span-1" />
        <Field label="Date" name="spent_at" type="date" value={form.spent_at} onChange={update} />
      </div>

      {form.currency !== trip.currency && (
        <p className="text-sm text-slate-600">Converted to {trip.currency} at today's rate when you save.</p>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Split</legend>
        <div className="mt-2 inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Split mode">
          {[['even', 'Evenly'], ['custom', 'Custom amounts']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn('h-9 rounded-lg px-3 text-sm font-medium', mode === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              {mode === 'even' ? (
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={included.has(m.id)} onChange={() => toggle(m.id)} className="size-4 accent-brand-700" />
                  <Avatar user={m} size="sm" />
                  <span className="flex-1 text-sm text-slate-800">{m.first_name}</span>
                  {included.has(m.id) && amount > 0 && (
                    <span className="text-sm tabular-nums text-slate-500">{formatMoney(perPerson, form.currency, { exact: true })}</span>
                  )}
                </label>
              ) : (
                <>
                  <Avatar user={m} size="sm" />
                  <label htmlFor={`share-${m.id}`} className="flex-1 text-sm text-slate-800">{m.first_name}</label>
                  <input
                    id={`share-${m.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={custom[m.id] ?? ''}
                    onChange={(event) => { const { value } = event.target; setCustom((c) => ({ ...c, [m.id]: value })) }}
                    className="h-9 w-28 rounded-lg border border-slate-300 px-2.5 text-right text-sm tabular-nums focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {mode === 'custom' && amount > 0 && (
          <p className={cn('mt-2 text-sm', Math.round(customTotal * 100) === Math.round(amount * 100) ? 'text-emerald-700' : 'text-slate-600')}>
            {formatMoney(customTotal, form.currency, { exact: true })} of {formatMoney(amount, form.currency, { exact: true })} assigned
          </p>
        )}
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" size="sm" loading={save.isPending}>Save expense</Button>
      </div>
    </form>
  )
}

export default ExpenseForm
