import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenRecipientNotifications, markNotificationRead } from '../services/notifications';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return undefined;
    return listenRecipientNotifications(user.uid, setNotifications, { limitTo: 100 });
  }, [user]);

  useEffect(() => {
    notifications.filter((n) => !n.read).forEach((n) => markNotificationRead(n.id));
  }, [notifications]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-8 text-center text-ink-soft">
          No notifications yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-xl border px-4 py-3 text-sm ${
                notification.read ? 'border-line text-ink-soft' : 'border-blood-700/30 bg-blood-50 text-ink'
              }`}
            >
              {notification.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
