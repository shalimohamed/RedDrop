const STYLES = {
  Urgent: 'bg-urgent-bg text-urgent border-urgent/30',
  Standard: 'bg-standard-bg text-standard border-standard/30',
  Fulfilled: 'bg-fulfilled-bg text-fulfilled border-fulfilled/30',
  Closed: 'bg-line text-ink-soft border-line',
  Active: 'bg-urgent-bg text-urgent border-urgent/30',
};

export default function Badge({ children, tone = 'Standard', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STYLES[tone] ?? STYLES.Standard} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
