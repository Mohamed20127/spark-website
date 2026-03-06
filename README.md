# 🔥 SPARK Restaurant System v3

## Project Structure
```
spark/
├── index.html                  ← Restaurant website
├── admin.html                  ← Admin panel
├── firebase-messaging-sw.js    ← FCM background notifications
├── styles/
│   ├── restaurant.css
│   └── admin.css
└── src/
    ├── config/firebase.js      ← Single Firebase instance
    ├── shared/
    │   ├── db.js               ← All Firestore operations
    │   └── utils.js            ← Sound, toast, animations
    └── admin/
        ├── app.js              ← Admin logic
        └── auth.js             ← Login/roles/permissions
        └── restaurant/
            └── app.js          ← Restaurant logic
```

## Run Locally
```bash
# Option 1: Python
python3 -m http.server 3000

# Option 2: Node
npx serve .
```
> ⚠️ Must run via HTTP (not file://) — ES modules require a server

## Deploy to Vercel
```bash
git add .
git commit -m "spark v3"
git push
```

## First Admin Setup
1. Firebase Console → Authentication → Add user
2. Firestore → Collection `users` → Doc with UID:
   ```json
   { "name": "Your Name", "email": "...", "role": "super", "active": true }
   ```

## Push Notifications
1. Firebase Console → Project Settings → Cloud Messaging → Web Push → Generate VAPID key
2. Firestore → `config/fcm` → `{ "vapidKey": "YOUR_KEY" }`

## Features Implemented
✅ QR table ordering system
✅ Real-time orders dashboard
✅ Auto order numbering
✅ Sound effects (new order / confirm / add to cart)
✅ Cart fly animation
✅ Order status tracker (4 steps)
✅ Smart upsell suggestions at checkout
✅ Offline mode with queue
✅ Sold Out / availability toggle
✅ Analytics dashboard (Chart.js)
✅ QR code generator for tables
✅ Call Waiter button
✅ 4-role auth system (Super/Branch/Cashier/Delivery)
✅ User management
✅ Popup notification system
✅ Social media management
✅ Floating button configurator
✅ Promo codes
✅ Ramadan menu
✅ Dark/Light/Auto theme
✅ Arabic + English bilingual
✅ Mobile-first responsive
