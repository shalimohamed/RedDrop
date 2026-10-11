import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLOOD_TYPES, isCompatible } from '../../utils/bloodCompatibility';
import { scheduledTimeOptions, URGENCY } from '../../utils/urgency';
import { submitAppealResponse } from '../../services/responses';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';

export default function GuestResponseForm({ appeal }) {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const timeOptions = useMemo(() => scheduledTimeOptions(), []);
  const isDonor = role === 'donor';

  const [name, setName] = useState(isDonor ? profile?.fullName ?? '' : '');
  const [phone, setPhone] = useState(isDonor ? profile?.phone ?? '' : '');
  const [bloodType, setBloodType] = useState(isDonor ? profile?.bloodType ?? '' : '');
  const [scheduledTime, setScheduledTime] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isUrgent = appeal.urgencyLevel === URGENCY.URGENT;
  const compatibilityWarning =
    bloodType && !isCompatible(bloodType, appeal.bloodType)
      ? `A ${bloodType} donor cannot donate to a ${appeal.bloodType} appeal.`
      : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (compatibilityWarning) {
      setError(compatibilityWarning);
      return;
    }

    setSubmitting(true);
    try {
      await submitAppealResponse({
        appealId: appeal.id,
        facilityId: appeal.facilityId,
        facilityName: appeal.facilityName,
        requiredBloodType: appeal.bloodType,
        urgencyLevel: appeal.urgencyLevel,
        donorId: role === 'donor' ? user.uid : null,
        name,
        phone,
        bloodType,
        scheduledTime: isUrgent ? null : scheduledTime,
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-fulfilled/30 bg-fulfilled-bg p-6 text-fulfilled">
        <p className="font-display text-lg font-semibold">Thank you — you're confirmed.</p>
        <p className="mt-2 text-sm text-ink">
          {isUrgent
            ? `Please head to ${appeal.facilityName} now. They have been notified and are expecting you.`
            : `${appeal.facilityName} has been notified of your scheduled visit.`}
        </p>
        <Button variant="subtle" className="mt-4" onClick={() => navigate('/appeals')}>
          Back to appeals
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-raised p-6">
      {isDonor ? (
        <div className="rounded-lg border border-line bg-paper px-3 py-2 text-sm">
          <p className="font-medium text-ink">Confirming as {name}</p>
          <p className="text-ink-soft">
            {bloodType} · {phone}
          </p>
          {compatibilityWarning && <p className="mt-1 text-sm text-urgent">{compatibilityWarning}</p>}
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
              Full name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-ink">
              Phone number
            </label>
            <input
              id="phone"
              required
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="responderBloodType" className="mb-1 block text-sm font-medium text-ink">
              Your blood type
            </label>
            <select
              id="responderBloodType"
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
            {compatibilityWarning && <p className="mt-1 text-sm text-urgent">{compatibilityWarning}</p>}
          </div>
        </>
      )}

      {isUrgent ? (
        <p className="rounded-lg bg-urgent-bg px-3 py-2 text-sm text-urgent">
          This is an Urgent appeal — once confirmed, please proceed to {appeal.facilityName} immediately.
        </p>
      ) : (
        <div>
          <label htmlFor="scheduledTime" className="mb-1 block text-sm font-medium text-ink">
            Arrival time (within 2 hours)
          </label>
          <select
            id="scheduledTime"
            required
            value={scheduledTime}
            onChange={(event) => setScheduledTime(event.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 focus:border-blood-600 focus:outline-none"
          >
            <option value="" disabled>
              Select a time
            </option>
            {timeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-urgent">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Confirming…' : 'Confirm I Can Donate'}
      </Button>
    </form>
  );
}
