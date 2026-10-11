import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listenAppeal } from '../services/appeals';
import GuestResponseForm from '../components/appeals/GuestResponseForm';
import Badge from '../components/common/Badge';

export default function AppealDetailPage() {
  const { appealId } = useParams();
  const [appeal, setAppeal] = useState(undefined);

  useEffect(() => listenAppeal(appealId, setAppeal), [appealId]);

  if (appeal === undefined) {
    return <p className="mx-auto max-w-2xl px-6 py-16 text-ink-soft">Loading appeal…</p>;
  }

  if (appeal === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-ink-soft">This appeal no longer exists or has been closed.</p>
        <Link to="/appeals" className="mt-4 inline-block font-semibold text-blood-700 hover:underline">
          ← Back to active appeals
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/appeals" className="text-sm font-semibold text-blood-700 hover:underline">
        ← Back to active appeals
      </Link>

      <div className="mt-4 flex items-start justify-between rounded-2xl border border-line bg-paper-raised p-6">
        <div>
          <p className="font-display text-4xl font-semibold text-blood-800">{appeal.bloodType}</p>
          <p className="mt-1 text-ink-soft">{appeal.facilityName}</p>
        </div>
        <Badge tone={appeal.urgencyLevel}>{appeal.urgencyLevel}</Badge>
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold text-ink">Confirm your donation</h2>
      <p className="mt-1 text-sm text-ink-soft">
        No account needed. The facility will be notified the moment you confirm.
      </p>

      <div className="mt-4">
        <GuestResponseForm appeal={appeal} />
      </div>
    </div>
  );
}
