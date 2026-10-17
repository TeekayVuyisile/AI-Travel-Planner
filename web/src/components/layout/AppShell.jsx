import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LuChevronsUpDown, LuLayoutDashboard, LuLogOut, LuMapPinned, LuPlus, LuUsers } from 'react-icons/lu'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'
import { cn } from '../../lib/cn'
import Logo from '../ui/Logo'
import { Avatar } from '../ui/Avatar'

const navItems = [
  { to: '/dashboard', label: 'My trips', icon: LuLayoutDashboard },
  { to: '/trips/new', label: 'Plan a trip', icon: LuPlus },
]

const NavItems = ({ onNavigate }) => (
  <nav aria-label="Main" className="flex flex-col gap-1">
    {navItems.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end
        onClick={onNavigate}
        className={({ isActive }) => cn(
          'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
        {label}
      </NavLink>
    ))}
  </nav>
)

// Lets portfolio visitors hop between the seeded accounts to see the group features from each side
const AccountMenu = ({ compact = false }) => {
  const { user, logout, loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const { data: demoUsers = [] } = useQuery({
    queryKey: ['demo-users'],
    queryFn: () => api.get('/auth/demo-users').then((r) => r.data),
    enabled: Boolean(user?.is_demo),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !menuRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const switchTo = async (id) => {
    setOpen(false)
    await loginAsDemo(id)
    navigate('/dashboard')
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={compact ? 'Account menu' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-xl text-left transition-colors hover:bg-slate-100',
          compact ? 'size-11 justify-center' : 'w-full p-2',
        )}
      >
        <Avatar user={user} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{user.first_name} {user.last_name}</span>
              <span className="block truncate text-xs text-slate-500">{user.is_demo ? 'Demo account' : user.email}</span>
            </span>
            <LuChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-30 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10',
            compact ? 'right-0 top-full mt-2' : 'bottom-full left-0 mb-2',
          )}
        >
          {demoUsers.length > 0 && (
            <>
              <p className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <LuUsers className="size-3.5" aria-hidden /> Switch demo traveller
              </p>
              {demoUsers.filter((d) => d.id !== user.id).map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  role="menuitem"
                  onClick={() => switchTo(demo.id)}
                  className="flex h-11 w-full items-center gap-3 rounded-xl px-2.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <Avatar user={demo} size="sm" />
                  {demo.first_name} {demo.last_name}
                </button>
              ))}
              <div className="my-1.5 h-px bg-slate-100" />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => { logout(); navigate('/') }}
            className="flex h-11 w-full items-center gap-3 rounded-xl px-2.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            <LuLogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

const AppShell = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-8 lg:p-4">
        <Logo to="/dashboard" className="px-2 pt-2" />
        <NavItems />
        {user?.is_demo && (
          <div className="mt-auto rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 p-4 text-white">
            <LuMapPinned className="size-5 text-accent-400" aria-hidden />
            <p className="mt-2 text-sm font-semibold">You are in demo mode</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-100">
              Switch traveller below to see the same trip from a group member's side.
            </p>
          </div>
        )}
        <div className={cn(!user?.is_demo && 'mt-auto')}>
          <AccountMenu />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo to="/dashboard" />
          <AccountMenu compact />
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pb-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => cn(
                'flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium',
                isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600',
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
