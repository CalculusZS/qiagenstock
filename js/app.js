// ====== CONFIG ======
const API = "https://script.google.com/macros/s/AKfycbwG6Hm-9nLBTV_OC5iq_9KC_zl0cV9DHcddz39qN1dAuDl_cEmd0OX9UU6WNimAoPsAjQ/exec";
const PASSWORD = "Service"; // หมายเหตุ: โปรดักชันควรจำกัดการเข้าถึง/ไม่ hard-code
let materials = [];

// ====== HELPERS ======
function qs(id){ return document.getElementById(id); }
function numberOr0(x){ const n = Number(x); return Number.isFinite(n) ? n : 0; }

// ====== RENDERING ======
function render(list){
  const tb = qs("data");
  if(!tb) return; // บางหน้าไม่มีตาราง
  tb.innerHTML = list.map(m => `
    <tr>
      <td>${m.code ?? ""}</td>
      <td>${m.name ?? ""}</td>
      <td class="num">${m.qty ?? 0}</td>
    </tr>
  `).join("");
}

function loadSelect(list){
  const sel = qs("material");
  if(!sel) return;
  sel.innerHTML = list.map(m =>
    `<option value="${m.code}">${m.code} - ${m.name}</option>`
  ).join("");
}

// ====== DATA LOADING ======
function loadAll(){
  fetch(`${API}?action=list&password=${PASSWORD}`)
    .then(r => r.json())
    .then(res => {
      if(!res.success) return alert("โหลดข้อมูลไม่สำเร็จ");
      materials = Array.isArray(res.data) ? res.data : [];
      render(materials);
      loadSelect(materials);
    })
    .catch(() => alert("เครือข่ายขัดข้อง กรุณาลองใหม่"));
}

// ====== SEARCH ======
function searchMaterial(k){
  k = (k || "").toLowerCase();
  const filtered = !k ? materials : materials.filter(m =>
    (m.code || "").toLowerCase().includes(k) ||
    (m.name || "").toLowerCase().includes(k)
  );
  // อัปเดตทั้งตารางและ select (หน้าไหนมีก็จะทำงาน)
  render(filtered);
  loadSelect(filtered);
}

// ====== TRANSACTION ======
function transaction(type){
  const btn = document.getElementById('btnConfirm') || this;
  if(btn && btn.disabled) return;

  const sel = qs("material");
  const code = sel ? sel.value : "";
  const qty  = numberOr0(qs("qty")?.value);

  if(!code){ alert("กรุณาเลือกอะไหล่"); return; }
  if(!(qty > 0)){ alert("กรุณาใส่จำนวนมากกว่า 0"); return; }

  if(btn) btn.disabled = true;

  fetch(`${API}?action=${type}&code=${encodeURIComponent(code)}&qty=${qty}&password=${PASSWORD}`)
    .then(r => r.json())
    .then(res => {
      if(!res.success) return alert(res.msg || "ทำรายการไม่สำเร็จ");
      alert("สำเร็จ");
      loadAll();
      if(qs("qty")) qs("qty").value = "";
      if(sel) sel.selectedIndex = 0;
    })
    .catch(() => alert("เครือข่ายขัดข้อง กรุณาลองใหม่"))
    .finally(() => { if(btn) btn.disabled = false; });
}

// ====== NAV ======
function logout(){ location.href = "index.html"; }

// ====== COMPAT (กัน error หน้าเก่า) ======
function loadMaterials(){ loadAll(); }
// ====== SIMPLE LOGIN (Demo) ======
// ใช้ร่วมกับค่าคงที่ PASSWORD ในไฟล์นี้ (ตอนนี้คือ "Service")
// *คำเตือน*: โปรดอย่าใช้กับระบบโปรดักชันโดยไม่ตรวจสอบฝั่งเซิร์ฟเวอร์
function login(){
  const input = document.getElementById('password');
  const pass = (input?.value || '').trim();

  if(pass === PASSWORD){
    // เข้าสู่ระบบสำเร็จ -> ไปหน้าเมนูหลัก (ปรับปลายทางได้ตามต้องการ)
    location.href = 'menu.html';
  }else{
    alert('รหัสผ่านไม่ถูกต้อง');
    input?.focus();
  }
}
