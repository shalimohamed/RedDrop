import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getUserRole, hasUserRecord, login, signInWithGoogle } from '../services/auth';
import Button from '../components/common/Button';
import GoogleButton from '../components/common/GoogleButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const dashboardPathForRole = (role) => (role === 'facility' ? '/facility/dashboard' : '/donor/dashboard');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (location.state?.from?.pathname) {
        navigate(location.state.from.pathname);
      } else {
        const role = await getUserRole(user.uid);
        navigate(dashboardPathForRole(role));
      }
    } catch (submitError) {
      setError('Incorrect email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleSubmitting(true);
    try {
      const user = await signInWithGoogle();
      const registered = await hasUserRecord(user.uid);
      if (!registered) {
        navigate('/register');
      } else if (location.state?.from?.pathname) {
        navigate(location.state.from.pathname);
      } else {
        const role = await getUserRole(user.uid);
        navigate(dashboardPathForRole(role));
      }
    } catch (submitError) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="font-display text-3xl font-semibold text-ink">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-urgent">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-soft">
        <hr className="flex-1 border-line" />
        or
        <hr className="flex-1 border-line" />
      </div>

      <GoogleButton onClick={handleGoogleLogin} disabled={googleSubmitting} className="mt-4">
        {googleSubmitting ? 'Signing in…' : 'Continue with Google'}
      </GoogleButton>

      <p className="mt-6 text-sm text-ink-soft">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-blood-700 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
