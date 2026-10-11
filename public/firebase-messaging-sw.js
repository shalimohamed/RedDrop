// Required for Firebase Cloud Messaging background message delivery (FR-009).
// Served from the site root — Vite copies public/ to the build output automatically.
//
// The config values below must match src/firebase/config.js. This file cannot
// read .env at build time because it's a plain static script, so values are
// duplicated here intentionally — keep them in sync with .env.local.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDvMBcZhPZDhRhNkhkCZa6wPWt7QFve4y4',
  authDomain: 'reddrop-a982a.firebaseapp.com',
  projectId: 'reddrop-a982a',
  storageBucket: 'reddrop-a982a.firebasestorage.app',
  messagingSenderId: '458103909651',
  appId: '1:458103909651:web:d1d557b9b2c597d361bee6',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'RedDrop', {
    body: body ?? 'You have a new notification.',
    icon: '/blood-drop.svg',
  });
});
