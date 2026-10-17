import { Fragment } from 'react'

// Minimal markdown for assistant replies: paragraphs, headings, "-" / "*" / "1." lists, simple tables
// and **bold**. Builds React elements only, so model output can never inject HTML.
const inline = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>,
  )

const tableCells = (line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
const isSeparatorRow = (line) => /^\|?[\s:|-]+\|?$/.test(line) && line.includes('-')

const parse = (text) => {
  const blocks = []
  for (const raw of String(text).split('\n')) {
    const line = raw.trim()
    const last = blocks[blocks.length - 1]
    const bullet = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/)
    const heading = line.match(/^#{1,6}\s+(.*)$/)

    if (!line) {
      blocks.push({ type: 'break' })
    } else if (line.startsWith('|')) {
      if (isSeparatorRow(line)) continue
      if (last?.type === 'table') last.rows.push(tableCells(line))
      else blocks.push({ type: 'table', rows: [tableCells(line)] })
    } else if (heading) {
      blocks.push({ type: 'heading', text: heading[1] })
    } else if (bullet) {
      if (last?.type === 'list') last.items.push(bullet[1])
      else blocks.push({ type: 'list', items: [bullet[1]] })
    } else if (last?.type === 'p') {
      last.lines.push(line)
    } else {
      blocks.push({ type: 'p', lines: [line] })
    }
  }
  return blocks.filter((b) => b.type !== 'break')
}

const Markdown = ({ children }) => (
  <div className="space-y-2">
    {parse(children).map((block, i) => {
      if (block.type === 'heading') return <p key={i} className="font-semibold text-slate-900">{inline(block.text)}</p>
      if (block.type === 'list') {
        return (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-slate-400">
            {block.items.map((item, j) => <li key={j}>{inline(item)}</li>)}
          </ul>
        )
      }
      if (block.type === 'table') {
        const [head, ...rows] = block.rows
        return (
          <div key={i} className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-900">
                <tr>{head.map((cell, j) => <th key={j} scope="col" className="px-3 py-2 font-semibold">{inline(cell)}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, r) => (
                  <tr key={r}>{row.map((cell, j) => <td key={j} className="px-3 py-2 align-top">{inline(cell)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      return <p key={i}>{inline(block.lines.join(' '))}</p>
    })}
  </div>
)

export default Markdown
