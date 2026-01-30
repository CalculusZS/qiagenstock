/* ===== Config ===== */
// URL ของ Web App ที่ได้จากการ Deploy ใน Google Apps Script
const API = "https://script.google.com/macros/s/AKfycbyqUQcG8B8mSjSfeb6FCTAAYjIKcbR_bqm-UsmdqQCraIhl0Iwf6RKv0hYeVQCIA_MigA/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];
let SCHEMA = {};

const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== 1. Load Data (ดึงข้อมูลจาก Spreadsheet) ===== */
async function loadAllWithSchema(){
  try {
    const res = await fetch(`${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`).then(r => r.json());
    if(!res.success){ alert(res.msg || 'Failed to load data'); return; }
    
    rows = res.rows || [];
    // ถ้าหน้าจอมีตารางให้แสดงผล (หน้า Show All)
    if (qs('data')) renderTable(rows);
    // ถ้าหน้าจอมีรายการเลือก Material (หน้า Withdraw/Return)
    if (qs('materialSel')) renderSelect(rows);
    
    return rows;
  } catch(e) {
    console.error('Error loading data:', e);
  }
}

/* ===== 2. Renderers (การแสดงผลบนหน้าเว็บ) ===== */
function renderTable(list){
  const tb = qs('data');
  if(!tb) return;
  tb.innerHTML = list.map(r => `
    <tr>
      <td>${r['Instrument'] ?? ''}</td>
      <td>${r['Material'] ?? ''}</td>
      <td>${r['Product Name'] ?? ''}</td>
      <td>${r['Type'] ?? ''}</td>
      <td class="num" style="font-weight:bold;">${r['0243'] ?? 0}</td>
    </tr>
  `).join('');
}

function renderSelect(list){
  const sel = qs('materialSel');
  if(!sel) return;
  sel.innerHTML = `<option value="">-- Select Material --</option>` + 
    list.map(r => `<option value="${r['Material']}">${r['Material']} - ${r['Product Name'] ?? ''}</option>`).join('');
}

/* ===== 3. User Transactions (เบิก/คืน) ===== */
async function transactionV2({type, material, qty, user}){
  const btn = qs('btnConfirm');
  if(btn) btn.disabled = true;
  try {
    const url = `${API}?action=${encodeURIComponent(type)}`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&user=${encodeURIComponent(user)}`;
    
    const res = await fetch(url).then(r => r.json());
    if(!res.success){ alert(res.msg || 'Transaction failed'); return false; }
    return true;
  } catch(e) {
    alert('Network error. Please try again.');
    return false;
  } finally {
    if(btn) btn.disabled = false;
  }
}

/* ===== 4. Supervisor Auth (การเข้ารหัสฝั่งหัวหน้า) ===== */
function supAuth(pass){
  if (pass === SUP_PASSWORD) { 
    sessionStorage.setItem('isSupervisor','1'); 
    return true; 
  }
  return false;
}
function supIsLoggedIn(){ return sessionStorage.getItem('isSupervisor') === '1'; }
function supRequire(){ if (!supIsLoggedIn()) { alert('Supervisor access required'); location.href='user-select.html'; } }
function supLogout(){ sessionStorage.removeItem('isSupervisor'); }

/* ===== 5. Supervisor API (เพิ่มสต็อก และ หักยอดคนถือ) ===== */

// เพิ่มสต็อกเข้าส่วนกลาง (0243)
async function supAddStock(material, qty){
  try {
    const url = `${API}?action=sup_add_stock`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&qty=${encodeURIComponent(qty)}`;
    return await fetch(url).then(r => r.json());
  } catch(e) { return { success:false, msg:String(e) }; }
}

// หักยอดที่บุคคลถืออยู่ (เช่น Phurilap) หรือตั้งค่าใหม่
async function supSetUserQty({ material, user, qty, status = 'SET' }){
  try {
    const url = `${API}?action=sup_set_user_qty`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&user=${encodeURIComponent(user)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&status=${encodeURIComponent(status)}`; // ส่ง status: 'USED' เพื่อสั่งหักยอด
    return await fetch(url).then(r => r.json());
  } catch(e) { return { success:false, msg:String(e) }; }
}

/* ===== 6. Search & Navigation ===== */
function searchAll(keyword){
  const k = (keyword || '').toLowerCase();
  const filtered = !k ? rows : rows.filter(r =>
    ['Instrument','Material','Product Name','Type'].some(key => 
      String(r[key] ?? '').toLowerCase().includes(k)
    )
  );
  renderTable(filtered);
}

function goBack(){ 
  if (document.referrer) history.back(); 
  else location.href = 'user-select.html'; 
}
