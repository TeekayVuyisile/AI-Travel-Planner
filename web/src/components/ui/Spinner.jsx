import { cn } from '../../lib/cn'

const Spinner = ({ className }) => (
  <span
    className={cn('inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    role="status"
    aria-label="Loading"
  />
)

export default Spinner
