import { useState } from 'react'

// Horizontal bars for comparing a handful of magnitudes. One series, so one colour for every bar
// (never darker-where-bigger) and no legend. Each bar is focusable and shows its value on hover or focus.
const BarList = ({ data, format, color = 'var(--color-brand-700)' }) => {
  const [active, setActive] = useState(null)
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = (d.value / max) * 100
        const isActive = active === d.label
        return (
          <li
            key={d.label}
            tabIndex={0}
            aria-label={`${d.label}: ${format(d.value)}`}
            onPointerEnter={() => setActive(d.label)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(d.label)}
            onBlur={() => setActive(null)}
            className="group grid grid-cols-[8.75rem_1fr] items-center gap-3 rounded-md focus-visible:outline-2"
          >
            <span className="truncate text-sm text-slate-600">{d.label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-5 rounded-r-[4px] transition-opacity duration-150"
                style={{ width: `max(${pct}%, 4px)`, maxWidth: 'calc(100% - 5.5rem)', backgroundColor: color, opacity: active && !isActive ? 0.45 : 1 }}
                aria-hidden
              />
              {/* Value at the bar tip, in a text colour, never the bar colour */}
              <span className={`shrink-0 text-sm tabular-nums ${isActive ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{format(d.value)}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default BarList
