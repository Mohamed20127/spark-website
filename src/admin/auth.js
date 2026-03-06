import { auth }  from '../config/firebase.js';
import { Users } from '../shared/db.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export const ROLES = {
  super:    { label:'Super Admin', icon:'👑' },
  branch:   { label:'مدير الفرع',  icon:'🏪' },
  cashier:  { label:'كاشير',       icon:'💼' },
  delivery: { label:'توصيل',       icon:'🚗' },
};

export const PERMS = {
  super:    { dashboard:true,  orders:true, products:true, categories:true, settings:true, promo:true, analytics:true, ramadan:true, users:true,  tables:true,  popups:true,  social:true  },
  branch:   { dashboard:true,  orders:true, products:true, categories:true, settings:true, promo:true, analytics:true, ramadan:true, users:false, tables:true,  popups:true,  social:true  },
  cashier:  { dashboard:false, orders:true, products:false,categories:false,settings:false,promo:false,analytics:false,ramadan:false,users:false, tables:false, popups:false, social:false },
  delivery: { dashboard:false, orders:true, products:false,categories:false,settings:false,promo:false,analytics:false,ramadan:false,users:false, tables:false, popups:false, social:false },
};

export let currentUser = null;

export async function login(email, password) {
  const cred    = await signInWithEmailAndPassword(auth, email, password);
  const profile = await Users.get(cred.user.uid);
  if (!profile)               { await signOut(auth); throw new Error('PROFILE_NOT_FOUND'); }
  if (profile.active === false){ await signOut(auth); throw new Error('ACCOUNT_DISABLED'); }
  currentUser = profile;
  return profile;
}

export async function logout() { await signOut(auth); currentUser = null; }

export function watchAuth(onLogin, onLogout) {
  return onAuthStateChanged(auth, async user => {
    if (user) {
      try {
        const p = await Users.get(user.uid);
        if (p && p.active !== false) { currentUser = p; onLogin(p); }
        else { await signOut(auth); onLogout(); }
      } catch { onLogout(); }
    } else { onLogout(); }
  });
}

export const can = action => !!(currentUser && PERMS[currentUser.role]?.[action]);

const ERR = {
  'auth/wrong-password':       'كلمة المرور غير صحيحة',
  'auth/invalid-credential':   'الإيميل أو كلمة المرور غلط',
  'auth/user-not-found':       'الإيميل غير موجود',
  'auth/invalid-email':        'إيميل غير صالح',
  'auth/too-many-requests':    'محاولات كثيرة — انتظر قليلاً',
  'PROFILE_NOT_FOUND':         'الحساب غير مسجل في النظام',
  'ACCOUNT_DISABLED':          'هذا الحساب موقوف',
};
export const authErrorMsg = code => ERR[code] || 'خطأ في تسجيل الدخول';
