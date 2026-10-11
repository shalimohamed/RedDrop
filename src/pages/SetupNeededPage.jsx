export default function SetupNeededPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-lg rounded-2xl border border-line bg-paper-raised p-8 text-center">
        <p className="font-display text-2xl font-semibold text-blood-800">
          RedDrop needs a Firebase project to run
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Copy <code className="rounded bg-blood-50 px-1.5 py-0.5">.env.example</code> to{' '}
          <code className="rounded bg-blood-50 px-1.5 py-0.5">.env.local</code>, then fill in your
          Firebase project's config values (Project settings → General → Your apps → SDK setup
          and configuration). Restart <code className="rounded bg-blood-50 px-1.5 py-0.5">npm run dev</code> afterwards.
        </p>
        <p className="mt-4 text-xs text-ink-soft/70">See README.md for full setup steps.</p>
      </div>
    </div>
  );
}
