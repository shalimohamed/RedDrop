import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { registerFacility, registerFacilityWithGoogle, signInWithGoogle } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import GoogleButton from '../components/common/GoogleButton';

const FACILITY_TYPES = ['Hospital', 'Blood Bank', 'Donation Center', 'Clinic'];

const KENYA_COUNTIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Uasin Gishu',
  'Kiambu',
  'Machakos',
  'Kajiado',
  'Kilifi',
  'Meru',
  'Nyeri',
  'Kakamega',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const initialForm = {
  facilityName: '',
  email: '',
  password: '',
  facilityType: '',
  address: '',
  hoursDays: [],
  hoursOpen: '',
  hoursClose: '',
  contactInfo: '',
};

function formatAvailableHours({ hoursDays, hoursOpen, hoursClose }) {
  let dayPart;
  if (hoursDays.length === 7) {
    dayPart = 'Daily';
  } else if (DAYS.slice(0, 5).every((d) => hoursDays.includes(d)) && hoursDays.length === 5) {
    dayPart = 'Mon–Fri';
  } else if (DAYS.slice(5).every((d) => hoursDays.includes(d)) && hoursDays.length === 2) {
    dayPart = 'Sat–Sun';
  } else {
    dayPart = DAYS.filter((d) => hoursDays.includes(d)).join(', ');
  }
  return `${dayPart} · ${hoursOpen}–${hoursClose}`;
}

export default function RegisterFacilityPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (user && !role && !form.facilityName) {
      setForm((prev) => ({ ...prev, facilityName: user.displayName ?? '' }));
    }
  }, [user, role]);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const toggleDay = (day) => () =>
    setForm((prev) => ({
      ...prev,
      hoursDays: prev.hoursDays.includes(day)
        ? prev.hoursDays.filter((d) => d !== day)
        : [...prev.hoursDays, day],
    }));

  const handleGoogleContinue = async () => {
    setError('');
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (submitError) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.hoursDays.length === 0 || !form.hoursOpen || !form.hoursClose) {
      setError('Please select at least one available day and both opening/closing times.');
      return;
    }

    const availableHours = formatAvailableHours(form);
    setSubmitting(true);
    try {
      if (user && !role) {
        await registerFacilityWithGoogle(user, {
          facilityName: form.facilityName,
          facilityType: form.facilityType,
          address: form.address,
          availableHours,
          contactInfo: form.contactInfo,
        });
      } else {
        await registerFacility({ ...form, availableHours });
      }
      navigate('/facility/dashboard');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="mx-auto max-w-md px-6 py-16 text-ink-soft">Loading…</p>;
  }

  if (user && role) {
    return <Navigate to={role === 'facility' ? '/facility/dashboard' : '/donor/dashboard'} replace />;
  }

  const completingGoogleSignup = Boolean(user && !role);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">Register as a Facility</h1>

      {!completingGoogleSignup && (
        <>
          <GoogleButton onClick={handleGoogleContinue} disabled={googleSubmitting} className="mt-6">
            {googleSubmitting ? 'Signing in…' : 'Continue with Google'}
          </GoogleButton>
          <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-soft">
            <hr className="flex-1 border-line" />
            or register with email
            <hr className="flex-1 border-line" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${completingGoogleSignup ? 'mt-6' : 'mt-4'}`}>
        <Field label="Facility name" value={form.facilityName} onChange={update('facilityName')} />

        {completingGoogleSignup ? (
          <p className="text-sm text-ink-soft">
            Signed in as <span className="font-medium text-ink">{user.email}</span> via Google.
          </p>
        ) : (
          <>
            <Field label="Email" type="email" value={form.email} onChange={update('email')} />
            <Field label="Password" type="password" value={form.password} onChange={update('password')} />
          </>
        )}

        <div>
          <label htmlFor="facilityType" className="mb-1 block text-sm font-medium text-ink">
            Facility type
          </label>
          <select
            id="facilityType"
            required
            value={form.facilityType}
            onChange={update('facilityType')}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 focus:border-blood-600 focus:outline-none"
          >
            <option value="" disabled>
              Select type
            </option>
            {FACILITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-ink">
            Physical address (county)
          </label>
          <select
            id="address"
            required
            value={form.address}
            onChange={update('address')}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 focus:border-blood-600 focus:outline-none"
          >
            <option value="" disabled>
              Select county
            </option>
            {KENYA_COUNTIES.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-ink">Available days</legend>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <label key={day} className="flex items-center gap-1.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={form.hoursDays.includes(day)}
                  onChange={toggleDay(day)}
                  className="rounded border-line text-blood-600 focus:ring-blood-600"
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hoursOpen" className="mb-1 block text-sm font-medium text-ink">
              Opens
            </label>
            <input
              id="hoursOpen"
              type="time"
              required
              value={form.hoursOpen}
              onChange={update('hoursOpen')}
              className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="hoursClose" className="mb-1 block text-sm font-medium text-ink">
              Closes
            </label>
            <input
              id="hoursClose"
              type="time"
              required
              value={form.hoursClose}
              onChange={update('hoursClose')}
              className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
            />
          </div>
        </div>

        <Field label="Contact information" value={form.contactInfo} onChange={update('contactInfo')} />

        {error && <p className="text-sm text-urgent">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create facility account'}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, type = 'text', id, ...props }) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        required
        type={type}
        {...props}
        className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
      />
    </div>
  );
}
