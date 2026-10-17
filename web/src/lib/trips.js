import { daysUntil } from './format'

export const INTERESTS = [
  { id: 'history', label: 'History and culture' },
  { id: 'nature', label: 'Nature and outdoors' },
  { id: 'food', label: 'Food and drink' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'beach', label: 'Beach and relaxing' },
  { id: 'art', label: 'Art and museums' },
]

export const ROLE_LABELS = { owner: 'Organiser', editor: 'Editor', viewer: 'Viewer' }

export const statusLabel = (trip) => {
  const until = daysUntil(trip.start_date)
  if (daysUntil(trip.end_date) < 0) return 'Completed'
  if (until <= 0) return 'Happening now'
  if (until === 1) return 'Tomorrow'
  return `In ${until} days`
}

export const describePlace = (place) =>
  [place.region, place.country].filter((part) => part && part !== place.name).join(', ')

// One colour per day for map pins, routes and day labels (CSS variables in index.css, theme-aware).
// Only eight hues exist; later days share a neutral colour instead of repeating one.
export const DAY_COLOR_COUNT = 8
const daySlot = (day) => (day <= DAY_COLOR_COUNT ? String(day) : 'other')
export const dayColor = (day) => `var(--day-${daySlot(day)})`
export const dayInk = (day) => `var(--day-${daySlot(day)}-ink)`

// Light-mode values for the PDF, which cannot read CSS variables
export const DAY_COLORS_PRINT = ['#256abf', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
export const DAY_OTHER_PRINT = '#64748b'

export const EXPENSE_CATEGORIES = [
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'food', label: 'Food and drink' },
  { id: 'transport', label: 'Transport' },
  { id: 'activities', label: 'Activities' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' },
]
export const expenseCategoryLabel = (id) => EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id
