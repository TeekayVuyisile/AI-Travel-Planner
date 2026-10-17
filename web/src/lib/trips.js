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

// One colour per day, used on the map markers, routes and day labels
export const DAY_COLORS = ['#0284c7', '#ea580c', '#7c3aed', '#059669', '#e11d48', '#d97706', '#0d9488', '#4f46e5']
export const dayColor = (day) => DAY_COLORS[(day - 1) % DAY_COLORS.length]
