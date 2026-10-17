import { LuMonitor, LuMoon, LuSun } from 'react-icons/lu'
import { setTheme, useTheme } from '../lib/theme'
import { cn } from '../lib/cn'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: LuSun },
  { value: 'dark', label: 'Dark', icon: LuMoon },
  { value: 'system', label: 'System', icon: LuMonitor },
]

// Segmented control. `inverse` styles it for dark sections such as the landing page header.
const ThemeSwitcher = ({ inverse = false, className }) => {
  const theme = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn('inline-flex rounded-xl p-1', inverse ? 'bg-white/10' : 'bg-slate-100', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-lg transition-colors',
              selected
                ? inverse ? 'bg-white text-slate-900' : 'bg-surface text-slate-900 shadow-sm'
                : inverse ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

export default ThemeSwitcher
