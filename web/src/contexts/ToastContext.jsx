import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { LuCircleAlert, LuCircleCheck, LuX } from 'react-icons/lu'
import { cn } from '../lib/cn'

const ToastContext = createContext(null)
const DURATION_MS = 4500

// toast.success('Saved') / toast.error('Could not save'). Successes are announced politely;
// errors use role="alert" and stay a little longer.
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback((tone, message) => {
    const id = ++nextId.current
    setToasts((list) => [...list.slice(-2), { id, tone, message }])
    setTimeout(() => dismiss(id), tone === 'error' ? DURATION_MS * 1.5 : DURATION_MS)
  }, [dismiss])

  const api = useMemo(() => ({
    success: (message) => show('success', message),
    error: (message) => show('error', message),
  }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'error' ? LuCircleAlert : LuCircleCheck
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-surface p-3.5 text-sm text-slate-900 shadow-lg shadow-black/10',
                toast.tone === 'error' ? 'border-rose-200' : 'border-slate-200',
              )}
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', toast.tone === 'error' ? 'text-rose-600' : 'text-emerald-700')} aria-hidden />
              <p className="flex-1">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <LuX className="size-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
