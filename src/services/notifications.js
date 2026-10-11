import { collection, limit, onSnapshot, orderBy, query, updateDoc, doc, where } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, getMessagingIfSupported } from '../firebase/config';

export function listenRecipientNotifications(recipientId, onChange, { limitTo = 10 } = {}) {
  const recipientQuery = query(
    collection(db, 'notifications'),
    where('recipientId', '==', recipientId),
    orderBy('createdAt', 'desc'),
    limit(limitTo),
  );

  return onSnapshot(recipientQuery, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function listenForForegroundMessages() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};

  return onMessage(messaging, async (payload) => {
    const { title, body } = payload.notification ?? {};
    if (Notification.permission !== 'granted') return;
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title ?? 'RedDrop', {
          body: body ?? 'You have a new notification.',
          icon: '/blood-drop.svg',
        });
        return;
      } catch {
      }
    }
    new Notification(title ?? 'RedDrop', {
      body: body ?? 'You have a new notification.',
      icon: '/blood-drop.svg',
    });
  });
}

export async function registerForPushNotifications() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  return getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
}
