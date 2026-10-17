import { useId, useState } from 'react'
import { LuChartColumn, LuTable } from 'react-icons/lu'

// Card around a chart with a chart/table toggle. The table is the accessible twin of the chart:
// every value is readable there without hovering.
const ChartCard = ({ title, subtitle, rows, columns, children }) => {
  const [asTable, setAsTable] = useState(false)
  const id = useId()

  return (
    <section aria-labelledby={id} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id={id} className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          {asTable ? <LuChartColumn className="size-3.5" aria-hidden /> : <LuTable className="size-3.5" aria-hidden />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      <div className="mt-4">
        {asTable ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                {columns.map((c) => <th key={c.key} scope="col" className={`py-2 font-medium ${c.numeric ? 'text-right' : ''}`}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={`py-2 text-slate-700 ${c.numeric ? 'text-right tabular-nums' : ''}`}>{c.format ? c.format(row[c.key]) : row[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : children}
      </div>
    </section>
  )
}

export default ChartCard
