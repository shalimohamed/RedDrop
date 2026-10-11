import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBloodDriveEvent, listenUpcomingEvents } from '../services/events';
import { BLOOD_TYPES } from '../utils/bloodCompatibility';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import FieldRow from '../components/common/FieldRow';

const KENYA_CITIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Kiambu',
  'Machakos',
  'Nyeri',
  'Kakamega',
];

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function BloodDriveEventsPage() {
  const { user, role, profile } = useAuth();
  const [events, setEvents] = useState([]);

  useEffect(() => listenUpcomingEvents(setEvents), []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Blood Drive Events</h1>

      {role === 'facility' && profile && (
        <div className="mt-8">
          <PostEventForm facilityId={user.uid} facilityName={profile.facilityName} role={role} />
        </div>
      )}

      <div className="mt-10">
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-ink-soft">
            No upcoming blood drives listed yet.
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <article key={event.id} className="rounded-2xl border border-line bg-paper-raised p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink">{event.eventName}</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {event.facilityName} · {event.location}
                    </p>
                    <p className="mt-1 font-utility text-xs uppercase tracking-wide text-ink-soft/70">
                      {event.date} at {event.time}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(event.targetBloodTypes ?? []).map((type) => (
                      <Badge key={type} tone="Standard">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PostEventForm({ facilityId, facilityName, role }) {
  const [form, setForm] = useState({ eventName: '', date: '', time: '', city: '', exactLocation: '' });
  const [targetBloodTypes, setTargetBloodTypes] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const toggleType = (type) => {
    setTargetBloodTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.date < todayDateString()) {
      setError('Please choose a date from today onward.');
      return;
    }

    setSubmitting(true);
    setPosted(false);
    try {
      const { city, exactLocation, ...rest } = form;
      await createBloodDriveEvent({
        facilityId,
        facilityName,
        ...rest,
        location: `${city} — ${exactLocation}`,
        targetBloodTypes,
        role,
      });
      setForm({ eventName: '', date: '', time: '', city: '', exactLocation: '' });
      setTargetBloodTypes([]);
      setPosted(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-paper-raised p-6">
      <h2 className="font-display text-lg font-semibold text-ink">List a blood drive event</h2>

      <FieldRow label="Event name" value={form.eventName} onChange={update('eventName')} />
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Date" type="date" min={todayDateString()} value={form.date} onChange={update('date')} />
        <FieldRow label="Time" type="time" value={form.time} onChange={update('time')} />
      </div>

      <div>
        <label htmlFor="city" className="mb-1 block text-sm font-medium text-ink">
          City / county
        </label>
        <select
          id="city"
          required
          value={form.city}
          onChange={update('city')}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 focus:border-blood-600 focus:outline-none"
        >
          <option value="" disabled>
            Select city / county
          </option>
          {KENYA_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <FieldRow
        label="Exact location"
        value={form.exactLocation}
        onChange={update('exactLocation')}
        placeholder="e.g. Kenyatta National Hospital, Hospital Road"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Target blood types</label>
        <div className="flex flex-wrap gap-2">
          {BLOOD_TYPES.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => toggleType(type)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                targetBloodTypes.includes(type)
                  ? 'border-blood-600 bg-blood-700 text-white'
                  : 'border-line text-ink-soft'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-urgent">{error}</p>}
      {posted && <p className="text-sm text-fulfilled">Event published.</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Publishing…' : 'Publish event'}
      </Button>
    </form>
  );
}
