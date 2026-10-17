import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LuMapPin, LuX } from 'react-icons/lu'
import api, { getErrorMessage } from '../../lib/api'
import LocationAutocomplete from '../LocationAutocomplete'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Field from '../ui/Field'

const CATEGORIES = ['history', 'nature', 'food', 'shopping', 'adventure', 'nightlife', 'beach', 'art', 'transport', 'rest']

const selectClass = 'block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15'

// Add (no `item`) or edit an itinerary activity. `near` biases the location search to the destination.
const ItemForm = ({ trip, day, item, near, onClose }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: item?.title ?? '',
    start_time: item?.start_time?.slice(0, 5) ?? '',
    category: item?.category ?? '',
    est_cost: item ? Number(item.est_cost) : 0,
    description: item?.description ?? '',
    lat: item?.lat ?? null,
    lng: item?.lng ?? null,
  })
  const [placeQuery, setPlaceQuery] = useState('')
  const [pickedPlace, setPickedPlace] = useState(null)
  const [titleError, setTitleError] = useState('')

  const save = useMutation({
    mutationFn: (body) => (item
      ? api.patch(`/trips/${trip.id}/items/${item.id}`, body)
      : api.post(`/trips/${trip.id}/items`, { ...body, day })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', String(trip.id), 'items'] })
      onClose()
    },
  })

  const update = (event) => {
    const { name, value } = event.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const submit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setTitleError('Give the activity a name')
      return
    }
    save.mutate({
      title: form.title.trim(),
      start_time: form.start_time || null,
      category: form.category || null,
      est_cost: Number(form.est_cost) || 0,
      description: form.description.trim() || null,
      lat: form.lat,
      lng: form.lng,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{item ? 'Edit activity' : `Add an activity to day ${day}`}</p>
      {save.isError && <Alert>{getErrorMessage(save.error, 'Could not save the activity')}</Alert>}

      <Field label="Name" name="title" autoFocus value={form.title} onChange={update} error={titleError} maxLength={255} />

      <div>
        {form.lat != null ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Location</p>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
              <span className="flex items-center gap-2">
                <LuMapPin className="size-4 text-slate-400" aria-hidden />
                {pickedPlace
                  ? `Pinned at ${pickedPlace}`
                  : item?.location_verified === false && item.lat === form.lat ? 'Approximate pin (AI estimate)' : 'Pinned on the map'}
              </span>
              <button
                type="button"
                onClick={() => { setPickedPlace(null); setForm((f) => ({ ...f, lat: null, lng: null })) }}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-medium text-slate-600 hover:bg-slate-200"
              >
                <LuX className="size-4" aria-hidden /> Change
              </button>
            </div>
          </div>
        ) : (
          <LocationAutocomplete
            label="Location (optional)"
            type="place"
            near={near}
            value={placeQuery}
            placeholder="Search for a place to pin it on the map"
            onInputChange={setPlaceQuery}
            onSelect={(place) => {
              setPlaceQuery(place.name)
              setPickedPlace(place.name)
              setForm((f) => ({ ...f, lat: place.lat, lng: place.lng, title: f.title || place.name }))
            }}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Start time" name="start_time" type="time" value={form.start_time} onChange={update} />
        <div>
          <label htmlFor={`category-${item?.id ?? 'new'}`} className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
          <select id={`category-${item?.id ?? 'new'}`} name="category" value={form.category} onChange={update} className={selectClass}>
            <option value="">None</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <Field label={`Cost per person (${trip.currency})`} name="est_cost" type="number" min={0} inputMode="decimal" value={form.est_cost} onChange={update} />
      </div>

      <div>
        <label htmlFor={`description-${item?.id ?? 'new'}`} className="mb-1.5 block text-sm font-medium text-slate-700">Notes (optional)</label>
        <textarea
          id={`description-${item?.id ?? 'new'}`}
          name="description"
          rows={2}
          maxLength={600}
          value={form.description}
          onChange={update}
          className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" size="sm" loading={save.isPending}>{item ? 'Save changes' : 'Add activity'}</Button>
      </div>
    </form>
  )
}

export default ItemForm
