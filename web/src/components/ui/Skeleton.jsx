import { cn } from '../../lib/cn'

// Grey placeholder shaped like the content that is loading. Hidden from screen readers;
// the surrounding region carries aria-busy instead.
const Skeleton = ({ className }) => (
  <span className={cn('block animate-pulse rounded-lg bg-slate-200', className)} aria-hidden />
)

export const TripSkeleton = () => (
  <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12" aria-busy="true" aria-label="Loading trip">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="mt-6 h-6 w-24 rounded-full" />
    <Skeleton className="mt-4 h-9 w-2/3 max-w-md" />
    <Skeleton className="mt-3 h-4 w-48" />
    <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
    <div className="mt-10 flex gap-3">
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-24" />)}
    </div>
    <div className="mt-6 space-y-4">
      {[0, 1].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
    </div>
  </div>
)

export const ListSkeleton = ({ rows = 3 }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
  </div>
)

export default Skeleton
