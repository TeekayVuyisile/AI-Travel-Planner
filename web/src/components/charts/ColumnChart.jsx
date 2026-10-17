import { useState } from 'react'

// Rounds the axis maximum up to a clean number (1, 2, 2.5 or 5 times a power of ten)
const niceMax = (value) => {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value)
  return step * magnitude
}

const compact = (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

// Columns over time for a single series. Hairline grid at 0, half and max; the tallest column is
// labelled and every column shows its value on hover or keyboard focus.
const ColumnChart = ({ data, format, color = 'var(--color-brand-700)', height = 160 }) => {
  const [active, setActive] = useState(null)
  const top = niceMax(Math.max(...data.map((d) => d.value)))
  const peak = data.reduce((best, d) => (d.value > (best?.value ?? -1) ? d : best), null)
  const ticks = [top, top / 2, 0]

  return (
    <div className="flex gap-2">
      {/* Y axis ticks */}
      <div className="relative w-9 shrink-0 text-right text-[11px] tabular-nums text-slate-500" style={{ height }} aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / top) * 100}%` }}>{compact(t)}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute inset-x-0 h-px bg-slate-200" style={{ top: `${(1 - t / top) * 100}%` }} aria-hidden />
          ))}
          <ol className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d) => {
              const isActive = active === d.key
              return (
                <li
                  key={d.key}
                  tabIndex={0}
                  aria-label={`${d.label}: ${format(d.value)}`}
                  onPointerEnter={() => setActive(d.key)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(d.key)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full flex-1 items-end justify-center rounded-sm focus-visible:outline-2"
                >
                  <span
                    className="w-full max-w-6 rounded-t-[4px] transition-opacity duration-150"
                    style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value > 0 ? 2 : 0, backgroundColor: color, opacity: active && !isActive ? 0.45 : 1 }}
                    aria-hidden
                  />
                  {(isActive || (!active && d === peak && d.value > 0)) && (
                    <span
                      className={`pointer-events-none absolute z-10 -translate-y-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${isActive ? 'bg-slate-900 font-semibold text-white' : 'text-slate-700'}`}
                      style={{ bottom: `${(d.value / top) * 100}%` }}
                      aria-hidden
                    >
                      {format(d.value)}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
        {/* X axis labels sit inside the card, below the plot, so nothing is clipped */}
        <div className="mt-1.5 flex gap-[2px] text-[11px] text-slate-500" aria-hidden>
          {data.map((d) => <span key={d.key} className="flex-1 truncate text-center">{d.short}</span>)}
        </div>
      </div>
    </div>
  )
}

export default ColumnChart
