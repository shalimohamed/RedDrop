import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { setDonorAvailability, daysSinceLastDonation, saveDonorFcmToken } from '../services/donors';
import { registerForPushNotifications } from '../services/notifications';
import { listenDonorResponses } from '../services/responses';
import Badge from '../components/common/Badge';

function lastNMonths(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (n - 1 - i));
    return d;
  });
}

function activityByMonth(responses) {
  const months = lastNMonths(6);
  const counts = months.map((d) => ({
    key: `${d.getFullYear()}-${d.getMonth()}`,
    label: d.toLocaleDateString(undefined, { month: 'short' }),
    responses: 0,
  }));
  const indexByKey = new Map(counts.map((c, i) => [c.key, i]));

  responses.forEach((response) => {
    const createdAt = response.createdAt?.toDate ? response.createdAt.toDate() : null;
    if (!createdAt) return;
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const index = indexByKey.get(key);
    if (index !== undefined) counts[index].responses += 1;
  });

  return counts;
}

export default function DonorDashboardPage() {
  const { user, profile } = useAuth();
  const [responses, setResponses] = useState([]);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return listenDonorResponses(user.uid, setResponses);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications()
      .then((token) => { if (token) saveDonorFcmToken(user.uid, token); })
      .catch(() => {});
  }, [user]);

  const chartData = useMemo(() => activityByMonth(responses), [responses]);

  if (!profile) {
    return <p className="mx-auto max-w-4xl px-6 py-16 text-ink-soft">Loading your dashboard…</p>;
  }

  const days = daysSinceLastDonation(profile.lastDonationDate);

  const toggleAvailability = async () => {
    setUpdatingAvailability(true);
    try {
      await setDonorAvailability(user.uid, !profile.isAvailable);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Welcome back, {profile.fullName}</h1>
      <p className="mt-1 text-ink-soft">
        {profile.bloodType} donor · {profile.location}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Stat label="Total donations" value={profile.totalDonations} />
        <Stat label="Days since last donation" value={days ?? 'No record yet'} />
        <div className="rounded-2xl border border-line bg-paper-raised p-5">
          <p className="font-utility text-xs uppercase tracking-wide text-ink-soft">Availability</p>
          <button
            onClick={toggleAvailability}
            disabled={updatingAvailability}
            className="mt-2"
          >
            <Badge tone={profile.isAvailable ? 'Fulfilled' : 'Closed'}>
              {profile.isAvailable ? 'Available to donate' : 'Not available'}
            </Badge>
          </button>
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-paper-raised p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Your activity — last 6 months</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e6d9d3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#5c4946', fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#5c4946', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: '#fbf6f2' }}
                contentStyle={{ borderRadius: 12, borderColor: '#e6d9d3', fontSize: 13 }}
              />
              <Bar dataKey="responses" fill="#9c1429" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-5">
      <p className="font-utility text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-blood-800">{value}</p>
    </div>
  );
}
