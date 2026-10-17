// Accepts 'YYYY-MM-DD' strings (how pg returns DATE columns, see config/database.js) or Date objects
export const toISODate = (value) => {
  if (typeof value === 'string') return value.slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

export const tripDayCount = (trip) => {
  const start = new Date(`${toISODate(trip.start_date)}T00:00:00Z`);
  const end = new Date(`${toISODate(trip.end_date)}T00:00:00Z`);
  return Math.round((end - start) / 86400000) + 1;
};
