import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createAppeal,
  closeAppeal,
  listenActiveAppeals,
  listenFacilityAppeals,
  updateAppealUrgency,
} from '../services/appeals';
import { listenDonorResponses, listenFacilityResponses, markResponseDonated } from '../services/responses';
import { BLOOD_TYPES } from '../utils/bloodCompatibility';
import { URGENCY } from '../utils/urgency';
import AppealCard from '../components/appeals/AppealCard';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export default function BloodAppealsPage() {
  const { role } = useAuth();

  if (role === 'facility') {
    return <FacilityAppealsManager />;
  }

  return <PublicAppealsBrowse />;
}

function PublicAppealsBrowse() {
  const { user, role } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const unsubscribe = listenActiveAppeals((data) => {
      setAppeals(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (role !== 'donor' || !user) return undefined;
    return listenDonorResponses(user.uid, setResponses);
  }, [role, user]);

  const confirmedResponses = responses.filter((r) => r.status === 'Confirmed');

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Active Blood Appeals</h1>

      {loading ? (
        <p className="mt-10 text-ink-soft">Loading appeals…</p>
      ) : appeals.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-8 text-center text-ink-soft">
          No active appeals right now.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {appeals.map((appeal) => (
            <AppealCard key={appeal.id} appeal={appeal} />
          ))}
        </div>
      )}

      {role === 'donor' && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-ink">Your confirmed responses</h2>
          {confirmedResponses.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              You haven't responded to any appeals yet. Browse active appeals above to get started.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {confirmedResponses.map((response) => (
                <li
                  key={response.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-raised px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{response.facilityName}</p>
                    <p className="text-sm text-ink-soft">
                      {response.scheduledTime ? formatScheduledTime(response.scheduledTime) : 'Immediate — head in now'}
                    </p>
                  </div>
                  <Badge tone={response.urgencyLevel ?? URGENCY.STANDARD}>{response.urgencyLevel}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

const PAGE_SIZE = 5;

function FacilityAppealsManager() {
  const { user, role, profile } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(PAGE_SIZE);
  const [responsesVisible, setResponsesVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!user) return undefined;
    return listenFacilityAppeals(user.uid, setAppeals);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return listenFacilityResponses(user.uid, setResponses);
  }, [user]);

  if (!profile) {
    return <p className="mx-auto max-w-5xl px-6 py-16 text-ink-soft">Loading…</p>;
  }

  const activeAppeals = appeals.filter((appeal) => appeal.status === 'Active');
  const historyAppeals = appeals.filter((appeal) => appeal.status !== 'Active');

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Blood Appeals</h1>

      <div className="mt-8">
        <PostAppealForm facilityId={user.uid} facilityName={profile.facilityName} role={role} />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-ink">Active appeals</h2>
        {activeAppeals.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">You don't have any active appeals right now.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {activeAppeals.map((appeal) => (
              <AppealRow key={appeal.id} appeal={appeal} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-ink">Appeal history</h2>
        {historyAppeals.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Closed or fulfilled appeals will show up here.</p>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {historyAppeals.slice(0, historyVisible).map((appeal) => (
                <AppealRow key={appeal.id} appeal={appeal} />
              ))}
            </div>
            {historyVisible < historyAppeals.length && (
              <Button
                variant="subtle"
                className="mt-4"
                onClick={() => setHistoryVisible((n) => n + PAGE_SIZE)}
              >
                Show more
              </Button>
            )}
          </>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">Donor responses</h2>
          <div className="rounded-2xl border border-line bg-paper-raised px-5 py-3 text-right">
            <p className="font-display text-2xl font-semibold text-blood-800">
              {responses.filter((r) => r.status === 'Donated').length}
            </p>
            <p className="font-utility text-xs uppercase tracking-wide text-ink-soft">donors received</p>
          </div>
        </div>
        {responses.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No donor responses yet.</p>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {responses.slice(0, responsesVisible).map((response) => (
                <ResponseRow key={response.id} response={response} />
              ))}
            </div>
            {responsesVisible < responses.length && (
              <Button
                variant="subtle"
                className="mt-4"
                onClick={() => setResponsesVisible((n) => n + PAGE_SIZE)}
              >
                Show more
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PostAppealForm({ facilityId, facilityName, role }) {
  const [bloodType, setBloodType] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState(URGENCY.STANDARD);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    setPosted(false);
    try {
      await createAppeal({ facilityId, facilityName, bloodType, urgencyLevel, role });
      setBloodType('');
      setPosted(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-paper-raised p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Post a blood appeal</h2>

      <div>
        <label htmlFor="appealBloodType" className="mb-1 block text-sm font-medium text-ink">
          Blood type needed
        </label>
        <select
          id="appealBloodType"
          required
          value={bloodType}
          onChange={(event) => setBloodType(event.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 focus:border-blood-600 focus:outline-none"
        >
          <option value="" disabled>
            Select blood type
          </option>
          {BLOOD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Urgency level</label>
        <div className="flex gap-3">
          {Object.values(URGENCY).map((level) => (
            <label
              key={level}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                urgencyLevel === level ? 'border-blood-600 bg-blood-50 text-blood-800' : 'border-line text-ink-soft'
              }`}
            >
              <input
                type="radio"
                name="urgencyLevel"
                value={level}
                checked={urgencyLevel === level}
                onChange={(event) => setUrgencyLevel(event.target.value)}
                className="hidden"
              />
              {level}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-urgent">{error}</p>}
      {posted && <p className="text-sm text-fulfilled">Appeal posted and now visible publicly.</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Posting…' : 'Post appeal'}
      </Button>
    </form>
  );
}

function formatScheduledTime(scheduledTime) {
  if (!scheduledTime) return 'Immediate';
  return new Date(scheduledTime).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return null;
  return timestamp.toDate().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ResponseRow({ response }) {
  const [marking, setMarking] = useState(false);
  const isDonated = response.status === 'Donated';

  const handleMarkDonated = async () => {
    setMarking(true);
    try {
      await markResponseDonated(response.id, response.donorId ?? null);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        isDonated ? 'border-fulfilled/30 bg-fulfilled-bg' : 'border-line bg-paper-raised'
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-ink">
          {response.name}{' '}
          <span className="font-normal text-ink-soft">({response.bloodType})</span>
          {response.donorId && <span className="ml-2 text-xs text-ink-soft">· Registered</span>}
        </p>
        <a href={`tel:${response.phone}`} className="text-sm text-blood-700 hover:underline">
          {response.phone}
        </a>
        <p className="mt-1 text-sm text-ink-soft">{formatScheduledTime(response.scheduledTime)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <Badge tone={response.urgencyLevel ?? URGENCY.STANDARD}>{response.urgencyLevel}</Badge>
          {isDonated ? (
            <Badge tone="Fulfilled">Donated ✓</Badge>
          ) : (
            <Button variant="subtle" disabled={marking} onClick={handleMarkDonated}>
              {marking ? 'Saving…' : 'Mark donated'}
            </Button>
          )}
        </div>
        {isDonated && formatTimestamp(response.donatedAt) && (
          <p className="text-xs text-ink-soft">{formatTimestamp(response.donatedAt)}</p>
        )}
      </div>
    </div>
  );
}

function AppealRow({ appeal }) {
  const [busy, setBusy] = useState(false);

  const handleUrgencyChange = async (event) => {
    setBusy(true);
    try {
      await updateAppealUrgency(appeal.id, event.target.value);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    setBusy(true);
    try {
      await closeAppeal(appeal.id);
    } finally {
      setBusy(false);
    }
  };

  const closedTimestamp = appeal.status === 'Fulfilled' ? appeal.fulfilledAt : appeal.status === 'Closed' ? appeal.closedAt : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-raised px-4 py-3">
      <div>
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-semibold text-blood-800">{appeal.bloodType}</span>
          <Badge tone={appeal.status === 'Active' ? appeal.urgencyLevel : appeal.status}>
            {appeal.status === 'Active' ? appeal.urgencyLevel : appeal.status}
          </Badge>
        </div>
        {appeal.status !== 'Active' && (
          <p className="mt-1 text-xs text-ink-soft">
            Opened {formatTimestamp(appeal.createdAt) ?? '—'}
            {closedTimestamp && <> · {appeal.status} {formatTimestamp(closedTimestamp)}</>}
          </p>
        )}
      </div>

      {appeal.status === 'Active' && (
        <div className="flex items-center gap-2">
          <select
            aria-label={`Update urgency level for the ${appeal.bloodType} appeal`}
            value={appeal.urgencyLevel}
            onChange={handleUrgencyChange}
            disabled={busy}
            className="rounded-lg border border-line bg-white px-2 py-1 text-sm"
          >
            {Object.values(URGENCY).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <Button variant="subtle" disabled={busy} onClick={handleClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
