import { Link } from 'react-router-dom';
import Badge from '../common/Badge';

function timeAgo(timestamp) {
  if (!timestamp?.toDate) return 'just now';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp.toDate().getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
}

export default function AppealCard({ appeal }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-3xl font-semibold text-blood-800">{appeal.bloodType}</p>
          <p className="text-sm text-ink-soft">{appeal.facilityName}</p>
        </div>
        <Badge tone={appeal.urgencyLevel}>{appeal.urgencyLevel}</Badge>
      </div>

      <p className="font-utility text-xs uppercase tracking-wide text-ink-soft/70">
        Posted {timeAgo(appeal.createdAt)}
      </p>

      <Link
        to={`/appeals/${appeal.id}`}
        className="mt-auto inline-flex items-center justify-center rounded-full bg-blood-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blood-800"
      >
        I Can Donate
      </Link>
    </article>
  );
}
