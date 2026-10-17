import { forwardRef } from 'react'
import { cn } from '../../lib/cn'
import Spinner from './Spinner'

const variants = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800',
  secondary: 'bg-white text-slate-900 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  inverse: 'bg-white text-slate-900 shadow-sm hover:bg-slate-100',
  'ghost-inverse': 'text-white ring-1 ring-white/25 hover:bg-white/10',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

const Button = forwardRef(({ as: Component = 'button', variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }, ref) => (
  <Component
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-60',
      variants[variant],
      sizes[size],
      className,
    )}
    disabled={Component === 'button' ? disabled || loading : undefined}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && <Spinner className="size-4" />}
    {children}
  </Component>
))

Button.displayName = 'Button'
export default Button
