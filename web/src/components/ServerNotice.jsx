import { LuLoaderCircle, LuServerCrash } from 'react-icons/lu'
import { useServerStatus } from '../contexts/ServerStatusContext'
import { cn } from '../lib/cn'

const tones = {
  default: 'border-amber-200 bg-amber-50 text-amber-900',
  inverse: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
}

// Explains a slow first request on free hosting. Hidden once the API responds.
const ServerNotice = ({ tone = 'default', className }) => {
  const status = useServerStatus()
  if (status !== 'waking' && status !== 'offline') return null

  const waking = status === 'waking'
  const Icon = waking ? LuLoaderCircle : LuServerCrash

  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', tones[tone], className)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', waking && 'motion-safe:animate-spin')} aria-hidden />
      <div>
        <p className="font-semibold">{waking ? 'Waking up the demo server…' : 'The server isn’t responding right now.'}</p>
        <p className="mt-0.5 opacity-90">
          {waking
            ? 'It runs on free hosting that sleeps when idle, so the first visit can take up to a minute.'
            : 'Please try again in a few minutes.'}
        </p>
      </div>
    </div>
  )
}

export default ServerNotice
