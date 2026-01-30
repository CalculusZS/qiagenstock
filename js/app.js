/* ===== CONFIG ===== */
const API = "https://script.google.com/macros/s/AKfycbx4tQa8jnXbTY79pQtVmpmk5iKMBK8VWkP8AHj0InW3U110CPHKIL0NCSbLsukjw1Ztcg/exec";   // ใส่ URL Web App จริง
const PASSWORD = "Service";

let rows = [];      // ข้อมูลตารางทั้งหมด (object ตาม header)
let SCHEMA = {};    // แผนที่ชื่อหัวตาราง → index

/* ===== Utils ===== */
const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== Load Users (H–M จาก Backend) ===== */
async function loadUsers(){
  const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
  const res = await fetch(url).then(r => r.json());
  if(!res.success){ alert(res.msg || 'โหลดผู้ใช้ไม่สำเร็จ'); return []; }
  // [{header:'Kitti', colIndex:8}, ...]
  return res.users;
}

/* ===== Load All with schema ===== */
async function loadAllWithSchema(){
  const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
  const res = await fetch(url).then(r => r.json());
  if(!res.success){ alert(res.msg || 'โหลดข้อมูลไม่สำเร็จ'); return; }
  SCHEMA = res.schema || {};
  rows   = res.rows  || [];
  renderTable(rows);
  renderSelect(rows);
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

/* ===== Search by Material (คอลัมน์ B) ===== */
function searchByMaterial(k){
  const key = (k || '').toLowerCase();
  const filtered = !key ? rows : rows.filter(r =>
    (r['Material'] || '').toLowerCase().includes(key)
  );
  renderTable(filtered);
  renderSelect(filtered);
}

/* ===== Transaction (withdraw/return) ===== */
async function transactionV2({type, material, qty, user}){
  const btn = qs('btnConfirm');
  if(btn) btn.disabled = true;

  const url = `${API}?action=${encodeURIComponent(type)}&password=${encodeURIComponent(PASSWORD)}`
            + `&material=${encodeURIComponent(material)}&qty=${encodeURIComponent(qty)}&user=${encodeURIComponent(user)}`;
  try{
    const res = await fetch(url).then(r => r.json());
    if(!res.success){ alert(res.msg || 'ทำรายการไม่สำเร็จ'); return false; }
    return true;
  }catch(e){
    alert('เครือข่ายขัดข้อง กรุณาลองใหม่');
    return false;
  }finally{
    if(btn) btn.disabled = false;
  }
}

/* ===== Login (ถ้าใช้หน้า index.html) ===== */
window.login = function (){
  const input = document.getElementById('password');
  const pass = (input?.value || '').trim();
  if (pass === PASSWORD) location.href = 'user-select.html';
  else { alert('รหัสผ่านไม่ถูกต้อง'); input?.focus(); }
};
