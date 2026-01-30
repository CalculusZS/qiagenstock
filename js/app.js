/* ===== Config ===== */
const API = "https://script.google.com/macros/s/AKfycbzDyWbBwyxnQUxtf6EUsAyKVu-eZjblA1aZMEKYDl587SUYfJZTljUNaJDQzTpNVPhzcQ/exec"; // <-- replace with your GAS Web App URL
const PASSWORD = "Service";

let rows = [];
let SCHEMA = {};

const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== Load Users from Apps Script (H–M headers) ===== */
async function loadUsers(){
  const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
  const res = await fetch(url).then(r => r.json());
  if(!res.success){ alert(res.msg || 'Failed to load users'); return []; }
  return res.users; // [{header:'Kitti', colIndex:8}, ...]
}

/* ===== Back (global) ===== */
function goBack(){
  if (document.referrer) history.back();
  else location.href = 'user-select.html';
}

/* ===== (Optional) Login page support ===== */
window.login = function (){
  const pass = (qs('password')?.value || '').trim();
  if (pass === PASSWORD) location.href = 'user-select.html';
  else alert('Incorrect password');
};

/* ===== Stock pages helpers ===== */
async function loadAllWithSchema(){
  try{
    const res = await fetch(`${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`).then(r=>r.json());
    if(!res.success) return alert(res.msg || 'Failed to load data');
    SCHEMA = res.schema || {};
    rows   = res.rows  || [];
    renderTable(rows);
    renderSelect(rows);
  }catch(e){
    alert('Network error. Please try again.');
  }
}
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
function searchByMaterial(keyword){
  const k = (keyword || '').toLowerCase();
  const filtered = !k ? rows : rows.filter(r => (r['Material'] || '').toLowerCase().includes(k));
  renderTable(filtered); renderSelect(filtered);
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

async function transactionV2({type, material, qty, user}){
  const btn = qs('btnConfirm'); if(btn) btn.disabled = true;
  try{
    const url = `${API}?action=${encodeURIComponent(type)}&password=${encodeURIComponent(PASSWORD)}&material=${encodeURIComponent(material)}&qty=${encodeURIComponent(qty)}&user=${encodeURIComponent(user)}`;
    const res = await fetch(url).then(r => r.json());
    if(!res.success){ alert(res.msg || 'Transaction failed'); return false; }
    return true;
  }catch(e){ alert('Network error. Please try again.'); return false; }
  finally{ if(btn) btn.disabled = false; }
}
