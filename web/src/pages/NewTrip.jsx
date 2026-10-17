import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LuCheck } from 'react-icons/lu'
import api, { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { INTERESTS } from '../lib/trips'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP']

const today = () => new Date().toISOString().slice(0, 10)
const MAX_DATE = '2099-12-31'
// Browsers let a typed year run past four digits, so check the shape as well as presence
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= MAX_DATE

const validate = (form) => {
  const errors = {}
  if (!form.destination_city.trim()) errors.destination_city = 'Where are you going?'
  if (!isDate(form.start_date)) errors.start_date = 'Pick a start date'
  if (!isDate(form.end_date)) errors.end_date = 'Pick an end date'
  else if (isDate(form.start_date) && form.end_date < form.start_date) errors.end_date = 'End date must be on or after the start date'
  if (!(Number(form.total_budget) >= 1)) errors.total_budget = 'Enter a budget of at least 1'
  if (!(Number(form.travelers_count) >= 1)) errors.travelers_count = 'At least 1 traveller'
  return errors
}

// Single-page trip form. The guided multi-step planner replaces it in the trip workspace update.
const NewTrip = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: '', destination_city: '', destination_country: '', start_date: '', end_date: '',
    total_budget: '', currency: 'ZAR', travelers_count: 1, interests: [],
  })
  const [fieldErrors, setFieldErrors] = useState({})

  const createTrip = useMutation({
    mutationFn: (data) => api.post('/trips', data).then((r) => r.data.trip),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      navigate(`/trips/${trip.id}`)
    },
  })

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const toggleInterest = (id) => setForm({
    ...form,
    interests: form.interests.includes(id) ? form.interests.filter((i) => i !== id) : [...form.interests, id],
  })

  const submit = (event) => {
    event.preventDefault()
    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    createTrip.mutate({
      ...form,
      title: form.title.trim() || undefined,
      total_budget: Number(form.total_budget),
      travelers_count: Number(form.travelers_count),
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Plan a trip</h1>
      <p className="mt-2 text-slate-600">The basics now. You can invite people and generate the itinerary on the next screen.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        {createTrip.isError && <Alert>{getErrorMessage(createTrip.error, 'Could not create the trip')}</Alert>}

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-sm font-semibold text-slate-900">Destination</legend>
          <Field label="City" name="destination_city" placeholder="Cape Town" value={form.destination_city} onChange={update} error={fieldErrors.destination_city} />
          <Field label="Country (optional)" name="destination_country" placeholder="South Africa" value={form.destination_country} onChange={update} />
          <Field className="sm:col-span-2" label="Trip name (optional)" name="title" placeholder="Long weekend with the crew" value={form.title} onChange={update} />
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-sm font-semibold text-slate-900">Dates and group</legend>
          <Field label="Start date" name="start_date" type="date" min={today()} max={MAX_DATE} value={form.start_date} onChange={update} error={fieldErrors.start_date} />
          <Field label="End date" name="end_date" type="date" min={form.start_date || today()} max={MAX_DATE} value={form.end_date} onChange={update} error={fieldErrors.end_date} />
          <Field label="Travellers" name="travelers_count" type="number" min={1} max={30} value={form.travelers_count} onChange={update} error={fieldErrors.travelers_count} />
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <Field label="Total budget" name="total_budget" type="number" min={1} inputMode="decimal" value={form.total_budget} onChange={update} error={fieldErrors.total_budget} />
            <div>
              <label htmlFor="currency" className="mb-1.5 block text-sm font-medium text-slate-700">Currency</label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={update}
                className="block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Interests</legend>
          <p className="mt-1 text-sm text-slate-500">Pick a few. The itinerary leans towards these.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {INTERESTS.map(({ id, label }) => {
              const selected = form.interests.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleInterest(id)}
                  className={cn(
                    'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
                    selected ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-700 hover:border-slate-400',
                  )}
                >
                  {selected && <LuCheck className="size-4" aria-hidden />}
                  {label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={createTrip.isPending}>Create trip</Button>
        </div>
      </form>
    </div>
  )
}

export default NewTrip
