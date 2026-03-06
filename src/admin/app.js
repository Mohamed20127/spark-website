// ─────────────────────────────────────────────────
// SPARK Admin — Main Application v3
// ─────────────────────────────────────────────────
import { login, logout, watchAuth, can, ROLES, PERMS, authErrorMsg } from './auth.js';
import { Orders, Products, Categories, Users, Tables, Config, FCMTokens } from '../shared/db.js';
import { toast, fmt, fmtTime, playSound } from '../shared/utils.js';

// ── State ──
let currentUser = null;
let curV  = 'dashboard';
let ORDERS_DATA  = [];
let orderFilter  = 'all';
let MEALS        = [];
let CATS         = [];
let TABLES_DATA  = [];
let _ordersUnsub = null;
let _waiterUnsub = null;
let Chart_loaded = false;

// ── Helpers ──
const $ = id => document.getElementById(id);
const ROLES_LIST = ['super','branch','cashier','delivery'];

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function goV(id, btn) {
  if (!can(id)) return;
  curV = id;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('act'));
  const v = $('v-' + id); if (v) v.classList.add('act');
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('act'));
  if (btn) btn.classList.add('act');
  else document.querySelectorAll(`.sb-item[data-v="${id}"]`).forEach(i=>i.classList.add('act'));
  $('topTitle').textContent = {
    dashboard:'لوحة التحكم', orders:'الطلبات', products:'المنتجات',
    categories:'الأقسام', analytics:'التحليلات', settings:'الإعدادات',
    promo:'كوبونات الخصم', ramadan:'قائمة رمضان', users:'إدارة المستخدمين',
    tables:'الطاولات وQR', popups:'الإشعارات المنبثقة', social:'السوشيال ميديا'
  }[id] || id;
  const actionMap = {
    products:'+ منتج جديد', categories:'+ قسم جديد',
    users:'+ مستخدم جديد', tables:'+ طاولة جديدة'
  };
  const actBtn = $('topAction');
  if (actionMap[id]) { actBtn.textContent = actionMap[id]; actBtn.style.display=''; }
  else actBtn.style.display = 'none';
  // Render view
  const renders = { dashboard:rDash, orders:()=>rOrders(orderFilter),
    products:rProds, categories:rCatsList, analytics:rAnalytics,
    settings:rSettings, promo:rPromo, ramadan:rRamadan,
    users:rUsers, tables:rTables, popups:rPopups, social:rSocial };
  renders[id]?.();
}
window.goV = goV;

function handleTopAction() {
  const map = { products:openProdModal, categories:openCatModal,
                users:openUserModal,    tables:openTableModal };
  map[curV]?.();
}
window.handleTopAction = handleTopAction;

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function rDash() {
  const today = new Date().toDateString();
  const todayOrders = ORDERS_DATA.filter(o => {
    const ts = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp||0);
    return ts.toDateString() === today;
  });
  const todayRev = todayOrders.reduce((s,o)=>s+(o.total||0),0);
  const pending  = ORDERS_DATA.filter(o=>['new','preparing','cooking'].includes(o.status)).length;
  const avgVal   = ORDERS_DATA.length ? Math.round(ORDERS_DATA.reduce((s,o)=>s+(o.total||0),0)/ORDERS_DATA.length) : 0;

  $('sc-orders').textContent  = todayOrders.length;
  $('sc-revenue').textContent = todayRev + ' EGP';
  $('sc-pending').textContent = pending;
  $('sc-avg').textContent     = avgVal + ' EGP';

  // Recent orders
  const rec = ORDERS_DATA.slice(0,5);
  $('dashRecentOrders').innerHTML = rec.length ? rec.map(o=>`
    <tr>
      <td style="font-weight:700">#${o.orderNumber||'—'}</td>
      <td>${o.address||'—'}</td>
      <td>${o.total||0} EGP</td>
      <td><span class="st-badge st-${o.status}">${statusLabel(o.status)}</span></td>
      <td style="font-size:.72rem;color:var(--muted)">${fmtTime(o.timestamp)}</td>
    </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">لا توجد طلبات</td></tr>`;
}

const statusLabel = s => ({new:'جديد',preparing:'قيد التحضير',cooking:'يُطبخ',ready:'جاهز',done:'منتهي'}[s]||s);
const statusClass = s => 'st-badge st-'+(s||'new');

// ═══════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════
function rOrders(filter='all') {
  orderFilter = filter;
  document.querySelectorAll('.fpill[data-f]').forEach(p=>p.classList.toggle('act',p.dataset.f===filter));
  let list = filter==='all' ? ORDERS_DATA : ORDERS_DATA.filter(o=>o.status===filter);
  $('ordersTable').innerHTML = list.length ? list.map(o=>`
    <tr>
      <td style="font-weight:800;color:var(--or)">#${o.orderNumber||'—'}</td>
      <td>${o.address||'—'}</td>
      <td style="font-size:.72rem;max-width:200px">${(o.items||[]).map(i=>i.name+' ×'+i.qty).join('، ')}</td>
      <td style="font-weight:700">${o.total||0} EGP</td>
      <td>
        <select class="st-sel" onchange="updStatus('${o._docId}',this.value)">
          ${['new','preparing','cooking','ready','done'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:.72rem;color:var(--muted)">${fmtTime(o.timestamp)}</td>
    </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px">لا توجد طلبات</td></tr>`;
}
window.rOrders = rOrders;

async function updStatus(docId, status) {
  try { await Orders.updateStatus(docId, status); toast('✅ تم تحديث الحالة'); }
  catch { toast('❌ خطأ'); }
}
window.updStatus = updStatus;

// ═══════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════
function rProds() {
  const grid = $('prodsGrid');
  if (!grid) return;
  if (!MEALS.length) { grid.innerHTML=`<div style="color:var(--muted);padding:20px">لا توجد منتجات</div>`; return; }
  grid.innerHTML = MEALS.map(m=>`
    <div class="prod-card">
      <div class="pc-img">
        ${m.img?`<img src="${m.img}" alt="${m.ar}">`:`<span>${m.em||'🍕'}</span>`}
        ${m.badge?`<div class="pc-badge">${m.badge}</div>`:''}
        ${m.soldOut?`<div class="pc-so">نفذ</div>`:''}
      </div>
      <div class="pc-body">
        <div class="pc-nm">${m.ar}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px">${m.en}</div>
        <div class="pc-pr">${m.pr} EGP</div>
        <div class="pc-cat">${CATS.find(c=>c.id===m.cat)?.ar||m.cat}</div>
        <div class="pc-acts">
          <button class="pa-btn" onclick="openProdModal('${m.id}')">✏️ تعديل</button>
          <button class="pa-btn" onclick="togSoldOut('${m.id}',${!m.soldOut})">${m.soldOut?'✅ متاح':'🚫 نفذ'}</button>
          <button class="pa-btn del" onclick="delProd('${m.id}')">🗑</button>
        </div>
      </div>
    </div>`).join('');
}

async function togSoldOut(id, val) {
  try {
    await Products.save(id, {soldOut:val});
    const m = MEALS.find(x=>String(x.id)===String(id));
    if (m) m.soldOut = val;
    rProds(); toast(val?'🚫 تم وضعه نفذ':'✅ متاح مجدداً');
  } catch { toast('❌ خطأ'); }
}
window.togSoldOut = togSoldOut;

async function delProd(id) {
  if (!confirm('حذف المنتج؟')) return;
  try { await Products.delete(id); MEALS=MEALS.filter(m=>String(m.id)!==String(id)); rProds(); toast('🗑 تم الحذف'); }
  catch { toast('❌ خطأ'); }
}
window.delProd = delProd;

// ── Product Modal ──
let _editProdId = null;
function openProdModal(id=null) {
  _editProdId = id;
  const m = id ? MEALS.find(x=>String(x.id)===String(id)) : null;
  $('prodModalTitle').textContent = m ? 'تعديل منتج' : 'منتج جديد';
  $('pAr').value    = m?.ar||''; $('pEn').value  = m?.en||'';
  $('pDa').value    = m?.da||''; $('pDe').value  = m?.de||'';
  $('pPr').value    = m?.pr||''; $('pCal').value = m?.cal||'';
  $('pRt').value    = m?.r||'4.5'; $('pTm').value = m?.tm||'15-25';
  $('pEm').value    = m?.em||'🍕'; $('pBdg').value= m?.badge||'';
  $('pImg').value   = m?.img||'';
  $('pCat').value   = m?.cat||'pizza';
  // Populate cat options
  $('pCat').innerHTML = CATS.filter(c=>c.id!=='all').map(c=>`<option value="${c.id}" ${m?.cat===c.id?'selected':''}>${c.ar}</option>`).join('');
  // Sizes
  const szs = m?.sizes||[];
  ['sm','md','lg'].forEach(k=>{
    const sz=szs.find(s=>s.k===k);
    $('sz_'+k).checked=!!sz;
    $('sz_p_'+k).value=sz?.p||'';
  });
  // Opts
  $('pOpts').value=(m?.opts||[]).map(o=>`${o.ar}|${o.en}|${o.pr}`).join('\n');
  $('prodModal').classList.add('open');
}
window.openProdModal = openProdModal;

async function saveProd() {
  const ar=$('pAr').value.trim(), en=$('pEn').value.trim();
  const pr=Number($('pPr').value), cat=$('pCat').value;
  if(!ar||!en||!pr||!cat){toast('⚠️ أكمل الحقول المطلوبة');return;}
  const sizes=['sm','md','lg'].filter(k=>$('sz_'+k).checked&&$('sz_p_'+k).value)
    .map(k=>({k,p:Number($('sz_p_'+k).value)}));
  const opts=$('pOpts').value.trim().split('\n').filter(Boolean).map(l=>{
    const [ar,en,p]=l.split('|'); return ar&&en&&p?{ar:ar.trim(),en:en.trim(),pr:Number(p)}:null;
  }).filter(Boolean);
  const data={
    ar, en, da:$('pDa').value, de:$('pDe').value,
    pr, cal:Number($('pCal').value)||500,
    r:Number($('pRt').value)||4.5, tm:$('pTm').value||'15-25',
    em:$('pEm').value||'🍕', badge:$('pBdg').value,
    img:$('pImg').value, cat, sizes, opts,
    soldOut:false
  };
  try {
    const id=_editProdId||String(Date.now());
    await Products.save(id,{...data,id:Number(id)||id});
    if(_editProdId){const i=MEALS.findIndex(m=>String(m.id)===String(_editProdId));if(i>=0)MEALS[i]={...MEALS[i],...data};}
    else MEALS.push({...data,id:Number(id)||id});
    closeProdModal(); rProds(); toast('✅ تم الحفظ');
  } catch(e){toast('❌ خطأ: '+e.message);}
}
window.saveProd=saveProd;
function closeProdModal(){$('prodModal').classList.remove('open');}
window.closeProdModal=closeProdModal;

// ═══════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════
function rCatsList() {
  $('catsList').innerHTML = CATS.filter(c=>c.id!=='all').map(c=>`
    <tr>
      <td style="font-size:1.5rem">${c.em||'📁'}</td>
      <td style="font-weight:700">${c.ar}</td>
      <td>${c.en}</td>
      <td>${c.id}</td>
      <td>
        <button class="pa-btn" onclick="openCatModal('${c.id}')" style="padding:5px 12px;">✏️</button>
        <button class="pa-btn del" onclick="delCat('${c.id}')" style="padding:5px 12px;">🗑</button>
      </td>
    </tr>`).join('');
}

let _editCatId=null;
function openCatModal(id=null) {
  _editCatId=id;
  const c=id?CATS.find(x=>x.id===id):null;
  $('catModalTitle').textContent=c?'تعديل قسم':'قسم جديد';
  $('cAr').value=c?.ar||'';$('cEn').value=c?.en||'';
  $('cEm').value=c?.em||'📁';$('cId').value=c?.id||'';
  if(id) $('cId').disabled=true; else $('cId').disabled=false;
  $('catModal').classList.add('open');
}
window.openCatModal=openCatModal;

async function saveCat() {
  const id=$('cId').value.trim()||_editCatId;
  const ar=$('cAr').value.trim(), en=$('cEn').value.trim();
  if(!id||!ar||!en){toast('⚠️ أكمل الحقول');return;}
  try{
    await Categories.save(id,{id,ar,en,em:$('cEm').value||'📁'});
    const i=CATS.findIndex(c=>c.id===id);
    const data={id,ar,en,em:$('cEm').value||'📁'};
    if(i>=0)CATS[i]=data; else CATS.push(data);
    closeCatModal(); rCatsList(); toast('✅ تم الحفظ');
  }catch(e){toast('❌ خطأ: '+e.message);}
}
window.saveCat=saveCat;

async function delCat(id) {
  if(!confirm('حذف القسم؟'))return;
  try{await Categories.delete(id);CATS=CATS.filter(c=>c.id!==id);rCatsList();toast('🗑 تم الحذف');}
  catch{toast('❌ خطأ');}
}
window.delCat=delCat;
function closeCatModal(){$('catModal').classList.remove('open');}
window.closeCatModal=closeCatModal;

// ═══════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════
async function rAnalytics() {
  // Best sellers
  const counts={};
  ORDERS_DATA.forEach(o=>(o.items||[]).forEach(i=>{counts[i.name]=(counts[i.name]||0)+i.qty;}));
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  $('topItemsList').innerHTML=top.map(([name,qty],i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bdr)">
      <span style="font-size:.75rem;color:var(--or);font-weight:800;min-width:20px">#${i+1}</span>
      <span style="flex:1;font-size:.82rem">${name}</span>
      <span style="font-size:.78rem;font-weight:700;color:var(--or)">${qty} طلب</span>
    </div>`).join('');

  // Revenue per day (last 7 days)
  const days={};
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    days[d.toLocaleDateString('ar-EG',{weekday:'short'})]=0;
  }
  ORDERS_DATA.forEach(o=>{
    const ts=o.timestamp?.toDate?o.timestamp.toDate():new Date(o.timestamp||0);
    const lbl=ts.toLocaleDateString('ar-EG',{weekday:'short'});
    if(days[lbl]!==undefined) days[lbl]+=(o.total||0);
  });

  // Orders by status
  const stCounts={new:0,preparing:0,cooking:0,ready:0,done:0};
  ORDERS_DATA.forEach(o=>{ if(stCounts[o.status]!==undefined) stCounts[o.status]++; });

  // Stats
  const totalRev=ORDERS_DATA.reduce((s,o)=>s+(o.total||0),0);
  const avgVal=ORDERS_DATA.length?Math.round(totalRev/ORDERS_DATA.length):0;
  $('analTotalOrders').textContent=ORDERS_DATA.length;
  $('analTotalRev').textContent=totalRev+' EGP';
  $('analAvgVal').textContent=avgVal+' EGP';
  $('analTopItem').textContent=top[0]?.[0]||'—';

  // Charts
  if(!Chart_loaded){
    Chart_loaded=true;
    await new Promise(r=>setTimeout(r,300));
  }
  try{
    // Revenue chart
    const revCtx=$('revChart')?.getContext('2d');
    if(revCtx){
      if(window._revChart) window._revChart.destroy();
      window._revChart=new Chart(revCtx,{
        type:'bar',
        data:{labels:Object.keys(days),datasets:[{label:'الإيرادات (EGP)',data:Object.values(days),backgroundColor:'rgba(255,107,0,.7)',borderColor:'#FF6B00',borderRadius:6}]},
        options:{responsive:true,plugins:{legend:{labels:{color:'#aaa'}}},scales:{x:{ticks:{color:'#aaa'}},y:{ticks:{color:'#aaa'},grid:{color:'rgba(255,255,255,.05)'}}}}
      });
    }
    // Status pie
    const stCtx=$('stChart')?.getContext('2d');
    if(stCtx){
      if(window._stChart) window._stChart.destroy();
      window._stChart=new Chart(stCtx,{
        type:'doughnut',
        data:{labels:['جديد','يُحضَّر','يُطبخ','جاهز','منتهي'],
              datasets:[{data:Object.values(stCounts),backgroundColor:['#1E88E5','#FFA726','#FF6B00','#43A047','#666'],borderWidth:0}]},
        options:{responsive:true,plugins:{legend:{position:'bottom',labels:{color:'#aaa',boxWidth:12}}}}
      });
    }
  }catch{}
}

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════
async function rSettings() {
  try {
    const d=await Config.get('settings');
    if(!d)return;
    ['restName','phone','address','hours','deliveryFee'].forEach(k=>{
      const el=$(k); if(el&&d[k]) el.value=d[k];
    });
  }catch{}
}
async function saveSettings() {
  const data={};
  ['restName','phone','address','hours','deliveryFee'].forEach(k=>{const el=$(k);if(el)data[k]=el.value;});
  try{await Config.set('settings',data);toast('✅ تم حفظ الإعدادات');}
  catch{toast('❌ خطأ');}
}
window.saveSettings=saveSettings;

// ═══════════════════════════════════════════════
// PROMO CODES
// ═══════════════════════════════════════════════
let PROMOS=[];
async function rPromo() {
  try{const d=await Config.get('promos');PROMOS=d?.promos||[];}catch{}
  $('promoList').innerHTML=PROMOS.map((p,i)=>`
    <tr>
      <td style="font-weight:800;font-family:monospace;letter-spacing:1px;color:var(--or)">${p.code}</td>
      <td>${p.disc}%</td>
      <td>${p.uses||'∞'}</td>
      <td><span class="st-badge ${p.active!==false?'st-ready':'st-done'}">${p.active!==false?'فعال':'موقوف'}</span></td>
      <td>
        <button class="pa-btn" onclick="togPromo(${i})" style="padding:5px 10px">${p.active!==false?'إيقاف':'تفعيل'}</button>
        <button class="pa-btn del" onclick="delPromo(${i})" style="padding:5px 10px">🗑</button>
      </td>
    </tr>`).join('');
}
async function addPromo() {
  const code=$('promoCode').value.trim().toUpperCase();
  const disc=Number($('promoDisc').value);
  if(!code||!disc){toast('⚠️ أكمل البيانات');return;}
  PROMOS.push({code,disc,uses:'∞',active:true});
  await Config.set('promos',{promos:PROMOS});
  $('promoCode').value='';$('promoDisc').value='';
  rPromo(); toast('✅ تم إضافة الكود');
}
async function togPromo(i){PROMOS[i].active=!PROMOS[i].active;await Config.set('promos',{promos:PROMOS});rPromo();}
async function delPromo(i){PROMOS.splice(i,1);await Config.set('promos',{promos:PROMOS});rPromo();toast('🗑 تم الحذف');}
window.addPromo=addPromo;window.togPromo=togPromo;window.delPromo=delPromo;

// ═══════════════════════════════════════════════
// RAMADAN
// ═══════════════════════════════════════════════
let ramActive=false,ramTitle='',ramDesc='',ramItems=new Set();
async function rRamadan() {
  try{const d=await Config.get('ramadan');if(d){ramActive=!!d.active;ramTitle=d.title||'';ramDesc=d.desc||'';ramItems=new Set(d.items||[]);}}catch{}
  $('ramToggle').checked=ramActive;
  $('ramTitle').value=ramTitle;
  $('ramDescInp').value=ramDesc;
  $('ramItemsList').innerHTML=MEALS.map(m=>`
    <label style="display:flex;align-items:center;gap:8px;padding:7px;border-radius:8px;background:var(--bg3);cursor:pointer">
      <input type="checkbox" ${ramItems.has(m.id)?'checked':''} onchange="togRamItem(${m.id},this.checked)">
      <span style="font-size:.82rem">${m.ar} — ${m.pr} EGP</span>
    </label>`).join('');
}
async function saveRamadan(){
  try{
    await Config.set('ramadan',{active:$('ramToggle').checked,title:$('ramTitle').value,desc:$('ramDescInp').value,items:[...ramItems]});
    toast('✅ تم الحفظ');
  }catch{toast('❌ خطأ');}
}
function togRamItem(id,val){val?ramItems.add(id):ramItems.delete(id);}
window.saveRamadan=saveRamadan;window.togRamItem=togRamItem;

// ═══════════════════════════════════════════════
// USERS MANAGEMENT
// ═══════════════════════════════════════════════
async function rUsers() {
  let all=[];
  try{all=await Users.getAll();}catch{}
  $('userGrid').innerHTML=all.map(u=>{
    const r=ROLES[u.role]||ROLES.cashier;
    const p=PERMS[u.role]||PERMS.cashier;
    return `<div class="user-card">
      <div class="uc-top">
        <div class="uc-av">${r.icon}</div>
        <div><div class="uc-nm">${u.name||'—'}</div>
          <div class="uc-em">${u.email||'—'}</div>
          <div class="rbdg rbdg-${u.role}">${r.icon} ${r.label}</div>
        </div>
      </div>
      <div class="perm-grid">
        ${Object.entries(p).slice(0,6).map(([k,v])=>`
          <div class="perm-item"><div class="pdot ${v?'pdot-on':'pdot-off'}"></div><span>${{dashboard:'داشبورد',orders:'طلبات',products:'منتجات',categories:'أقسام',settings:'إعدادات',promo:'كوبونات',analytics:'تحليلات',ramadan:'رمضان',users:'مستخدمين',tables:'طاولات',popups:'بوب-أب',social:'سوشيال'}[k]||k}</span></div>`).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;">
        <button class="pa-btn" onclick="openUserModal('${u.uid}')" style="padding:6px 10px">✏️ تعديل</button>
        <button class="pa-btn ${u.active===false?'':'del'}" onclick="togUser('${u.uid}',${u.active!==false})" style="padding:6px 10px">
          ${u.active===false?'✅ تفعيل':'🚫 إيقاف'}</button>
      </div>
    </div>`;}).join('');
}

let _editUserId=null;
function openUserModal(uid=null) {
  _editUserId=uid;
  $('userModalTitle').textContent=uid?'تعديل مستخدم':'مستخدم جديد';
  $('uName').value='';$('uEmail').value='';$('uPass').value='';$('uRole').value='cashier';
  if(uid){
    Users.get(uid).then(u=>{if(u){$('uName').value=u.name||'';$('uEmail').value=u.email||'';$('uRole').value=u.role||'cashier';}});
    $('uPass').placeholder='اتركه فارغاً للإبقاء على نفس الكلمة';
  }else{$('uPass').placeholder='كلمة المرور';}
  updPermPreview();
  $('userModal').classList.add('open');
}
window.openUserModal=openUserModal;

function updPermPreview(){
  const role=$('uRole').value;
  const p=PERMS[role]||PERMS.cashier;
  $('permPreview').innerHTML=Object.entries(p).map(([k,v])=>`
    <div class="perm-item"><div class="pdot ${v?'pdot-on':'pdot-off'}"></div>
    <span style="font-size:.7rem">${{dashboard:'داشبورد',orders:'طلبات',products:'منتجات',categories:'أقسام',settings:'إعدادات',promo:'كوبونات',analytics:'تحليلات',ramadan:'رمضان',users:'مستخدمين',tables:'طاولات',popups:'بوب-أب',social:'سوشيال'}[k]||k}</span></div>`).join('');
}
window.updPermPreview=updPermPreview;

async function saveUser(){
  const name=$('uName').value.trim(), email=$('uEmail').value.trim();
  const pass=$('uPass').value, role=$('uRole').value;
  if(!name||!email){toast('⚠️ أكمل الاسم والإيميل');return;}
  try{
    if(!_editUserId){
      if(!pass){toast('⚠️ كلمة المرور مطلوبة');return;}
      const {FB_CONFIG}=await import('../config/firebase.js');
      const res=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FB_CONFIG.apiKey}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password:pass,returnSecureToken:true})
      });
      const d=await res.json();
      if(d.error){toast('❌ '+d.error.message);return;}
      await Users.save(d.localId,{name,email,role,active:true});
      toast('✅ تم إنشاء المستخدم');
    }else{
      await Users.save(_editUserId,{name,email,role});
      toast('✅ تم تحديث المستخدم');
    }
    closeUserModal(); rUsers();
  }catch(e){toast('❌ خطأ: '+e.message);}
}
window.saveUser=saveUser;

async function togUser(uid,active){
  await Users.save(uid,{active:!active});
  toast(active?'🚫 تم الإيقاف':'✅ تم التفعيل');
  rUsers();
}
window.togUser=togUser;
function closeUserModal(){$('userModal').classList.remove('open');}
window.closeUserModal=closeUserModal;

// ═══════════════════════════════════════════════
// TABLES & QR
// ═══════════════════════════════════════════════
async function rTables(){
  try{TABLES_DATA=await Tables.getAll();}catch{}
  const grid=$('tablesGrid'); if(!grid) return;
  grid.innerHTML=TABLES_DATA.map(t=>`
    <div class="qr-t-card">
      <div style="font-size:.8rem;font-weight:700;margin-bottom:6px">طاولة ${t.id}</div>
      <canvas id="qrc_${t.id}" width="120" height="120"></canvas>
      <div style="font-size:.68rem;color:var(--muted);margin-top:8px;word-break:break-all">${t.url||''}</div>
      <div style="display:flex;gap:6px;margin-top:8px;justify-content:center;">
        <button class="pa-btn" onclick="printQR('${t.id}')" style="padding:5px 10px;font-size:.7rem">🖨️ طباعة</button>
        <button class="pa-btn del" onclick="delTable('${t.id}')" style="padding:5px 10px;font-size:.7rem">🗑</button>
      </div>
    </div>`).join('');
  // Draw QR codes
  TABLES_DATA.forEach(t=>{
    const url=t.url||`${location.origin}/?table=${t.id}`;
    drawQR(`qrc_${t.id}`, url);
  });
}

function drawQR(canvasId, text) {
  const canvas=$(canvasId); if(!canvas) return;
  const size=120, ctx=canvas.getContext('2d');
  // Simple QR visual placeholder — real QR via URL
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size);
  ctx.fillStyle='#111';
  // Draw text as fallback
  ctx.font='9px monospace'; ctx.fillStyle='#333'; ctx.textAlign='center';
  ctx.fillText('QR Code',size/2,size/2-5);
  ctx.font='7px monospace'; ctx.fillText('طاولة '+text.split('table=')[1],size/2,size/2+10);
  // Link as download fallback
  const link=document.createElement('a');
  link.href=`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=120x120`;
  const img=new Image(); img.crossOrigin='anonymous';
  img.onload=()=>ctx.drawImage(img,0,0,size,size);
  img.src=link.href;
}

let _editTableId=null;
function openTableModal(){
  _editTableId=null;
  $('tNum').value='';
  $('tableModal').classList.add('open');
}
window.openTableModal=openTableModal;

async function saveTable(){
  const num=$('tNum').value.trim();
  if(!num){toast('⚠️ أدخل رقم الطاولة');return;}
  const url=`${location.origin}/?table=${num}`;
  try{await Tables.save(num,{id:num,url,createdAt:Date.now()});TABLES_DATA.push({id:num,url});closeTableModal();rTables();toast('✅ تم الإضافة');}
  catch(e){toast('❌ خطأ: '+e.message);}
}
window.saveTable=saveTable;

async function delTable(id){
  if(!confirm('حذف الطاولة؟'))return;
  try{await Tables.delete(id);TABLES_DATA=TABLES_DATA.filter(t=>t.id!==id);rTables();toast('🗑 تم');}catch{}
}
window.delTable=delTable;
function closeTableModal(){$('tableModal').classList.remove('open');}
window.closeTableModal=closeTableModal;

function printQR(id){
  const t=TABLES_DATA.find(x=>x.id===id); if(!t) return;
  const url=t.url||`${location.origin}/?table=${id}`;
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>طاولة ${id}</title></head><body style="text-align:center;font-family:Arial;padding:40px">
    <h2>🔥 SPARK Restaurant</h2><h1>طاولة ${id}</h1>
    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=300x300" style="margin:20px auto;display:block">
    <p style="color:#666;font-size:14px">امسح الكود لتصفح القائمة والطلب مباشرة</p>
    </body></html>`);
  w.print();
}
window.printQR=printQR;

// ── Waiter Calls ──
function watchWaiterCalls(){
  _waiterUnsub=Tables.onWaiterCalls(calls=>{
    if(!calls.length) return;
    calls.forEach(c=>{
      toast(`🔔 نداء النادل — طاولة ${c.tableName||c.tableId}`);
      playSound('order');
    });
  });
}

// ═══════════════════════════════════════════════
// POPUPS MANAGEMENT
// ═══════════════════════════════════════════════
async function rPopups(){
  try{const d=await Config.get('popup');
    if(d){
      $('popEnabled').checked=!!d.enabled;
      $('popIcon2').value=d.icon||'🔥';
      $('popTitle2').value=d.title||'';
      $('popBody2').value=d.body||'';
      $('popDelay').value=d.delay||2;
      $('popAutoClose').value=d.autoClose||0;
    }
  }catch{}
}
async function savePopup(){
  await Config.set('popup',{
    enabled:$('popEnabled').checked,
    icon:$('popIcon2').value, title:$('popTitle2').value,
    body:$('popBody2').value, delay:Number($('popDelay').value),
    autoClose:Number($('popAutoClose').value)||0
  });
  toast('✅ تم الحفظ');
}
window.savePopup=savePopup;

// ═══════════════════════════════════════════════
// SOCIAL MEDIA
// ═══════════════════════════════════════════════
async function rSocial(){
  try{const d=await Config.get('social');
    if(d){
      $('smIg').value=d.instagram||''; $('smFb').value=d.facebook||'';
      $('smTk').value=d.tiktok||'';    $('smWa').value=d.whatsapp||'';
    }
  }catch{}
  try{const d=await Config.get('floatBtn');
    if(d){
      $('fbEnabled').checked=!!d.enabled;
      $('fbIcon').value=d.icon||'⚡';
      $('fbText').value=d.text||'';
      $('fbAction').value=d.action||'menu';
    }
  }catch{}
}
async function saveSocial(){
  await Config.set('social',{
    instagram:$('smIg').value, facebook:$('smFb').value,
    tiktok:$('smTk').value,    whatsapp:$('smWa').value
  });
  toast('✅ تم حفظ السوشيال');
}
async function saveFloatBtn(){
  await Config.set('floatBtn',{
    enabled:$('fbEnabled').checked,
    icon:$('fbIcon').value, text:$('fbText').value, action:$('fbAction').value
  });
  toast('✅ تم حفظ الزر العائم');
}
window.saveSocial=saveSocial; window.saveFloatBtn=saveFloatBtn;

// ═══════════════════════════════════════════════
// AUTH UI
// ═══════════════════════════════════════════════
async function doLogin(){
  const email=$('loginEmail').value.trim();
  const pass=$('loginPass').value;
  const err=$('loginErr'); err.textContent='';
  if(!email||!pass){err.textContent='يرجى إدخال الإيميل وكلمة المرور';return;}
  $('loginBtn').textContent='...جاري الدخول'; $('loginBtn').disabled=true;
  try{
    const profile=await login(email,pass);
    currentUser=profile;
    applyRole(profile.role);
    $('authOverlay').style.display='none';
    await initAdmin();
  }catch(e){
    err.textContent=authErrorMsg(e.message||e.code);
  }finally{$('loginBtn').textContent='دخول';$('loginBtn').disabled=false;}
}
window.doLogin=doLogin;

async function doLogout(){
  if(!confirm('تسجيل الخروج؟'))return;
  await logout(); currentUser=null;
  if(_ordersUnsub){_ordersUnsub();_ordersUnsub=null;}
  if(_waiterUnsub){_waiterUnsub();_waiterUnsub=null;}
  $('authOverlay').style.display='flex';
}
window.doLogout=doLogout;

function applyRole(role){
  const r=ROLES[role]||ROLES.cashier;
  const p=PERMS[role]||PERMS.cashier;
  $('sbAvatar').textContent=r.icon;
  $('sbName').textContent=currentUser?.name||r.label;
  $('sbBadge').textContent=r.icon+' '+r.label;
  $('sbBadge').className='rbdg rbdg-'+role;
  document.querySelectorAll('.sb-item[data-v]').forEach(el=>{
    el.style.display=(p[el.dataset.v]!==false)?'':'none';
  });
  // Default view
  const first=Object.keys(p).find(k=>p[k]);
  if(first) goV(first);
}

// ═══════════════════════════════════════════════
// INIT ADMIN
// ═══════════════════════════════════════════════
async function initAdmin(){
  // Real-time orders
  _ordersUnsub=Orders.onSnapshot(orders=>{
    const prev=ORDERS_DATA.length;
    ORDERS_DATA=orders;
    if(prev>0&&orders.length>prev){
      const al=$('newOrderAlert'); if(al){al.style.display='block';setTimeout(()=>al.style.display='none',5000);}
      playSound('order');
    }
    if(curV==='orders')    rOrders(orderFilter);
    if(curV==='analytics') rAnalytics();
    if(curV==='dashboard') rDash();
    $('sc-orders').textContent=orders.filter(o=>new Date(o.timestamp?.toDate?.()).toDateString()===new Date().toDateString()).length;
  });

  // Load products + cats
  try{
    const [prods,cats]=await Promise.all([Products.getAll(),Categories.getAll()]);
    MEALS=prods.map(p=>({...p,id:Number(p.id)||p.id}));
    CATS=cats.length?cats:[{id:'pizza',ar:'بيتزا',en:'Pizza',em:'🍕'},{id:'burger',ar:'برجر',en:'Burgers',em:'🍔'}];
  }catch(e){console.warn('load:',e);}

  // Waiter calls
  watchWaiterCalls();

  // Go default
  applyRole(currentUser.role);
}

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════
watchAuth(
  async profile=>{
    currentUser=profile;
    applyRole(profile.role);
    $('authOverlay').style.display='none';
    await initAdmin();
  },
  ()=>{ $('authOverlay').style.display='flex'; }
);

// Enter key login
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&$('authOverlay')?.style.display!=='none') doLogin();
});
