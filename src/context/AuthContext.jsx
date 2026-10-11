import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase/config';
import { listenForForegroundMessages } from '../services/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        setRole(null);
        setProfile(null);
        setRoleLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    setRoleLoading(true);
    const unsubscribeUserDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setRole(snap.exists() ? snap.data().role : null);
      setRoleLoading(false);
    });

    return unsubscribeUserDoc;
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let unsub;
    listenForForegroundMessages().then((fn) => { unsub = fn; });
    return () => unsub?.();
  }, [user]);

  useEffect(() => {
    if (!user || !role) {
      setProfile(null);
      return undefined;
    }

    const collectionName = role === 'donor' ? 'donors' : 'facilities';
    const unsubscribeProfile = onSnapshot(doc(db, collectionName, user.uid), (snap) => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });

    return unsubscribeProfile;
  }, [user, role]);

  const value = useMemo(
    () => ({
      user,
      role,
      profile,
      loading: loading || roleLoading,
      isDonor: role === 'donor',
      isFacility: role === 'facility',
    }),
    [user, role, profile, loading, roleLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
