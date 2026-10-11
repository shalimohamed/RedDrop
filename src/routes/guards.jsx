import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function RequireDonor({ children }) {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (role !== 'donor') return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function RequireFacility({ children }) {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (role !== 'facility') return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
