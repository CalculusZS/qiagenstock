/* ===== Config ===== */
const API = "hhttps://script.google.com/macros/s/AKfycbwCVkFzv3ZnhY5sJP1uknZnIz74aGd-oZS3Nwt1j1cUlggdRx9x4yraxPjmTwGcubi_VA/exec"; // e.g. https://script.google.com/macros/s/AKfy.../exec
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];
let SCHEMA = {};

const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== Users (Select User page) ===== */
async function loadUsers(){
  const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
  const res = await fetch(url).then(r => r.json()).catch(()=>({success:false}));
  if(!res?.success){ alert(res?.msg || 'Failed to load users'); return []; }
  return res.users || []; // [{header:'Kitti', colIndex:8}, ...]
}

/* ===== Navigation / Login ===== */
function goBack(){ if (document.referrer) history.back(); else location.href = 'user-select.html'; }

window.login = function (){
  const pass = (qs('password')?.value || '').trim();
  if (pass === PASSWORD) location.href = 'user-select.html';
  else alert('Incorrect password');
};

/* ===== Load data (Instrument/Material/Product Name/Type/0243) ===== */
async function loadAllWithSchema(){
  try{
    const res = await fetch(`${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`).then(r=>r.json());
    if(!res.success){ alert(res.msg || 'Failed to load data'); return; }
    SCHEMA = res.schema || {};
    rows   = res.rows  || [];
    renderTable(rows);
    renderSelect(rows);
  }catch(e){
    alert('Network error. Please try again.');
  }
}

/* ===== Renderers ===== */
function renderTable(list){
  const tb = qs('data');
  if(!tb) return;
  tb.innerHTML = list.map(r => `
    <tr>
      <td>${r['Instrument'] ?? ''}</td>
      <td>${r['Material'] ?? ''}</td>
      <td>${r['Product Name'] ?? ''}</td>
      <td>${r['Type'] ?? ''}</td>
      <td class="num">${r['0243'] ?? 0}</td>
    </tr>
  `).join('');
}

function renderSelect(list){
  const sel = qs('materialSel');
  if(!sel) return;
  sel.innerHTML = list.map(r =>
    `<option value="${r['Material']}">${r['Material']} - ${r['Product Name'] ?? ''}</option>`
  ).join('');
}

/* ===== Search ===== */
function searchByMaterial(keyword){
  const k = (keyword || '').toLowerCase();
  const filtered = !k ? rows : rows.filter(r => (r['Material'] || '').toLowerCase().includes(k));
  renderTable(filtered);
  renderSelect(filtered);
}

function searchAll(keyword){
  const k = (keyword || '').toLowerCase();
  const keys = ['Instrument','Material','Product Name','Type','0243'];
  const filtered = !k ? rows : rows.filter(r =>
    keys.some(key => String(r[key] ?? '').toLowerCase().includes(k))
  );
  renderTable(filtered);
  renderSelect(filtered);
}

/* ===== Transactions (withdraw / return) ===== */
async function transactionV2({type, material, qty, user}){
  const btn = qs('btnConfirm');
  if(btn) btn.disabled = true;
  try{
    const url = `${API}?action=${encodeURIComponent(type)}`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&user=${encodeURIComponent(user)}`;
    const res = await fetch(url).then(r => r.json());
    if(!res.success){ alert(res.msg || 'Transaction failed'); return false; }
    return true;
  }catch(e){
    alert('Network error. Please try again.');
    return false;
  }finally{
    if(btn) btn.disabled = false;
  }
}

/* ===== Supervisor Auth (frontend) ===== */
function supAuth(pass){
  if (pass === SUP_PASSWORD) { sessionStorage.setItem('isSupervisor','1'); return true; }
  return false;
}
function supIsLoggedIn(){ return sessionStorage.getItem('isSupervisor') === '1'; }
function supRequire(){ if (!supIsLoggedIn()) { alert('Supervisor access required'); location.href='user-select.html'; } }
function supLogout(){ sessionStorage.removeItem('isSupervisor'); }

/* ===== Supervisor API (return full object for clear error messages) ===== */
async function supAddStock(material, qty){
  try{
    const url = `${API}?action=sup_add_stock`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&qty=${encodeURIComponent(qty)}`;
    const res = await fetch(url).then(r => r.json());
    return res; // {success, msg?}
  }catch(e){ return { success:false, msg:String(e) }; }
}

async function supGetMaterial(material){
  try{
    const url = `${API}?action=sup_get_material`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`;
    const res = await fetch(url).then(r => r.json());
    return res; // {success, data?, msg?}
  }catch(e){ return { success:false, msg:String(e) }; }
}

async function supSetUserQty({ material, user, qty, reconcile='false' }){
  try{
    const url = `${API}?action=sup_set_user_qty`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&user=${encodeURIComponent(user)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&reconcile=${encodeURIComponent(reconcile)}`;
    const res = await fetch(url).then(r => r.json());
    return res; // {success, msg?}
  }catch(e){ return { success:false, msg:String(e) }; }
}
``
