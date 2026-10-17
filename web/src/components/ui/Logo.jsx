import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export const LogoMark = ({ className }) => (
  <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
    <rect width="32" height="32" rx="8" fill="#0369a1" />
    <path d="M9 21.5 16 8l7 13.5-7-3.2-7 3.2Z" fill="#fff" />
    <circle cx="16" cy="24.5" r="1.6" fill="#fb923c" />
  </svg>
)

const Logo = ({ to = '/', inverse = false, className }) => (
  <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="AI Travel Assistant home">
    <LogoMark />
    <span className={cn('text-[15px] font-bold tracking-tight', inverse ? 'text-white' : 'text-slate-900')}>
      AI Travel Assistant
    </span>
  </Link>
)

export default Logo
