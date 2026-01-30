// ====== CONFIG ======
const API = "https://script.google.com/macros/s/AKfycbwG6Hm-9nLBTV_OC5iq_9KC_zl0cV9DHcddz39qN1dAuDl_cEmd0OX9UU6WNimAoPsAjQ/exec";
const PASSWORD = "Service"; // เดโมเท่านั้น โปรดอย่า hard-code ในโปรดักชัน
let materials = [];

// ====== HELPERS ======
function qs(id){ return document.getElementById(id); }
function numberOr0(x){ const n = Number(x); return Number.isFinite(n) ? n : 0; }

// ====== LOGIN (จำเป็นสำหรับ index.html) ======
function login(){
  const input = document.getElementById('password');
  const pass = (input?.value || '').trim();
  if(pass === PASSWORD){
    location.href = 'menu.html'; // ปรับปลายทางตามที่ต้องการ
  }else{
    alert('รหัสผ่านไม่ถูกต้อง');
    input?.focus();
  }
}

// ====== RENDER ตาราง ======
function render(list){
  const tb = qs("data");
  if(!tb) return; // หน้า login/เมนูที่ไม่มีตาราง ให้ข้าม
  tb.innerHTML = list.map(m => `
    <tr>
      <td>${m.code ?? ""}</td>
      <td>${m.name ?? ""}</td>
      <td class="num">${m.qty ?? 0}</td>
    </tr>
  `).join("");
}

// ====== เติมรายการใน <select> ======
function loadSelect(list){
  const sel = qs("material");
  if(!sel) return;
  sel.innerHTML = list.map(m =>
    `<option value="${m.code}">${m.code} - ${m.name}</option>`
  ).join("");
}

// ====== ดึงข้อมูลทั้งหมด ======
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

// ====== ค้นหา ======
function searchMaterial(k){
  k = (k || "").toLowerCase();
  const filtered = !k ? materials : materials.filter(m =>
    (m.code || "").toLowerCase().includes(k) ||
    (m.name || "").toLowerCase().includes(k)
  );
  render(filtered);
  loadSelect(filtered);
}

// ====== ทำรายการเบิก/คืน ======
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
