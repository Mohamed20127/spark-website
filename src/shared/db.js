// ─────────────────────────────────────────────────
// SPARK — Database Layer  (all Firestore operations)
// ─────────────────────────────────────────────────
import { db } from '../config/firebase.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, orderBy, where,
  onSnapshot, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── PRODUCTS ──────────────────────────────────────
export const Products = {
  async getAll() {
    const s = await getDocs(collection(db,'products'));
    return s.docs.map(d=>({id:d.id,...d.data()}));
  },
  async save(id, data) {
    const ref = id ? doc(db,'products',String(id))
                   : doc(collection(db,'products'));
    await setDoc(ref, {...data, updatedAt:Date.now()}, {merge:true});
    return ref.id;
  },
  async delete(id) { await deleteDoc(doc(db,'products',String(id))); },
  onSnapshot(cb) {
    return onSnapshot(collection(db,'products'), s=>{
      cb(s.docs.map(d=>({id:d.id,...d.data()})));
    });
  }
};

// ── CATEGORIES ────────────────────────────────────
export const Categories = {
  async getAll() {
    const s = await getDocs(collection(db,'categories'));
    return s.docs.map(d=>({id:d.id,...d.data()}));
  },
  async save(id,data){ await setDoc(doc(db,'categories',id),{...data,updatedAt:Date.now()},{merge:true}); },
  async delete(id)   { await deleteDoc(doc(db,'categories',id)); }
};

// ── ORDERS ────────────────────────────────────────
export const Orders = {
  async add(data) {
    // Auto increment order number
    const counterRef = doc(db,'config','orderCounter');
    const counter    = await getDoc(counterRef);
    const num        = (counter.exists() ? counter.data().next : 1);
    await setDoc(counterRef,{next: num+1},{merge:true});
    const ref = await addDoc(collection(db,'orders'),{
      ...data,
      orderNumber: num,
      timestamp:   serverTimestamp(),
      status:      'new'
    });
    return {id: ref.id, orderNumber: num};
  },
  async updateStatus(id,status){
    await updateDoc(doc(db,'orders',id),{status, updatedAt:serverTimestamp()});
  },
  onSnapshot(cb) {
    const q = query(collection(db,'orders'),orderBy('timestamp','desc'));
    return onSnapshot(q, s=>{
      cb(s.docs.map(d=>({_docId:d.id,...d.data()})));
    });
  },
  onSnapshotByTable(table,cb){
    const q = query(collection(db,'orders'),
      where('tableId','==',table), orderBy('timestamp','desc'));
    return onSnapshot(q, s=>cb(s.docs.map(d=>({_docId:d.id,...d.data()}))));
  }
};

// ── TABLES ────────────────────────────────────────
export const Tables = {
  async getAll(){
    const s = await getDocs(collection(db,'tables'));
    return s.docs.map(d=>({id:d.id,...d.data()}));
  },
  async save(id,data){ await setDoc(doc(db,'tables',id),{...data},{merge:true}); },
  async delete(id)   { await deleteDoc(doc(db,'tables',id)); },
  async notifyWaiter(tableId,tableName){
    await addDoc(collection(db,'waiter_calls'),{
      tableId, tableName, timestamp:serverTimestamp(), handled:false
    });
  },
  onWaiterCalls(cb){
    const q = query(collection(db,'waiter_calls'),
      where('handled','==',false), orderBy('timestamp','desc'));
    return onSnapshot(q,s=>cb(s.docs.map(d=>({_docId:d.id,...d.data()}))));
  }
};

// ── CONFIG ────────────────────────────────────────
export const Config = {
  async get(key)      { const s=await getDoc(doc(db,'config',key)); return s.exists()?s.data():null; },
  async set(key,data) { await setDoc(doc(db,'config',key),{...data,updatedAt:Date.now()},{merge:true}); }
};

// ── USERS ─────────────────────────────────────────
export const Users = {
  async get(uid)  { const s=await getDoc(doc(db,'users',uid)); return s.exists()?{uid,...s.data()}:null; },
  async getAll()  { const s=await getDocs(collection(db,'users')); return s.docs.map(d=>({uid:d.id,...d.data()})); },
  async save(uid,data){ await setDoc(doc(db,'users',uid),data,{merge:true}); }
};

// ── FCM TOKENS ────────────────────────────────────
export const FCMTokens = {
  async save(uid, token, role, name) {
    await setDoc(doc(db, 'fcm_tokens', uid), {
      token, role, name, updatedAt: Date.now()
    }, { merge: true });
  }
};

// ── OFFLINE QUEUE ─────────────────────────────────
export const OfflineQueue = {
  KEY: 'spark_offline_queue',
  push(order) {
    const q = this.getAll();
    q.push({...order, _queuedAt: Date.now()});
    localStorage.setItem(this.KEY, JSON.stringify(q));
  },
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)||'[]'); } catch{ return []; }
  },
  clear() { localStorage.removeItem(this.KEY); },
  async flush() {
    const pending = this.getAll();
    if (!pending.length) return 0;
    let sent = 0;
    for (const order of pending) {
      try { await Orders.add(order); sent++; } catch{}
    }
    if (sent === pending.length) this.clear();
    return sent;
  }
};
