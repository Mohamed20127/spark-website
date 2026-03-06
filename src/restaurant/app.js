// SPARK Restaurant — Main App v3
import { toast, playSound, flyToCart, fmt, watchOnline } from '../shared/utils.js';
import { Orders, Config, Products, Categories, Tables, OfflineQueue } from '../shared/db.js';

// ── State ──
const S = {
  lang:    localStorage.getItem('sp_lang')  || 'ar',
  theme:   localStorage.getItem('sp_theme') || 'auto',
  cat:     'all', pg:'home', cart:[], meal:null, dQ:1, sOpts:{}, selSz:null,
  selA:    'home', selP:'cash', promo:null, tableId:null,
  online:  navigator.onLine,
  MEALS:[], CATS:[], PROMOS:[], SIZES:{}, favs: new Set(JSON.parse(localStorage.getItem('sp_favs')||'[]')),
};
window._S = S;

// ── Translations ──
const TR = {
  ar:{ home:'الرئيسية',menu:'القائمة',about:'عننا',track:'تتبع طلبك',
    addCart:'أضف للسلة',soldOut:'نفذ',cart:'سلتك',empty:'السلة فارغة',
    checkout:'إتمام الطلب',address:'عنوان التوصيل',payment:'طريقة الدفع',
    cash:'كاش عند التوصيل',online:'دفع أونلاين',
    home_addr:'المنزل',custom_addr:'عنوان آخر',
    promo:'كود الخصم',apply:'تطبيق',subtotal:'المجموع',
    delivery:'التوصيل',discount:'الخصم',total:'الإجمالي',
    confirm:'تأكيد الطلب',order_num:'رقم طلبك',
    upsell:'يعجبك كمان',extras:'إضافات',size:'الحجم',qty:'الكمية',
    call_waiter:'🔔 نادي النادل',table:'طاولة',
    offline_msg:'أنت أوفلاين — الطلب هيتحفظ ويتبعت لما يرجع النت',
    online_msg:'رجع النت ✅',pf:'كود غير صحيح',po:'تم تطبيق الخصم',
    fav_add:'❤️ أضيف للمفضلة',fav_rem:'💔 أُزيل من المفضلة',
    waiter_called:'تم إرسال طلب للنادل ✅',
    status_new:'تم الاستلام',status_prep:'قيد التحضير',
    status_cooking:'بيتطبخ',status_ready:'جاهز 🎉',
  },
  en:{ home:'Home',menu:'Menu',about:'About',track:'Track Order',
    addCart:'Add to Cart',soldOut:'Sold Out',cart:'Your Cart',empty:'Cart is empty',
    checkout:'Checkout',address:'Delivery Address',payment:'Payment Method',
    cash:'Cash on Delivery',online:'Pay Online',
    home_addr:'Home',custom_addr:'Other Address',
    promo:'Promo Code',apply:'Apply',subtotal:'Subtotal',
    delivery:'Delivery',discount:'Discount',total:'Total',
    confirm:'Confirm Order',order_num:'Order #',
    upsell:'You might also like',extras:'Extras',size:'Size',qty:'Qty',
    call_waiter:'🔔 Call Waiter',table:'Table',
    offline_msg:'Offline — order will be queued',
    online_msg:'Back online ✅',pf:'Invalid code',po:'Promo applied!',
    fav_add:'❤️ Added to favourites',fav_rem:'💔 Removed',
    waiter_called:'Waiter notified ✅',
    status_new:'Received',status_prep:'Preparing',
    status_cooking:'Cooking',status_ready:'Ready! 🎉',
  }
};
const T = k => TR[S.lang]?.[k] || TR.en[k] || k;

// ── Seed MEALS ──
S.CATS = [
  {id:'all',ar:'الكل',en:'All',em:'🍽️'},
  {id:'pizza',ar:'بيتزا',en:'Pizza',em:'🍕'},
  {id:'burger',ar:'برجر',en:'Burgers',em:'🍔'},
  {id:'pasta',ar:'باستا',en:'Pasta',em:'🍝'},
  {id:'grills',ar:'مشويات',en:'Grills',em:'🥩'},
  {id:'sides',ar:'جانبيات',en:'Sides',em:'🍟'},
  {id:'drinks',ar:'مشروبات',en:'Drinks',em:'🥤'},
  {id:'dessert',ar:'حلويات',en:'Desserts',em:'🍰'},
];
S.MEALS = [
  {id:1,cat:'pizza',em:'🍕',pr:89,cal:680,r:4.8,tm:'20-30',badge:'Classic',ar:'مارغريتا كلاسيك',en:'Classic Margherita',de:'San Marzano tomato, mozzarella & basil',da:'طماطم سان مارزانو، موزاريلا وريحان',opts:[{ar:'جبنة إضافية',en:'Extra Cheese',pr:15},{ar:'أرضيشوكي',en:'Artichoke',pr:20}]},
  {id:2,cat:'pizza',em:'🍕',pr:109,cal:820,r:4.9,tm:'20-30',badge:'Best Seller',ar:'بيبروني سبايسي',en:'Spicy Pepperoni',de:'Spicy pepperoni, red chili, mozzarella',da:'بيبروني حار، فلفل أحمر، موزاريلا',opts:[]},
  {id:3,cat:'pizza',em:'🍕',pr:99,cal:750,r:4.7,tm:'20-30',badge:'',ar:'أربع جبنات',en:'Four Cheese',de:'Mozzarella, cheddar, gorgonzola, parmesan',da:'موزاريلا، شيدر، جورجونزولا، بارميزان',opts:[]},
  {id:4,cat:'burger',em:'🍔',pr:79,cal:620,r:4.6,tm:'15-20',badge:'Juicy',ar:'برجر كلاسيك',en:'Classic Burger',de:'180g beef, lettuce, tomato, cheddar',da:'لحم بقري ١٨٠ج، خس، طماطم، شيدر',opts:[{ar:'بيكون',en:'Bacon',pr:20},{ar:'بيض',en:'Egg',pr:10}]},
  {id:5,cat:'burger',em:'🍔',pr:89,cal:710,r:4.8,tm:'15-20',badge:'🔥 Hot',ar:'برجر سبايسي',en:'Spicy Burger',de:'Spicy beef patty, sriracha, jalapeño',da:'باتي حار، صلصة سريراتشا، جالابينيو',opts:[]},
  {id:6,cat:'burger',em:'🍔',pr:95,cal:760,r:4.7,tm:'15-20',badge:'',ar:'دبل تشيز برجر',en:'Double Cheeseburger',de:'Double patties, double cheddar, secret sauce',da:'باتيين لحم، شيدر مزدوج، صلصة سرية',opts:[]},
  {id:7,cat:'pasta',em:'🍝',pr:75,cal:580,r:4.5,tm:'15-20',badge:'',ar:'كاربونارا',en:'Carbonara',de:'Spaghetti, pancetta, egg yolk, parmesan',da:'سباغيتي، لحم مقدد، صفار البيض، بارميزان',opts:[]},
  {id:8,cat:'pasta',em:'🍝',pr:80,cal:610,r:4.6,tm:'15-20',badge:'New',ar:'أرابياتا',en:'Arrabbiata',de:'Penne, spicy tomato sauce, garlic',da:'بيني، صلصة طماطم حارة، ثوم',opts:[]},
  {id:9,cat:'grills',em:'🥩',pr:145,cal:890,r:4.9,tm:'25-35',badge:'Premium',ar:'تبون ستيك',en:'T-Bone Steak',de:'300g T-bone, cooked to your liking',da:'تبون ٣٠٠ج، مطبوخ حسب طلبك',opts:[{ar:'صلصة الفطر',en:'Mushroom Sauce',pr:15},{ar:'صلصة البيبر',en:'Pepper Sauce',pr:15}]},
  {id:10,cat:'grills',em:'🥩',pr:120,cal:820,r:4.8,tm:'25-35',badge:'',ar:'فيليه مينيون',en:'Filet Mignon',de:'250g tenderloin, the finest cut',da:'فيليه ٢٥٠ج، أحلى قطعة',opts:[]},
  {id:11,cat:'sides',em:'🍟',pr:35,cal:320,r:4.4,tm:'10-15',badge:'',ar:'بطاطس مقلية',en:'French Fries',de:'Crispy fries with ketchup',da:'بطاطس مقرمشة مع كاتشاب',opts:[{ar:'جبنة',en:'Cheese',pr:10}]},
  {id:12,cat:'sides',em:'🍟',pr:45,cal:380,r:4.5,tm:'10-15',badge:'',ar:'حلقات بصل',en:'Onion Rings',de:'Crispy onion rings',da:'حلقات بصل مقرمشة',opts:[]},
  {id:13,cat:'sides',em:'🥗',pr:40,cal:180,r:4.3,tm:'5-10',badge:'Fresh',ar:'سلطة خضراء',en:'Green Salad',de:'Fresh salad, lemon dressing',da:'سلطة طازجة بتتبيلة الليمون',opts:[]},
  {id:14,cat:'drinks',em:'🥤',pr:25,cal:140,r:4.2,tm:'5',badge:'',ar:'كولا',en:'Cola',de:'',da:'',opts:[]},
  {id:15,cat:'drinks',em:'🧃',pr:25,cal:120,r:4.1,tm:'5',badge:'',ar:'عصير طازج',en:'Fresh Juice',de:'Orange, mango or mixed',da:'برتقال أو مانجو أو مشكل',opts:[]},
  {id:16,cat:'drinks',em:'☕',pr:30,cal:60,r:4.6,tm:'5',badge:'',ar:'قهوة اسبريسو',en:'Espresso',de:'Authentic Italian espresso',da:'اسبريسو إيطالي أصيل',opts:[]},
  {id:17,cat:'dessert',em:'🍰',pr:45,cal:520,r:4.7,tm:'5-10',badge:'Sweet',ar:'كيك الشوكولاتة',en:'Chocolate Cake',de:'Dark chocolate cake with sauce',da:'كيك شوكولاتة داكنة مع صلصة',opts:[]},
  {id:18,cat:'dessert',em:'🍮',pr:35,cal:280,r:4.5,tm:'5',badge:'',ar:'كريم بروليه',en:'Crème Brûlée',de:'Vanilla custard, caramelized sugar',da:'كاسترد فانيليا بسكر محروق',opts:[]},
];
S.PROMOS = [{code:'SPARK20',disc:20},{code:'WELCOME10',disc:10}];

// ── Helpers ──
const $  = id => document.getElementById(id);
const nm = m  => S.lang==='ar' ? m.ar : m.en;
const ds = m  => S.lang==='ar' ? (m.da||m.de) : (m.de||m.da);
const cTotal = () => {
  const raw = S.cart.reduce((s,c)=>s+c.pr*c.qty,0);
  return S.promo ? Math.round(raw*(1-S.promo.disc/100)) : raw;
};
const updBadge = () => {
  const n = S.cart.reduce((s,c)=>s+c.qty,0);
  document.querySelectorAll('.cart-badge').forEach(el=>{
    el.textContent=n; el.classList.toggle('show',n>0);
  });
};

// ── Navigation ──
function gp(id) {
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  const pg = $('pg'+id.charAt(0).toUpperCase()+id.slice(1)) || $('pg'+id);
  if(pg) { pg.classList.add('active'); S.pg=id; }
  document.querySelectorAll('.nlinks a').forEach(a=>a.classList.toggle('act',a.dataset.pg===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
window.gp=gp;

// ── Theme & Lang ──
function applyTheme(t) {
  S.theme=t;
  if(t==='auto') document.documentElement.removeAttribute('data-t');
  else document.documentElement.setAttribute('data-t',t);
  document.querySelectorAll('.tpill button').forEach(b=>b.classList.toggle('act',b.dataset.t===t));
  localStorage.setItem('sp_theme',t);
}
function tTheme(t) { applyTheme(t); }
window.tTheme=tTheme;

function applyLang(l) {
  S.lang=l;
  document.documentElement.lang=l;
  document.documentElement.dir=l==='ar'?'rtl':'ltr';
  localStorage.setItem('sp_lang',l);
  rAll();
}
function tLang() { applyLang(S.lang==='ar'?'en':'ar'); }
window.tLang=tLang;

// ── Render Home ──
function rHome() {
  const el=$('pgHome'); if(!el) return;
  const b=$('blang'); if(b) b.textContent=S.lang==='ar'?'EN':'عر';
  const grid=$('featGrid'); if(!grid) return;
  const featured=S.MEALS.filter(m=>m.badge&&!m.soldOut).slice(0,4);
  grid.innerHTML=featured.map(m=>`
    <div class="mc" onclick="openD(${m.id})">
      <div class="mimg">${m.img?`<img src="${m.img}" alt="${nm(m)}" loading="lazy">`:`<div class="emf">${m.em}</div>`}
        ${m.badge?`<div class="mbdg">${m.badge}</div>`:''}
      </div>
      <div class="mbdy">
        <div class="mnm">${nm(m)}</div>
        <div class="mft"><span class="mpr">${m.pr} EGP</span>
          <button class="badd" onclick="event.stopPropagation();qAdd(${m.id},this)">${T('addCart')}</button>
        </div>
      </div>
    </div>`).join('');
}

// ── Render Menu ──
function rCats() {
  const wrap=$('catsWrap'); if(!wrap) return;
  wrap.innerHTML=[{id:'all',ar:'الكل',en:'All',em:'🍽️'},...S.CATS.filter(c=>c.id!=='all')].map(c=>`
    <div class="cat-pill ${S.cat===c.id?'act':''}" onclick="setCat('${c.id}')">${c.em} ${S.lang==='ar'?c.ar:c.en}</div>`).join('');
}
function setCat(id){S.cat=id;rCats();rMeals();}
window.setCat=setCat;

function rMeals(sq='') {
  const grid=$('mealGrid'); if(!grid) return;
  let list=S.cat==='all'?S.MEALS:S.MEALS.filter(m=>m.cat===S.cat);
  if(sq){const s=sq.toLowerCase();list=list.filter(m=>nm(m).toLowerCase().includes(s)||ds(m).toLowerCase().includes(s));}
  if(!list.length){grid.innerHTML=`<div style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px">لا توجد نتائج</div>`;return;}
  grid.innerHTML=list.map(m=>`
    <div class="mc ${m.soldOut?'sold-out':''}" onclick="${m.soldOut?'':`openD(${m.id})`}">
      <div class="mimg">${m.img?`<img src="${m.img}" alt="${nm(m)}" loading="lazy">`:`<div class="emf">${m.em}</div>`}
        ${m.badge?`<div class="mbdg">${m.badge}</div>`:''}
        ${m.soldOut?`<div class="sold-ov">نفذ</div>`:''}
        <div class="mfv" onclick="event.stopPropagation();togFav(${m.id})">${S.favs.has(m.id)?'❤️':'🤍'}</div>
      </div>
      <div class="mbdy">
        <div class="mnm">${nm(m)}</div>
        <div class="mds">${ds(m)}</div>
        <div class="mmeta"><span class="mp">⭐${m.r}</span><span class="mp">⏱${m.tm}د</span><span class="mp">🔥${m.cal}</span></div>
        <div class="mft"><span class="mpr">${m.pr} EGP</span>
          <button class="badd" ${m.soldOut?'disabled':''} onclick="event.stopPropagation();qAdd(${m.id},this)">
            ${m.soldOut?T('soldOut'):T('addCart')}</button>
        </div>
      </div>
    </div>`).join('');
}
function rAll(){rHome();rCats();rMeals();}
function doSearch(v){rMeals(v);}
window.doSearch=doSearch;

// Quick add
function qAdd(id,btn) {
  const m=S.MEALS.find(x=>x.id===id); if(!m||m.soldOut) return;
  if(S.SIZES[id]?.length){openD(id);return;}
  addToCart({...m,szLabel:'',extras:[],cartKey:`${id}_def`,pr:m.pr});
  playSound('add'); flyToCart(btn);
  toast('✅ '+nm(m)+' أُضيف للسلة');
}
window.qAdd=qAdd;

function togFav(id) {
  S.favs.has(id)?S.favs.delete(id):S.favs.add(id);
  toast(S.favs.has(id)?T('fav_add'):T('fav_rem'));
  localStorage.setItem('sp_favs',JSON.stringify([...S.favs]));
  rMeals();
}
window.togFav=togFav;

// ── Drawer ──
function openD(id) {
  const m=S.MEALS.find(x=>x.id===id); if(!m) return;
  S.meal=m; S.dQ=1; S.sOpts={}; S.selSz=S.SIZES[id]?.[0]||null;
  rDrawer(); $('dOv').classList.add('open'); document.body.style.overflow='hidden';
}
function closeD(){$('dOv').classList.remove('open');document.body.style.overflow='';S.meal=null;}
window.openD=openD; window.closeD=closeD;

function rDrawer() {
  const m=S.meal; if(!m) return;
  const szs=S.SIZES[m.id]||[];
  const extT=((m.opts||[]).reduce((s,o)=>s+(S.sOpts[o.en]?o.pr:0),0));
  const szP=S.selSz?S.selSz.p:m.pr;
  const total=(szP+extT)*S.dQ;
  $('dImg').innerHTML=m.img?`<img src="${m.img}" alt="${nm(m)}">`:`<div class="emb">${m.em}</div>`;
  $('dNm').textContent=nm(m);
  $('dDesc').textContent=ds(m)||'';
  $('dQn').textContent=S.dQ;
  $('dFv').textContent=S.favs.has(m.id)?'❤️':'🤍';
  $('dPills').innerHTML=`<span class="dpill">⭐${m.r}</span><span class="dpill">⏱${m.tm}د</span><span class="dpill">🔥${m.cal}كال</span>`;
  $('dSizes').innerHTML=szs.length?`<div class="ottl">${T('size')}</div><div class="size-row">${szs.map(sz=>`
    <div class="sz-btn ${S.selSz?.k===sz.k?'sz-act':''}" onclick="selSz('${sz.k}')">
      <div class="sz-lbl">${sz.k==='sm'?'صغير':sz.k==='md'?'وسط':'كبير'}</div>
      <div class="sz-pr">${sz.p} EGP</div>
    </div>`).join('')}</div>`:'';
  $('dExtras').innerHTML=(m.opts||[]).length?`<div class="ottl">${T('extras')}</div>`+(m.opts.map(o=>`
    <div class="orow"><span class="onm">${S.lang==='ar'?o.ar:o.en}</span>
    <span class="opr">+${o.pr} EGP</span>
    <div class="ock ${S.sOpts[o.en]?'ck':''}" onclick="togOpt('${o.en}')">${S.sOpts[o.en]?'✓':''}</div></div>`).join('')):'';
  $('dTotPrice').textContent=total+' EGP';
}
function selSz(k){S.selSz=(S.SIZES[S.meal?.id]||[]).find(s=>s.k===k)||null;rDrawer();}
function togOpt(k){S.sOpts[k]=!S.sOpts[k];rDrawer();}
function chDQ(d){S.dQ=Math.max(1,S.dQ+d);rDrawer();}
function togDFav(){if(!S.meal)return;togFav(S.meal.id);$('dFv').textContent=S.favs.has(S.meal.id)?'❤️':'🤍';}
window.selSz=selSz;window.togOpt=togOpt;window.chDQ=chDQ;window.togDFav=togDFav;

function addFromDrawer() {
  const m=S.meal; if(!m) return;
  const extras=(m.opts||[]).filter(o=>S.sOpts[o.en]);
  const extT=extras.reduce((s,o)=>s+o.pr,0);
  const szP=S.selSz?S.selSz.p:m.pr;
  const szL=S.selSz?(S.selSz.k==='sm'?'صغير':S.selSz.k==='md'?'وسط':'كبير'):'';
  const key=`${m.id}_${S.selSz?.k||'def'}_${extras.map(e=>e.en).join('+')}`;
  addToCart({...m,szLabel:szL,extras,cartKey:key,pr:szP+extT},S.dQ);
  playSound('add'); closeD();
  toast('✅ '+nm(m)+' أُضيف للسلة'); updBadge();
}
window.addFromDrawer=addFromDrawer;

// ── Cart ──
function addToCart(item,qty=1) {
  const ex=S.cart.find(c=>c.cartKey===item.cartKey);
  ex?ex.qty+=qty:S.cart.push({...item,qty});
  updBadge();
}
function openCart(){rCart();$('cartOv').classList.add('open');document.body.style.overflow='hidden';}
function closeCart(){$('cartOv').classList.remove('open');document.body.style.overflow='';}
window.openCart=openCart;window.closeCart=closeCart;

function rCart() {
  const body=$('cartBody'); if(!body) return;
  if(!S.cart.length){
    body.innerHTML=`<div class="cart-empty"><div style="font-size:2.5rem">🛒</div><div>${T('empty')}</div></div>`;
    $('cartCheckBtn').style.display='none'; return;
  }
  $('cartCheckBtn').style.display='';
  body.innerHTML=S.cart.map((c,i)=>`
    <div class="ci">
      <div class="ci-img">${c.img?`<img src="${c.img}" alt="">`:(c.em||'🍽️')}</div>
      <div class="ci-info">
        <div class="ci-nm">${nm(c)}</div>
        ${c.szLabel||c.extras?.length?`<div class="ci-opts">${[c.szLabel,...(c.extras||[]).map(e=>S.lang==='ar'?e.ar:e.en)].filter(Boolean).join(' • ')}</div>`:''}
        <div class="ci-qc">
          <button class="ciqb" onclick="chCQ(${i},-1)">−</button>
          <span style="font-size:.82rem;font-weight:700">${c.qty}</span>
          <button class="ciqb" onclick="chCQ(${i},1)">+</button>
          <span class="ci-pr">${c.pr*c.qty} EGP</span>
          <span class="ci-del" onclick="remCI(${i})">🗑</span>
        </div>
      </div>
    </div>`).join('');
  $('cartTot').textContent=cTotal()+' EGP';
}
function chCQ(i,d){S.cart[i].qty=Math.max(1,S.cart[i].qty+d);rCart();updBadge();}
function remCI(i){S.cart.splice(i,1);rCart();updBadge();}
window.chCQ=chCQ;window.remCI=remCI;

// ── Checkout ──
let _custAddr='';
function goCheckout(){closeCart();rCheckout();$('coOv').classList.add('open');document.body.style.overflow='hidden';}
function closeCO(){$('coOv').classList.remove('open');document.body.style.overflow='';}
window.goCheckout=goCheckout;window.closeCO=closeCO;

function rCheckout() {
  const wrap=$('coWrap'); if(!wrap) return;
  const sub=S.cart.reduce((s,c)=>s+c.pr*c.qty,0);
  const disc=S.promo?Math.round(sub*S.promo.disc/100):0;
  const del=20; const total=sub-disc+del;
  const cartCats=[...new Set(S.cart.map(c=>c.cat))];
  const inCart=new Set(S.cart.map(c=>c.id));
  const sugg=S.MEALS.filter(m=>cartCats.includes(m.cat)&&!inCart.has(m.id)&&!m.soldOut).slice(0,4);
  wrap.innerHTML=`
    ${S.tableId?`<div class="qr-banner" style="margin-bottom:14px;"><div class="qr-t-num">${T('table')} ${S.tableId}</div></div>`:''}
    ${sugg.length?`<div class="coslb">⚡ ${T('upsell')}</div><div class="upsell-row">${sugg.map(m=>`
      <div class="ups-c" onclick="qAdd(${m.id},this)"><div class="ups-em">${m.em}</div>
      <div class="ups-nm">${nm(m)}</div><div class="ups-pr">${m.pr} EGP</div></div>`).join('')}</div>`:''}
    ${!S.tableId?`<div class="coslb">📍 ${T('address')}</div>
    <div class="adc ${S.selA==='home'?'sel':''}" onclick="selAddr('home')"><div class="adic">🏠</div><div><div class="adt">${T('home_addr')}</div></div></div>
    <div class="adc ${S.selA==='custom'?'sel':''}" onclick="selAddr('custom')"><div class="adic">📍</div><div>
      <div class="adt">${T('custom_addr')}</div>
      <input id="custAddrInp" type="text" placeholder="اكتب عنوانك..."
        style="margin-top:6px;width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--bg3);color:var(--txt);font-size:.78rem;display:${S.selA==='custom'?'block':'none'}"
        value="${_custAddr}" oninput="_S._custAddr=this.value">
    </div></div>`:''}
    <div class="coslb">💳 ${T('payment')}</div>
    <div class="popt ${S.selP==='cash'?'sel':''}" onclick="selPay('cash')"><span class="popl">💵 ${T('cash')}</span><div class="radio"><div class="rdot"></div></div></div>
    <div class="popt ${S.selP==='online'?'sel':''}" onclick="selPay('online')"><span class="popl">💳 ${T('online')}</span><div class="radio"><div class="rdot"></div></div></div>
    <div class="coslb">🏷️ ${T('promo')}</div>
    <div class="promo-row"><input class="promo-inp" id="promoInp" type="text" placeholder="SPARK20" value="${S.promo?.code||''}">
    <button class="promo-btn" onclick="apPr()">${T('apply')}</button></div>
    <div style="height:10px"></div>
    <div class="csum">
      <div class="srow"><span>${T('subtotal')}</span><span>${sub} EGP</span></div>
      <div class="srow"><span>${T('delivery')}</span><span>${del} EGP</span></div>
      ${disc?`<div class="srow" style="color:var(--green)"><span>🏷️ خصم ${S.promo.disc}%</span><span>-${disc} EGP</span></div>`:''}
      <div class="stot"><span>${T('total')}</span><span class="totp">${total} EGP</span></div>
    </div>
    ${S.tableId?`<button class="call-waiter" onclick="callWaiter()">🔔 ${T('call_waiter')}</button>`:''}
    <button class="bco" onclick="confOrder()">${T('confirm')} →</button>`;
  S._custAddr='';
}
function selAddr(a){S.selA=a;rCheckout();}
function selPay(p){S.selP=p;rCheckout();}
window.selAddr=selAddr;window.selPay=selPay;

function apPr(){
  const code=($('promoInp')?.value||'').trim().toUpperCase();
  const f=S.PROMOS.find(p=>p.code===code);
  f?(S.promo=f,toast('✅ '+T('po')+' '+f.disc+'%')):(S.promo=null,toast('❌ '+T('pf')));
  rCheckout();
}
window.apPr=apPr;

async function confOrder() {
  if(!S.cart.length) return;
  const custA=S._custAddr||document.getElementById('custAddrInp')?.value||'';
  if(!S.tableId&&S.selA==='custom'&&!custA.trim()){toast('⚠️ أدخل عنوانك');return;}
  const sub=S.cart.reduce((s,c)=>s+c.pr*c.qty,0);
  const disc=S.promo?Math.round(sub*S.promo.disc/100):0;
  const orderData={
    items:S.cart.map(c=>({id:c.id,name:nm(c),qty:c.qty,price:c.pr,sz:c.szLabel||'',extras:(c.extras||[]).map(e=>e.en)})),
    total:sub-disc+20, subtotal:sub, discount:disc, delivery:20,
    address:S.tableId?`طاولة ${S.tableId}`:(S.selA==='custom'?custA:'المنزل'),
    tableId:S.tableId||null, payment:S.selP, promo:S.promo?.code||null,
    time:new Date().toLocaleTimeString('ar-EG'), lang:S.lang,
  };
  let orderNum;
  if(!S.online){OfflineQueue.push(orderData);toast(T('offline_msg'));orderNum='OFFLINE';}
  else{try{const r=await Orders.add(orderData);orderNum=r.orderNumber;playSound('confirm');}
  catch{OfflineQueue.push(orderData);toast('⚠️ تم الحفظ محلياً');orderNum='QUEUED';}}
  closeCO();
  $('confNum').textContent='#'+orderNum;
  $('confScreen').classList.add('show');
  playSound('confirm');
  S.cart=[];S.promo=null;S._custAddr='';updBadge();
  setTimeout(()=>{$('confScreen').classList.remove('show');gp('home');},5000);
}
window.confOrder=confOrder;
function closeConf(){$('confScreen').classList.remove('show');gp('home');}
window.closeConf=closeConf;

// ── Call Waiter ──
async function callWaiter(){
  if(!S.tableId)return;
  try{await Tables.notifyWaiter(S.tableId,'طاولة '+S.tableId);toast(T('waiter_called'));playSound('confirm');}
  catch{toast('❌ خطأ');}
}
window.callWaiter=callWaiter;

// ── Order Tracker ──
const STATUS_STEPS=[
  {k:'new',ar:'تم الاستلام',en:'Received',ic:'✅'},
  {k:'preparing',ar:'قيد التحضير',en:'Preparing',ic:'👨‍🍳'},
  {k:'cooking',ar:'بيتطبخ',en:'Cooking',ic:'🍳'},
  {k:'ready',ar:'جاهز!',en:'Ready!',ic:'🎉'},
];
let _trackUnsub=null;
function openTracker(){
  gp('tracker');
  const num=prompt('أدخل رقم طلبك:');
  if(num) trackOrder(Number(num));
}
window.openTracker=openTracker;
async function trackOrder(num){
  if(_trackUnsub){_trackUnsub();_trackUnsub=null;}
  $('trackContent').innerHTML=`<div style="color:var(--muted);text-align:center;padding:20px">جاري البحث...</div>`;
  const {db}=await import('../config/firebase.js');
  const {query:qry,collection,where,onSnapshot}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const q2=qry(collection(db,'orders'),where('orderNumber','==',num));
  _trackUnsub=onSnapshot(q2,snap=>{
    if(snap.empty){$('trackContent').innerHTML=`<div style="color:var(--muted);text-align:center;padding:20px">الطلب مش موجود</div>`;return;}
    const o={_docId:snap.docs[0].id,...snap.docs[0].data()};
    const si=STATUS_STEPS.findIndex(s=>s.k===o.status);
    $('trackContent').innerHTML=`<div class="track-card">
      <div style="font-size:.76rem;color:var(--muted)">رقم الطلب</div>
      <div class="track-num">#${o.orderNumber||'—'}</div>
      <div style="font-size:.78rem;color:var(--muted);margin-top:4px">${o.address||''}</div>
      <div class="t-steps" style="margin-top:18px;">
        ${STATUS_STEPS.map((s,i)=>`<div class="tstep ${i<si?'done':i===si?'active':''}">
          <div class="ts-dot">${i<=si?s.ic:i+1}</div>
          <div><div class="ts-lbl">${S.lang==='ar'?s.ar:s.en}</div>
          ${i===si?`<div class="ts-sub">الحالة الحالية</div>`:''}</div>
        </div>`).join('')}
      </div>
    </div>`;
  });
}

// ── Popup ──
function showPopup(d){
  $('popIcon').textContent=d.icon||'🔥';
  $('popTitle').textContent=d.title||'';
  $('popBody').innerHTML=d.body||'';
  $('popupModal').classList.add('show');
  if(d.autoClose) setTimeout(closePopup,d.autoClose*1000);
}
function closePopup(){$('popupModal').classList.remove('show');}
window.closePopup=closePopup;

// ── Offline ──
watchOnline(async()=>{
  S.online=true;
  $('offlineBanner').classList.remove('show');
  toast(T('online_msg'));
  const sent=await OfflineQueue.flush();
  if(sent) toast(`📤 تم إرسال ${sent} طلب`);
},()=>{S.online=false;$('offlineBanner').classList.add('show');});

// ── Firebase Load ──
async function loadFromFirebase(){
  try{
    const [products,cats]=await Promise.all([Products.getAll(),Categories.getAll()]);
    if(products.length){
      S.MEALS.splice(0,S.MEALS.length,...products.map(p=>({
        id:Number(p.id)||p.id,cat:p.cat,em:p.em||'🍕',pr:p.pr||0,
        cal:p.cal||500,r:p.r||4.5,tm:p.tm||'15-25',badge:p.badge||'',
        ar:p.ar||'',en:p.en||'',de:p.de||'',da:p.da||'',
        opts:p.opts||[],img:p.img||'',soldOut:!!p.soldOut,sizes:p.sizes||[]
      })));
      S.MEALS.forEach(m=>{if(m.sizes?.length)S.SIZES[m.id]=m.sizes;});
    }
    if(cats.length) S.CATS.splice(0,S.CATS.length,...cats);
    const [promoD,settD,socD,popD,fbD]=await Promise.all([
      Config.get('promos'),Config.get('settings'),Config.get('social'),Config.get('popup'),Config.get('floatBtn')
    ]);
    if(promoD?.promos) S.PROMOS=promoD.promos;
    if(settD?.restName) document.title=settD.restName+' 🔥';
    if(socD){
      const wa=$('waBtn'); if(wa&&socD.whatsapp) wa.href='https://wa.me/'+socD.whatsapp.replace(/\D/g,'');
      const lks=document.querySelectorAll('.ftsoc a');
      if(lks[0]&&socD.instagram)lks[0].href=socD.instagram;
      if(lks[1]&&socD.facebook)lks[1].href=socD.facebook;
      if(lks[2]&&socD.tiktok)lks[2].href=socD.tiktok;
      if(lks[3]&&socD.whatsapp)lks[3].href='https://wa.me/'+socD.whatsapp.replace(/\D/g,'');
    }
    if(fbD?.enabled){
      const fb=$('floatBtn'); if(fb){
        fb.classList.add('show');
        fb.querySelector('button').innerHTML=`${fbD.icon||'⚡'} ${fbD.text||''}`;
        fb.querySelector('button').onclick=()=>{
          if(fbD.action==='menu')gp('menu');
          else if(fbD.action==='whatsapp')window.open('https://wa.me/201020009617');
          else if(fbD.url)window.open(fbD.url);
        };
      }
    }
    if(popD?.enabled) setTimeout(()=>showPopup(popD),(popD.delay||2)*1000);
    rAll();
  }catch(e){console.warn('Firebase:',e);}
}

// ── QR Table Detection ──
function detectTable(){
  const t=new URLSearchParams(window.location.search).get('table');
  if(t){
    S.tableId=t;
    const el=$('pgQr');
    if(el){$('qrTableNum').textContent=t;gp('qr');}
  }
}

// ── Boot ──
applyLang(S.lang);
applyTheme(S.theme);
detectTable();
if(!S.tableId){rHome();gp('home');}
loadFromFirebase();
