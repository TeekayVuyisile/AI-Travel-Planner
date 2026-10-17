import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LuArrowLeft, LuArrowRight, LuCheck, LuCloudSun, LuMapPin, LuPencil, LuSparkles, LuWallet } from 'react-icons/lu'
import api, { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { formatDateRange, formatMoney, tripLength } from '../lib/format'
import { INTERESTS, describePlace } from '../lib/trips'
import LocationAutocomplete from '../components/LocationAutocomplete'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP']
const STEPS = ['Destination', 'Dates and budget', 'Interests', 'Review']
const MAX_DAYS = 30

const today = () => new Date().toISOString().slice(0, 10)
const MAX_DATE = '2099-12-31'
// Browsers let a typed year run past four digits, so check the shape as well as presence
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= MAX_DATE

// With place search down, a typed "City, Country" is accepted; the backend locates it when planning
const typedPlace = (query) => {
  const parts = query.split(',').map((p) => p.trim()).filter(Boolean)
  return parts.length ? { name: parts[0], country: parts.length > 1 ? parts[parts.length - 1] : null, region: null, lat: null, lng: null } : null
}

const validateStep = (step, form, searchDown) => {
  const errors = {}
  if (step === 0 && !form.place && !(searchDown && form.query.trim())) {
    errors.destination = form.query.trim() ? 'Pick a place from the suggestions' : 'Where are you going?'
  }
  if (step === 1) {
    if (!isDate(form.start_date)) errors.start_date = 'Pick a start date'
    if (!isDate(form.end_date)) errors.end_date = 'Pick an end date'
    else if (isDate(form.start_date) && form.end_date < form.start_date) errors.end_date = 'End date must be on or after the start date'
    else if (isDate(form.start_date) && tripLength(form.start_date, form.end_date) > MAX_DAYS) errors.end_date = `Trips can be at most ${MAX_DAYS} days`
    if (!(Number(form.total_budget) >= 1)) errors.total_budget = 'Enter a budget of at least 1'
    if (!(Number(form.travelers_count) >= 1)) errors.travelers_count = 'At least 1 traveller'
  }
  return errors
}

const Stepper = ({ step }) => (
  <ol className="flex items-center gap-2" aria-label="Progress">
    {STEPS.map((label, index) => (
      <li key={label} className="flex flex-1 items-center gap-2" aria-current={index === step ? 'step' : undefined}>
        <span className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          index < step ? 'bg-brand-700 text-white' : index === step ? 'bg-brand-50 text-brand-800 ring-2 ring-brand-700' : 'bg-slate-100 text-slate-500',
        )}>
          {index < step ? <LuCheck className="size-4" aria-hidden /> : index + 1}
        </span>
        <span className={cn('hidden text-sm font-medium md:inline', index === step ? 'text-slate-900' : 'text-slate-500')}>{label}</span>
        <span className="sr-only">{index < step ? '(done)' : ''}</span>
        {index < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" aria-hidden />}
      </li>
    ))}
  </ol>
)

// Current weather and budget per person per day, shown beside the dates step.
// Mock data from the backend fallbacks is never shown as if it were real.
const Preview = ({ form }) => {
  const { place } = form
  const weather = useQuery({
    queryKey: ['weather-now', place?.name, place?.country],
    queryFn: () => api.get('/weather/current', { params: { city: place.name, country: place.country_code || place.country || '' } }).then((r) => r.data),
    enabled: Boolean(place),
    staleTime: 10 * 60_000,
  })
  const days = isDate(form.start_date) && isDate(form.end_date) && form.end_date >= form.start_date
    ? tripLength(form.start_date, form.end_date)
    : null
  const budget = Number(form.total_budget)
  const travellers = Number(form.travelers_count) || 1
  const conversion = useQuery({
    queryKey: ['convert', budget, form.currency],
    queryFn: () => api.get('/currency/convert', { params: { amount: budget, from: form.currency, to: 'USD' } }).then((r) => r.data),
    enabled: budget >= 1 && form.currency !== 'USD',
    staleTime: 60 * 60_000,
  })

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <LuCloudSun className="size-4" aria-hidden /> Right now in {place?.name}
        </p>
        {weather.data?.source === 'openweathermap' ? (
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {weather.data.temperature}°C <span className="text-base font-medium capitalize text-slate-600">{weather.data.description}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{weather.isLoading ? 'Checking...' : 'Live weather unavailable'}</p>
        )}
        <p className="mt-2 text-xs text-slate-500">Day-by-day forecasts are added to the plan when your dates are within 5 days.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <LuWallet className="size-4" aria-hidden /> Budget
        </p>
        {budget >= 1 && days ? (
          <>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{formatMoney(budget / travellers / days, form.currency)}</p>
            <p className="text-sm text-slate-600">per person per day, including accommodation</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Add dates and a budget to see the daily amount.</p>
        )}
        {conversion.data?.source === 'exchangerate-api' && (
          <p className="mt-2 text-sm text-slate-600">About {formatMoney(conversion.data.converted_amount, 'USD')} in total</p>
        )}
      </div>
    </aside>
  )
}

const NewTrip = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    query: '', place: null, title: '', start_date: '', end_date: '',
    total_budget: '', currency: 'ZAR', travelers_count: 2, interests: [],
  })
  const [errors, setErrors] = useState({})
  const [generateNow, setGenerateNow] = useState(true)
  const [searchDown, setSearchDown] = useState(false)

  const createTrip = useMutation({
    mutationFn: (data) => api.post('/trips', data).then((r) => r.data.trip),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      navigate(`/trips/${trip.id}${generateNow ? '?generate=1' : ''}`)
    },
  })

  const update = (event) => {
    const { name, value } = event.target
    setForm((f) => ({ ...f, [name]: value }))
  }
  const toggleInterest = (id) => setForm((f) => ({
    ...f,
    interests: f.interests.includes(id) ? f.interests.filter((i) => i !== id) : [...f.interests, id],
  }))

  const next = () => {
    const stepErrors = validateStep(step, form, searchDown)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return
    if (step === 0 && !form.place) setForm((f) => ({ ...f, place: typedPlace(f.query) }))
    setStep(step + 1)
  }

  const submit = () => {
    const { place } = form
    createTrip.mutate({
      title: form.title.trim() || undefined,
      destination_city: place.name,
      destination_country: place.country || undefined,
      destination_lat: place.lat ?? undefined,
      destination_lng: place.lng ?? undefined,
      start_date: form.start_date,
      end_date: form.end_date,
      total_budget: Number(form.total_budget),
      currency: form.currency,
      travelers_count: Number(form.travelers_count),
      interests: form.interests,
    })
  }

  const interestLabels = form.interests.map((id) => INTERESTS.find((i) => i.id === id)?.label)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Plan a trip</h1>
      <div className="mt-8"><Stepper step={step} /></div>

      <form
        noValidate
        onSubmit={(event) => { event.preventDefault(); if (step < STEPS.length - 1) next(); else submit() }}
        className={cn('mt-8 grid gap-6', step === 1 && 'lg:grid-cols-[1fr_18rem]')}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="mt-6 space-y-5">
              <LocationAutocomplete
                label="City or town"
                autoFocus
                value={form.query}
                placeholder="Start typing, for example Cape Town"
                onInputChange={(query) => setForm((f) => ({ ...f, query, place: null }))}
                onUnavailable={setSearchDown}
                onSelect={(place) => {
                  setForm((f) => ({ ...f, place, query: [place.name, describePlace(place)].filter(Boolean).join(', ') }))
                  setErrors({})
                }}
                error={errors.destination}
                hint={searchDown
                  ? 'You can continue with the name you typed, for example "Knysna, South Africa".'
                  : 'Picking from the list pins the exact place, so the weather and map are right.'}
              />
              {form.place && (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
                  <LuMapPin className="size-4 shrink-0" aria-hidden />
                  {form.place.name}{describePlace(form.place) && `, ${describePlace(form.place)}`}
                </p>
              )}
              <Field label="Trip name (optional)" name="title" placeholder="Long weekend with the crew" value={form.title} onChange={update} />
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Start date" name="start_date" type="date" min={today()} max={MAX_DATE} value={form.start_date} onChange={update} error={errors.start_date} />
              <Field label="End date" name="end_date" type="date" min={form.start_date || today()} max={MAX_DATE} value={form.end_date} onChange={update} error={errors.end_date} />
              <Field label="Travellers" name="travelers_count" type="number" min={1} max={30} value={form.travelers_count} onChange={update} error={errors.travelers_count} />
              <div className="grid grid-cols-[1fr_6.5rem] gap-3">
                <Field label="Total budget" name="total_budget" type="number" min={1} inputMode="decimal" value={form.total_budget} onChange={update} error={errors.total_budget} />
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
            </div>
          )}

          {step === 2 && (
            <fieldset className="mt-6">
              <legend className="text-sm text-slate-600">Pick a few. The itinerary leans towards these.</legend>
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
          )}

          {step === 3 && (
            <div className="mt-6 space-y-6">
              {createTrip.isError && <Alert>{getErrorMessage(createTrip.error, 'Could not create the trip')}</Alert>}
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {[
                  ['Destination', `${form.place.name}${describePlace(form.place) ? `, ${describePlace(form.place)}` : ''}${form.title ? ` (${form.title})` : ''}`, 0],
                  ['Dates', `${formatDateRange(form.start_date, form.end_date)} (${tripLength(form.start_date, form.end_date)} days)`, 1],
                  ['Group and budget', `${form.travelers_count} travellers, ${formatMoney(form.total_budget, form.currency)}`, 1],
                  ['Interests', interestLabels.join(', ') || 'None picked', 2],
                ].map(([label, value, target]) => (
                  <div key={label} className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">{label}</dt>
                      <dd className="mt-0.5 text-slate-900">{value}</dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(target)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                      aria-label={`Edit ${label.toLowerCase()}`}
                    >
                      <LuPencil className="size-3.5" aria-hidden /> Edit
                    </button>
                  </div>
                ))}
              </dl>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-brand-50 p-4">
                <input
                  type="checkbox"
                  checked={generateNow}
                  onChange={(event) => setGenerateNow(event.target.checked)}
                  className="mt-0.5 size-5 accent-brand-700"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-brand-900">
                    <LuSparkles className="size-4" aria-hidden /> Plan the itinerary with AI right away
                  </span>
                  <span className="mt-0.5 block text-sm text-brand-800">Takes about 10 seconds. You can edit everything afterwards.</span>
                </span>
              </label>
            </div>
          )}

          <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-6">
            {step === 0 ? (
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(step - 1) }}>
                <LuArrowLeft className="size-4" aria-hidden /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="submit">Continue <LuArrowRight className="size-4" aria-hidden /></Button>
            ) : (
              <Button type="submit" loading={createTrip.isPending}>Create trip</Button>
            )}
          </div>
        </div>

        {step === 1 && <Preview form={form} />}
      </form>
    </div>
  )
}

export default NewTrip
