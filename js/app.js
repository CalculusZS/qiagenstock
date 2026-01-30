const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];

const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== 1. Authentication & Navigation ===== */
window.login = function() {
  const pass = (qs('password')?.value || '').trim();
  if (pass === PASSWORD) {
    location.href = 'user-select.html';
  } else {
    alert('รหัสผ่านไม่ถูกต้อง');
  }
};

function supAuth(p){ 
  if(p === SUP_PASSWORD){ 
    sessionStorage.setItem('isSupervisor','1'); 
    return true; 
  } 
  return false; 
}

function goBack(){ 
  if (document.referrer) history.back(); 
  else location.href = 'user-select.html'; 
}

/* ===== 2. Data Loading (ส่วนที่ทำให้ชื่อขึ้น) ===== */

// ดึงรายชื่อจากคอลัมน์ใน Google Sheets
async function loadUsers() {
  try {
    const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
    if (res.success) return res.users; 
    console.error("Server error:", res.msg);
    return [];
  } catch (e) {
    console.error("Fetch error:", e);
    return [];
  }
}

// ดึงข้อมูลสต็อก
async function loadAllWithSchema(){
  try {
    const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
    if(res.success) {
      rows = res.rows;
      if (qs('data')) renderTable(rows);
      if (qs('materialSel')) renderSelect(rows);
    }
  } catch(e) { console.error("Load data failed", e); }
}

/* ===== 3. Transactions (เบิก/คืน) ===== */
async function transactionV2({type, material, qty, user}){
  const url = `${API}?action=${type}&password=${PASSWORD}&material=${material}&qty=${qty}&user=${user}`;
  return await fetch(url).then(r => r.json());
}

/* ===== 4. Supervisor Functions (เติม/ตัดสต็อก) ===== */
async function supAddStock(material, qty){
  const url = `${API}?action=sup_add_stock&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${material}&qty=${qty}`;
  return await fetch(url).then(r => r.json());
}

async function supSetUserQty({ material, user, qty, status = 'SET' }){
  const url = `${API}?action=sup_set_user_qty&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${material}&user=${user}&qty=${qty}&status=${status}`;
  return await fetch(url).then(r => r.json());
}

/* ===== 5. UI Renderers ===== */
function renderTable(list){
  const tb = qs('data'); if(!tb) return;
  tb.innerHTML = list.map(r => `
    <tr>
      <td>${r.Instrument || ''}</td>
      <td><b>${r.Material}</b></td>
      <td>${r['Product Name'] || ''}</td>
      <td>${r.Type || ''}</td>
      <td style="color:blue; font-weight:bold;">${r['0243'] || 0}</td>
    </tr>
  `).join('');
}

function renderSelect(list){
  const sel = qs('materialSel'); if(!sel) return;
  sel.innerHTML = '<option value="">-- เลือกอะไหล่ --</option>' + 
    list.map(r => `<option value="${r.Material}">${r.Material} | ${r['Product Name']}</option>`).join('');
}

function searchAll(keyword){
  const k = (keyword || '').toLowerCase();
  const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k)));
  renderTable(filtered);
}
