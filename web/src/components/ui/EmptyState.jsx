const EmptyState = ({ icon: Icon, title, children, action }) => (
  <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-surface px-6 py-14 text-center">
    {Icon && (
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon className="size-6" aria-hidden />
      </span>
    )}
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    {children && <p className="mt-1.5 max-w-sm text-sm text-slate-600">{children}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
)

export default EmptyState
