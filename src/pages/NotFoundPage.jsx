import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-display text-5xl font-semibold text-blood-800">404</p>
      <p className="mt-3 text-ink-soft">This page doesn't exist.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-blood-700 hover:underline">
        ← Back to RedDrop
      </Link>
    </div>
  );
}
