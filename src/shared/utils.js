// ─────────────────────────────────────────────────
// SPARK — Shared Utilities
// ─────────────────────────────────────────────────

// ── Toast ──────────────────────────────────────────
let _toastTimer = null;
export function toast(msg, ms=2800) {
  let el = document.getElementById('_toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), {id:'_toast'});
    Object.assign(el.style, {
      position:'fixed', bottom:'88px', left:'50%',
      transform:'translateX(-50%) translateY(16px)',
      background:'rgba(30,30,30,.97)', color:'#fff',
      padding:'10px 22px', borderRadius:'50px', fontSize:'.82rem',
      fontFamily:'Cairo,Outfit,sans-serif', zIndex:'9000',
      opacity:'0', transition:'all .22s', pointerEvents:'none',
      whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,.4)'
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{
    el.style.opacity='0';
    el.style.transform='translateX(-50%) translateY(16px)';
  }, ms);
}

// ── Sound Effects ─────────────────────────────────
const _sounds = {};
export function playSound(type) {
  const urls = {
    add:      'https://www.soundjay.com/buttons/sounds/button-50.mp3',
    order:    'https://www.soundjay.com/buttons/sounds/button-09a.mp3',
    confirm:  'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  };
  if (!urls[type]) return;
  try {
    if (!_sounds[type]) _sounds[type] = new Audio(urls[type]);
    _sounds[type].currentTime = 0;
    _sounds[type].play().catch(()=>{});
  } catch{}
}

// ── Cart fly-to animation ─────────────────────────
export function flyToCart(sourceEl) {
  if (!sourceEl) return;
  const cart  = document.getElementById('cartBtn') || document.querySelector('.cart-fab');
  if (!cart) return;
  const from  = sourceEl.getBoundingClientRect();
  const to    = cart.getBoundingClientRect();
  const dot   = Object.assign(document.createElement('div'), {
    style: `position:fixed;width:14px;height:14px;border-radius:50%;
            background:var(--or,#FF6B00);z-index:9999;pointer-events:none;
            left:${from.left+from.width/2}px;top:${from.top+from.height/2}px;
            transition:all .55s cubic-bezier(.4,0,.2,1);opacity:1;`
  });
  document.body.appendChild(dot);
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      dot.style.left    = to.left + to.width/2 + 'px';
      dot.style.top     = to.top  + to.height/2 + 'px';
      dot.style.opacity = '0';
      dot.style.transform = 'scale(.3)';
    });
  });
  setTimeout(()=>dot.remove(), 600);
}

// ── Format ────────────────────────────────────────
export const fmt     = n  => `${Number(n).toLocaleString('ar-EG')} EGP`;
export const fmtTime = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('ar-EG',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
};

// ── DOM helpers ───────────────────────────────────
export const $  = (s,c=document) => c.querySelector(s);
export const $$ = (s,c=document) => [...c.querySelectorAll(s)];

// ── Debounce ──────────────────────────────────────
export const debounce = (fn,ms=300) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

// ── Short ID ──────────────────────────────────────
export const shortId = () => Math.random().toString(36).slice(2,7).toUpperCase();

// ── Online / offline detection ────────────────────
export function watchOnline(onOnline, onOffline) {
  window.addEventListener('online',  onOnline);
  window.addEventListener('offline', onOffline);
  if (!navigator.onLine) onOffline();
}
