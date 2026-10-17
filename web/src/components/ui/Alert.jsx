import { LuCircleAlert } from 'react-icons/lu'

const Alert = ({ children }) => (
  <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
    <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
    <div>{children}</div>
  </div>
)

export default Alert
