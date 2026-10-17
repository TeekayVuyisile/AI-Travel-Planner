// `exact` keeps cents (for expenses and splits); otherwise amounts round to whole units
export const formatMoney = (amount, currency = 'ZAR', { exact = false } = {}) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: exact ? 2 : 0 }).format(Number(amount) || 0)

// Date-only strings ("2026-11-07") are parsed as local dates, not UTC
const toDate = (value) => new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value)

export const formatDateRange = (start, end) => {
  const opts = { day: 'numeric', month: 'short' }
  return `${toDate(start).toLocaleDateString('en-GB', opts)} - ${toDate(end).toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`
}

export const tripLength = (start, end) => Math.round((toDate(end) - toDate(start)) / 86400000) + 1

export const daysUntil = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((toDate(date) - today) / 86400000)
}

export const initials = (user) => `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()
