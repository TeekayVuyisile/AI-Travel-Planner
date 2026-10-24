// Where the API lives. VITE_API_URL wins; on Render the static site is given the API's bare host
// as VITE_API_HOST; in development "/api" goes through the Vite proxy.
const { VITE_API_URL, VITE_API_HOST } = import.meta.env

export const API_BASE = VITE_API_URL || (VITE_API_HOST ? `https://${VITE_API_HOST}/api` : '/api')
