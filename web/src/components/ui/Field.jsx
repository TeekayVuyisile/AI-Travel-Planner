import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

const Field = forwardRef(({ label, error, hint, className, id, ...props }, ref) => {
  const generatedId = useId()
  const inputId = id || generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'block h-11 w-full rounded-xl border bg-white px-3.5 text-base text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15',
          error ? 'border-rose-400' : 'border-slate-300',
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-rose-600">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
})

Field.displayName = 'Field'
export default Field
