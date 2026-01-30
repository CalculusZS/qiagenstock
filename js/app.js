// ===== CONFIG =====
const API = "https://script.google.com/macros/s/AKfycby8cW6GDzhBZ7_4d33vr2ZtzElt8KPQC_dGd26nZTwch2__IAzg1QYJHGcmPjVanMtsFQ/exec";   // <<== ใส่ URL Web App จริง
const PASSWORD = "Service";

let SCHEMA = {};     // จะ map index ของ header ตามชื่อ
let rows = [];       // เก็บข้อมูลดิบจาก API (array of objects)

// ===== UTIL =====
const qs = id => document.getElementById(id);
function getQS(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}
function resolveUser(){
  return getQS('user') || sessionStorage.getItem('selectedUser') || '';
}

// ===== UI BUILDERS =====
function renderTable(list){
  const tb = qs('data');
  if(!tb) return;
  tb.innerHTML = list.map(r => `
    <tr>
      <td>${r.Instrument ?? ''}</td>
      <td>${r.Material ?? ''}</td>
      <td>${r['Product Name'] ?? ''}</td>
      <td>${r.Type ?? ''}</td>
      <td class="num">${r['0243'] ?? 0}</td>
    </tr>
  `).join('');
}

function renderSelect(list){
  const sel = qs('materialSel');
  if(!sel) return;
  sel.innerHTML = list.map(r => `
    <option value="${r.Material}">${r.Material} - ${r['Product Name'] ?? ''}</option>
  `).join('');
}

// ===== API CALLS =====
async function loadUsers(){
  const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
  const res = await fetch(url).then(r => r.json());
  if(!res.success) { alert(res.msg || 'โหลดผู้ใช้ไม่สำเร็จ'); return []; }
  // res.users = [{header:"ชื่อผู้ใช้", colIndex:12}, ...]
  return res.users;
}

// โหลดข้อมูลทั้งหมด + schema จาก header
async function loadAllWithSchema(){
  const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
  const res = await fetch(url).then(r => r.json()).catch(() => ({success:false}));
  if(!res?.success){ alert(res.msg || 'โหลดข้อมูลไม่สำเร็จ'); return; }
  SCHEMA = res.schema;      // { Instrument:0, Material:1, ... }
  rows   = res.rows || [];  // array of objects keyed by header

  renderTable(rows);
  renderSelect(rows);
}

// ค้นหาเฉพาะคอลัมน์ B (Material)
function searchByMaterial(keyword){
  const k = (keyword || '').toLowerCase();
  const filtered = !k ? rows : rows.filter(r =>
    (r.Material || '').toLowerCase().includes(k)
  );
  renderTable(filtered);
  renderSelect(filtered);
}

// ทำธุรกรรม (withdraw/return) พร้อมผู้ใช้
async function transactionV2({type, material, qty, user}){
  const btn = qs('btnConfirm');
  if(btn) btn.disabled = true;

  const url = `${API}?action=${encodeURIComponent(type)}&password=${encodeURIComponent(PASSWORD)}&material=${encodeURIComponent(material)}&qty=${encodeURIComponent(qty)}&user=${encodeURIComponent(user)}`;
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
// ทำให้ login เป็นฟังก์ชัน global เรียกได้จาก onclick ใน HTML
window.login = function () {
  const input = document.getElementById('password');
  const pass = (input?.value || '').trim();

  // ใช้รหัสเดียวกับที่กำหนดใน app.js (ตัวอย่าง: "Service")
  if (pass === PASSWORD) {
    // เข้าสู่ระบบสำเร็จ -> ไปหน้าเมนู (เปลี่ยนปลายทางได้)
    location.href = 'menu.html';
  } else {
    alert('รหัสผ่านไม่ถูกต้อง');
    input?.focus();
  }
};
