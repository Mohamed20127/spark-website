// SPARK — Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCh32ANAz144h5aSZfjZZq3jyzxOocxi94",
  authDomain:        "sparkeg-d8fdd.firebaseapp.com",
  projectId:         "sparkeg-d8fdd",
  messagingSenderId: "667897054721",
  appId:             "1:667897054721:web:a765f25a7576d0f1dd6200"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const { title = '🔥 SPARK — طلب جديد!', body = '' } = payload.notification || {};
  self.registration.showNotification(title, {
    body, icon: '/favicon.ico', badge: '/favicon.ico',
    actions: [{ action: 'view', title: '📦 عرض الطلب' }],
    data: { url: '/admin.html?view=orders' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/admin.html';
  e.waitUntil(clients.openWindow(url));
});
