import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LuArrowRight, LuCircleAlert, LuCircleCheck, LuLightbulb, LuPlus, LuReceipt, LuSparkles, LuTrash2, LuTriangleAlert } from 'react-icons/lu'
import { useAuth } from '../../contexts/AuthContext'
import api, { getErrorMessage } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'
import { expenseCategoryLabel } from '../../lib/trips'
import { Avatar } from '../ui/Avatar'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Spinner from '../ui/Spinner'
import ChartCard from '../charts/ChartCard'
import BarList from '../charts/BarList'
import ColumnChart from '../charts/ColumnChart'
import ExpenseForm from './ExpenseForm'

const StatTile = ({ label, value, note, tone }) => (
  <div className="rounded-2xl border border-slate-200 bg-surface p-4">
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className={cn('mt-1 text-xl font-semibold tracking-tight', tone === 'bad' ? 'text-rose-700' : 'text-slate-900')}>{value}</dd>
    {note && <dd className="mt-0.5 text-xs text-slate-500">{note}</dd>}
  </div>
)

// Spent against budget. The fill colour carries the state, always with an icon and words beside it.
const BudgetMeter = ({ summary, money }) => {
  const ratio = summary.total_budget ? summary.spent / summary.total_budget : 0
  const pace = summary.days ? summary.days_elapsed / summary.days : 0
  const state = ratio > 1 ? 'over' : ratio > 0.85 ? 'close' : 'ok'
  const meta = {
    ok: { fill: 'bg-brand-700', icon: LuCircleCheck, iconClass: 'text-emerald-700', text: 'On track' },
    close: { fill: 'bg-amber-500', icon: LuTriangleAlert, iconClass: 'text-amber-700', text: 'Close to the limit' },
    over: { fill: 'bg-rose-600', icon: LuCircleAlert, iconClass: 'text-rose-700', text: 'Over budget' },
  }[state]
  const Icon = meta.icon

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-slate-600">
          <span className="text-2xl font-semibold tracking-tight text-slate-900">{Math.round(ratio * 100)}%</span> of the budget used
        </p>
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Icon className={cn('size-4', meta.iconClass)} aria-hidden /> {meta.text}
        </p>
      </div>
      <div
        className="relative mt-3 h-2.5 rounded-full bg-brand-100"
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={summary.total_budget}
        aria-valuenow={summary.spent}
        aria-valuetext={`${money(summary.spent)} of ${money(summary.total_budget)} spent`}
      >
        <div className={cn('h-full rounded-full', meta.fill)} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        {pace > 0 && pace < 1 && (
          <span className="absolute -top-1 h-[18px] w-0.5 rounded bg-slate-900" style={{ left: `${pace * 100}%` }} title="Where spending would be if spread evenly over the trip" aria-hidden />
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {pace > 0 && pace < 1
          ? `The dark tick marks an even pace: day ${summary.days_elapsed} of ${summary.days}.`
          : pace >= 1 ? 'The trip is over.' : `The trip has not started yet (${summary.days} days).`}
      </p>
    </div>
  )
}

const Advice = ({ tripId }) => {
  const advice = useMutation({
    mutationFn: () => api.post(`/trips/${tripId}/budget/advice`).then((r) => r.data),
  })

  return (
    <section aria-labelledby="advice-heading" className="rounded-2xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="advice-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <LuLightbulb className="size-4 text-amber-600" aria-hidden /> Budget advice
        </h3>
        <Button size="sm" variant="secondary" onClick={() => advice.mutate()} loading={advice.isPending}>
          {!advice.isPending && <LuSparkles className="size-4" aria-hidden />} {advice.data ? 'Refresh' : 'Get advice'}
        </Button>
      </div>
      {advice.isError && <div className="mt-3"><Alert>{getErrorMessage(advice.error, 'Could not get advice')}</Alert></div>}
      {advice.data ? (
        <div className="mt-3" aria-live="polite">
          <p className="font-medium text-slate-900">{advice.data.headline}</p>
          <ul className="mt-2 space-y-1.5">
            {advice.data.tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden /> {tip}
              </li>
            ))}
          </ul>
          {advice.data.source === 'rules' && <p className="mt-2 text-xs text-slate-500">Basic advice: the AI is unavailable right now.</p>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Looks at what the group has spent so far and suggests where to save.</p>
      )}
    </section>
  )
}

const SettleUp = ({ summary, money, userId }) => (
  <section aria-labelledby="settle-heading" className="rounded-2xl border border-slate-200 bg-surface p-5">
    <h3 id="settle-heading" className="text-sm font-semibold text-slate-900">Settle up</h3>
    {summary.settlements.length === 0 ? (
      <p className="mt-2 text-sm text-slate-600">Everyone is square.</p>
    ) : (
      <>
        <p className="mt-1 text-xs text-slate-500">The fewest payments that square everyone up.</p>
        <ul className="mt-3 space-y-2">
          {summary.settlements.map((t) => (
            <li key={`${t.from.id}-${t.to.id}`} className={cn('flex items-center gap-2 rounded-xl p-2.5', (t.from.id === userId || t.to.id === userId) ? 'bg-brand-50' : 'bg-slate-50')}>
              <Avatar user={t.from} size="sm" />
              <span className="text-sm text-slate-700"><span className="font-medium text-slate-900">{t.from.id === userId ? 'You' : t.from.first_name}</span> pay{t.from.id === userId ? '' : 's'}</span>
              <LuArrowRight className="size-3.5 text-slate-400" aria-hidden />
              <Avatar user={t.to} size="sm" />
              <span className="text-sm font-medium text-slate-900">{t.to.id === userId ? 'you' : t.to.first_name}</span>
              <span className="ml-auto text-sm font-semibold tabular-nums text-slate-900">{money(t.amount, true)}</span>
            </li>
          ))}
        </ul>
      </>
    )}
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-medium text-slate-600">Balances</summary>
      <table className="mt-2 w-full text-left">
        <thead className="text-xs text-slate-500">
          <tr><th scope="col" className="py-1 font-medium">Person</th><th scope="col" className="py-1 text-right font-medium">Paid</th><th scope="col" className="py-1 text-right font-medium">Net</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {summary.balances.map((b) => (
            <tr key={b.id}>
              <td className="py-1.5 text-slate-700">{b.first_name}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-700">{money(b.paid, true)}</td>
              <td className={cn('py-1.5 text-right tabular-nums', b.net < 0 ? 'text-rose-700' : 'text-emerald-700')}>
                {b.net > 0 ? '+' : ''}{money(b.net, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-slate-500">Positive means the group owes them; negative means they owe the group.</p>
    </details>
  </section>
)

const ExpenseList = ({ trip, expenses, money, userId }) => {
  const queryClient = useQueryClient()
  const toast = useToast()
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/trips/${trip.id}/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'expenses'] })
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'budget'] })
      toast.success('Expense deleted')
    },
  })

  return (
    <>
      {remove.isError && <Alert>{getErrorMessage(remove.error, 'Could not delete the expense')}</Alert>}
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-surface">
        {expenses.map((e) => {
          const canDelete = trip.role === 'owner' || e.paid_by === userId || e.created_by === userId
          return (
            <li key={e.id} className="flex items-center gap-3 p-4">
              <Avatar user={{ first_name: e.paid_by_first_name, last_name: e.paid_by_last_name, avatar_color: e.paid_by_avatar_color }} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{e.description || expenseCategoryLabel(e.category)}</p>
                <p className="text-xs text-slate-500">
                  {e.paid_by === userId ? 'You' : e.paid_by_first_name} paid &middot; {expenseCategoryLabel(e.category)} &middot;{' '}
                  {new Date(`${e.spent_at}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} &middot; split {e.splits.length} way{e.splits.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums text-slate-900">{money(e.amount_trip, true)}</p>
                {e.currency !== trip.currency && (
                  <p className="text-xs tabular-nums text-slate-500" title={e.fx_estimated ? 'Converted with fallback rates; may be off' : undefined}>
                    {formatMoney(e.amount, e.currency, { exact: true })}{e.fx_estimated ? ' (estimated rate)' : ''}
                  </p>
                )}
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => remove.mutate(e.id)}
                  disabled={remove.isPending}
                  aria-label={`Delete ${e.description || 'expense'}`}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                >
                  <LuTrash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

const BudgetTab = ({ trip }) => {
  const { user } = useAuth()
  const [adding, setAdding] = useState(false)
  const money = (n, exact = false) => formatMoney(n, trip.currency, { exact })

  const summaryQuery = useQuery({
    queryKey: ['trip', String(trip.id), 'budget'],
    queryFn: () => api.get(`/trips/${trip.id}/budget`).then((r) => r.data),
  })
  const expensesQuery = useQuery({
    queryKey: ['trip', String(trip.id), 'expenses'],
    queryFn: () => api.get(`/trips/${trip.id}/expenses`).then((r) => r.data),
  })

  if (summaryQuery.isLoading || expensesQuery.isLoading) return <Spinner className="text-brand-700" />
  if (summaryQuery.isError) return <Alert>{getErrorMessage(summaryQuery.error, 'Could not load the budget')}</Alert>

  const summary = summaryQuery.data
  const expenses = expensesQuery.data ?? []
  const categoryData = [...summary.by_category].sort((a, b) => b.amount - a.amount).map((c) => ({ label: expenseCategoryLabel(c.category), value: c.amount }))
  const dayData = summary.by_day.map((d) => {
    const date = new Date(`${d.date}T00:00:00`)
    return {
      key: d.date,
      value: d.amount,
      label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      short: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }
  })

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Budget" value={money(summary.total_budget)} note={`${trip.travelers_count} travellers`} />
        <StatTile label="Spent" value={money(summary.spent)} note={`${expenses.length} expense${expenses.length === 1 ? '' : 's'}`} />
        <StatTile label="Remaining" value={money(summary.remaining)} tone={summary.remaining < 0 ? 'bad' : undefined} />
        <StatTile label="Planned activities" value={money(summary.planned_total)} note={`${money(summary.planned_per_person)} per person`} />
      </dl>

      <BudgetMeter summary={summary} money={money} />

      {expenses.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Spending by category"
            subtitle={`In ${trip.currency}`}
            rows={categoryData}
            columns={[{ key: 'label', label: 'Category' }, { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v, true) }]}
          >
            <BarList data={categoryData} format={(v) => money(v)} />
          </ChartCard>
          <ChartCard
            title="Spending by day"
            subtitle={`In ${trip.currency}`}
            rows={dayData}
            columns={[{ key: 'label', label: 'Day' }, { key: 'value', label: 'Spent', numeric: true, format: (v) => money(v, true) }]}
          >
            <ColumnChart data={dayData} format={(v) => money(v)} />
          </ChartCard>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SettleUp summary={summary} money={money} userId={user.id} />
        <Advice tripId={trip.id} />
      </div>

      <section aria-labelledby="expenses-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="expenses-heading" className="font-semibold text-slate-900">Expenses</h3>
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <LuPlus className="size-4" aria-hidden /> Log expense
            </Button>
          )}
        </div>
        {adding && <ExpenseForm trip={trip} onClose={() => setAdding(false)} />}
        {expenses.length === 0 && !adding ? (
          <EmptyState icon={LuReceipt} title="No expenses yet">
            Log shared costs as they happen. Each one can be split evenly or by amount, in any currency.
          </EmptyState>
        ) : (
          expenses.length > 0 && <ExpenseList trip={trip} expenses={expenses} money={money} userId={user.id} />
        )}
      </section>
    </div>
  )
}

export default BudgetTab
