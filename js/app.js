const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; // เก็บข้อมูลสต็อกทั้งหมด

// Helper ฟังก์ชันสำหรับดึง Element
const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== 2. Login & Authentication ===== */
window.login = function() {
  const passField = qs('password');
  const passValue = (passField?.value || '').trim();
  if (passValue === PASSWORD) {
    location.href = 'user-select.html';
  } else {
    alert('รหัสผ่านไม่ถูกต้อง');
  }
};

// ตรวจสอบรหัสผ่าน Supervisor
function supAuth(p){ 
  if(p === SUP_PASSWORD){ 
    sessionStorage.setItem('isSupervisor','1'); 
    return true; 
  } 
  return false; 
}

/* ===== 3. Data Loading (หัวใจหลักที่ทำให้รายชื่อและข้อมูลขึ้น) ===== */

// ดึงรายชื่อผู้ใช้งาน (Whitelist) มาสร้างปุ่ม
async function loadUsers() {
  try {
    const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
    const res = await fetch(url).then(r => r.json());
    return res.success ? res.users : [];
  } catch (e) {
    console.error("Error loading users:", e);
    return [];
  }
}

// ดึงข้อมูลสต็อกทั้งหมด
async function loadAllWithSchema(){
  try {
    const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
    const res = await fetch(url).then(r => r.json());
    if(!res.success){ console.error(res.msg); return; }
    
    rows = res.rows || [];
    // แสดงผลในหน้าที่มีตาราง (Withdraw/Return/All)
    if (qs('data')) renderTable(rows);
    // แสดงผลใน Dropdown เลือกอะไหล่
    if (qs('materialSel')) renderSelect(rows);
    
    return rows;
  } catch(e) {
    console.error('Error loading data:', e);
  }
}

/* ===== 4. User Transactions (เบิก/คืน) ===== */
async function transactionV2({type, material, qty, user}){
  try {
    const url = `${API}?action=${type}`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&user=${encodeURIComponent(user)}`;
    return await fetch(url).then(r => r.json());
  } catch(e) {
    return { success: false, msg: String(e) };
  }
}

/* ===== 5. Supervisor Functions (เติมสต็อก/หักยอดคนถือ) ===== */

// เติมอะไหล่เข้าสต็อกกลาง (0243)
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

// หักยอดที่บุคคลถืออยู่ (Deduct Used) หรือแก้ไขยอด
async function supSetUserQty({ material, user, qty, status = 'SET' }){
  try {
    const url = `${API}?action=sup_set_user_qty`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&user=${encodeURIComponent(user)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&status=${encodeURIComponent(status)}`;
    return await fetch(url).then(r => r.json());
  } catch(e) { return { success:false, msg:String(e) }; }
}

/* ===== 6. UI Renderers & Search ===== */

function renderTable(list){
  const tb = qs('data'); if(!tb) return;
  tb.innerHTML = list.map(r => `
    <tr>
      <td>${r.Instrument || ''}</td>
      <td><b>${r.Material || ''}</b></td>
      <td>${r['Product Name'] || ''}</td>
      <td>${r.Type || ''}</td>
      <td style="color:var(--accent); font-weight:bold;">${r['0243'] || 0}</td>
    </tr>
  `).join('');
}

function renderSelect(list){
  const sel = qs('materialSel'); if(!sel) return;
  sel.innerHTML = '<option value="">-- เลือก Material --</option>' + 
    list.map(r => `<option value="${r.Material}">${r.Material} | ${r['Product Name']}</option>`).join('');
}

function searchAll(keyword){
  const k = (keyword || '').toLowerCase();
  const filtered = !k ? rows : rows.filter(r => 
    Object.values(r).some(v => String(v).toLowerCase().includes(k))
  );
  renderTable(filtered);
}

function goBack(){ 
  if (document.referrer) history.back(); 
  else location.href = 'user-select.html'; 
}
// --- NAVIGATION ---
function goBack(){ if (document.referrer) history.back(); else location.href = 'user-select.html'; }
function supAuth(p){ if(p === SUP_PASSWORD){ sessionStorage.setItem('isSupervisor','1'); return true; } return false; }
