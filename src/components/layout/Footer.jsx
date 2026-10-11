export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper-raised">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base text-ink">RedDrop</p>
          <p>Connecting donors, hospitals, and donation facilities in real time.</p>
        </div>
        <p className="mt-6 font-utility text-xs uppercase tracking-wide text-ink-soft/70">
          SWE3090 academic project &middot; USIU-Africa
        </p>
      </div>
    </footer>
  );
}
