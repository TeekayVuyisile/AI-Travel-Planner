import { LuCloudSun, LuUsers, LuWallet } from 'react-icons/lu'
import Logo from '../ui/Logo'

const points = [
  { icon: LuCloudSun, text: 'Itineraries and packing lists that follow the forecast' },
  { icon: LuUsers, text: 'Invite friends, vote on plans, edit together' },
  { icon: LuWallet, text: 'Shared expenses with automatic settle-up' },
]

const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="grid min-h-dvh lg:grid-cols-2">
    <div className="flex flex-col px-4 py-8 sm:px-8">
      <Logo />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 text-sm text-slate-600">{footer}</div>}
      </div>
    </div>

    <aside className="keep-colors relative hidden overflow-hidden bg-slate-950 lg:flex lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_30rem_at_30%_20%,rgba(14,165,233,0.35),transparent)]" />
      <div className="relative max-w-md px-12">
        <p className="text-3xl font-bold tracking-tight text-balance text-white">Less group-chat chaos, more trip.</p>
        <ul className="mt-10 space-y-5">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-4 text-slate-300">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface/10 text-brand-300">
                <Icon className="size-5" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  </div>
)

export default AuthLayout
