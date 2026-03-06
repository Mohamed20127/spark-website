// Firebase Cloud Messaging Service Worker
// This file must be at the ROOT of your website

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCh32ANAz144h5aSZfjZZq3jyzxOocxi94",
  authDomain: "sparkeg-d8fdd.firebaseapp.com",
  projectId: "sparkeg-d8fdd",
  storageBucket: "sparkeg-d8fdd.firebasestorage.app",
  messagingSenderId: "667897054721",
  appId: "1:667897054721:web:a765f25a7576d0f1dd6200"
});

const messaging = firebase.messaging();

// Handle background messages (when tab is closed or hidden)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification('🔥 SPARK — ' + (title || 'طلب جديد!'), {
    body: body || 'لديك طلب جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'new-order',
    requireInteraction: true,
    actions: [
      { action: 'view', title: '📦 عرض الطلب' },
      { action: 'dismiss', title: 'إغلاق' }
    ]
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow('/spark-admin.html?view=orders')
    );
  }
});
