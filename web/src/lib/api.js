import axios from 'axios'
import { API_BASE } from './apiBase'

export const TOKEN_KEY = 'token'

const api = axios.create({
  baseURL: API_BASE,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Turns the backend's { error } or express-validator { errors: [...] } into one message
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data
  if (data?.error) return data.error
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors[0].msg
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?'
  return fallback
}

export default api
