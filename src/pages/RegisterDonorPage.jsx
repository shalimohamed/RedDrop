import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { registerDonor, registerDonorWithGoogle, signInWithGoogle } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { BLOOD_TYPES } from '../utils/bloodCompatibility';
import Button from '../components/common/Button';
import GoogleButton from '../components/common/GoogleButton';

const initialForm = { fullName: '', email: '', password: '', bloodType: '', location: '', phone: '' };

export default function RegisterDonorPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (user && !role && !form.fullName) {
      setForm((prev) => ({ ...prev, fullName: user.displayName ?? '' }));
    }
  }, [user, role]);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

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
    setSubmitting(true);
    try {
      if (user && !role) {
        await registerDonorWithGoogle(user, {
          fullName: form.fullName,
          bloodType: form.bloodType,
          location: form.location,
          phone: form.phone,
        });
      } else {
        await registerDonor(form);
      }
      navigate('/donor/dashboard');
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
      <h1 className="font-display text-3xl font-semibold text-ink">Register as a Donor</h1>

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
        <Field label="Full name" value={form.fullName} onChange={update('fullName')} />

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
          <label htmlFor="bloodType" className="mb-1 block text-sm font-medium text-ink">
            Blood type
          </label>
          <select
            id="bloodType"
            required
            value={form.bloodType}
            onChange={update('bloodType')}
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

        <Field
          label="Location (city / area)"
          value={form.location}
          onChange={update('location')}
          placeholder="e.g. Westlands, Nairobi"
        />

        <Field
          label="Phone number"
          type="tel"
          value={form.phone}
          onChange={update('phone')}
          placeholder="e.g. +254700000000"
        />

        {error && <p className="text-sm text-urgent">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create donor account'}
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
