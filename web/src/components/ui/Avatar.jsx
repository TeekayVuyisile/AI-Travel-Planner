import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

const sizes = { sm: 'size-7 text-[11px]', md: 'size-9 text-xs', lg: 'size-11 text-sm' }

export const Avatar = ({ user, size = 'md', className }) => (
  <span
    className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface', sizes[size], className)}
    style={{ backgroundColor: user?.avatar_color || '#0369a1' }}
    title={user ? `${user.first_name} ${user.last_name}` : undefined}
  >
    {initials(user)}
  </span>
)

export const AvatarStack = ({ users = [], max = 4, size = 'sm' }) => {
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map((user) => <Avatar key={user.id} user={user} size={size} />)}
      {extra > 0 && (
        <span className={cn('inline-flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 ring-2 ring-surface', sizes[size])}>
          +{extra}
        </span>
      )}
    </div>
  )
}
