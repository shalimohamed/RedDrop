import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getCountFromServer, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { listenActiveAppeals } from '../services/appeals';
import AppealCard from '../components/appeals/AppealCard';
import Button from '../components/common/Button';

function useStat(collectionName) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    getCountFromServer(collection(db, collectionName))
      .then((snap) => setCount(snap.data().count))
      .catch(() => setCount(0));
  }, [collectionName]);
  return count;
}

function useResponsesReachedStat() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    getDoc(doc(db, 'stats', 'global'))
      .then((snap) => setCount(snap.exists() ? snap.data().totalResponses : 0))
      .catch(() => setCount(0));
  }, []);
  return count;
}

export default function LandingPage() {
  const { user } = useAuth();
  const [previewAppeals, setPreviewAppeals] = useState([]);
  const donorCount = useStat('donors');
  const driveCount = useStat('events');
  const livesSaved = useResponsesReachedStat();

  useEffect(() => listenActiveAppeals(setPreviewAppeals, { limitTo: 3 }), []);

  return (
    <div>
      <section className="bg-gradient-to-b from-blood-900 to-blood-800 px-6 py-20 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            One donation. A second chance for someone, today.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            RedDrop connects donors, hospitals, and donation facilities across Kenya in real
            time — so no urgent appeal goes unanswered.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {!user && (
              <>
                <Button as={Link} to="/register/donor" variant="ghost">
                  Register as Donor
                </Button>
                <Button as={Link} to="/register/facility" variant="outlineOnDark">
                  Register as a Facility
                </Button>
              </>
            )}
            <Button as={Link} to="/appeals" variant="outlineOnDark">
              Browse Appeals
            </Button>
            <Button as={Link} to="/drives" variant="outlineOnDark">
              View Blood Drives
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper-raised px-6 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 text-center sm:grid-cols-3">
          {[
            { label: 'Registered donors', value: donorCount },
            { label: 'Lives reached', value: livesSaved },
            { label: 'Blood drives hosted', value: driveCount },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-4xl font-semibold text-blood-800">
                {stat.value ?? '—'}
              </p>
              <p className="mt-1 font-utility text-xs uppercase tracking-wide text-ink-soft">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">Active appeals right now</h2>
            <Link to="/appeals" className="text-sm font-semibold text-blood-700 hover:underline">
              See all appeals →
            </Link>
          </div>

          {previewAppeals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-ink-soft">
              No active appeals at the moment. Check back soon, or browse upcoming blood drives.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {previewAppeals.map((appeal) => (
                <AppealCard key={appeal.id} appeal={appeal} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
