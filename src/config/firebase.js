// ─────────────────────────────────────────────────
// SPARK — Firebase Config  (single shared instance)
// ─────────────────────────────────────────────────
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore }           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth }                from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export const FB_CONFIG = {
  apiKey:            "AIzaSyCh32ANAz144h5aSZfjZZq3jyzxOocxi94",
  authDomain:        "sparkeg-d8fdd.firebaseapp.com",
  projectId:         "sparkeg-d8fdd",
  storageBucket:     "sparkeg-d8fdd.firebasestorage.app",
  messagingSenderId: "667897054721",
  appId:             "1:667897054721:web:a765f25a7576d0f1dd6200"
};

const app    = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
export const db   = getFirestore(app);
export const auth = getAuth(app);
export { app };
