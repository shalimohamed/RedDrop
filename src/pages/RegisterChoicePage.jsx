import { Link } from 'react-router-dom';

const OPTIONS = [
  {
    to: '/register/donor',
    title: 'Register as a Donor',
    description:
      'Track your donation history, set your availability, and get notified when a nearby appeal matches your blood type.',
  },
  {
    to: '/register/facility',
    title: 'Register as a Facility',
    description:
      'Post verified blood appeals, publish blood drive events, and manage donor responses from one dashboard.',
  },
];

export default function RegisterChoicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">Create your RedDrop account</h1>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <Link
            key={option.to}
            to={option.to}
            className="rounded-2xl border border-line bg-paper-raised p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="font-display text-xl font-semibold text-blood-800">{option.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{option.description}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-blood-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
