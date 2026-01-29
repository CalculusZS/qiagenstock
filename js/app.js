// ================= CONFIG =================
const API_URL = "https://script.google.com/macros/s/AKfycbzf3GIBDtYuiJD_T7C6WvFKD1BGrdASkDNUC-rkqOPjc-TiVGvERjZiXfiR4HVHDUtAbA/exec";

// ================= GLOBAL =================
let MATERIALS = [];

// ================= LOGIN =================
function login() {
  const pwd = document.getElementById("pwd").value;

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      password: Service
    })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      window.location.href = "user.html";
    } else {
      alert("❌ Password ไม่ถูกต้อง");
    }
  })
  .catch(() => alert("❌ ไม่สามารถเชื่อมต่อระบบได้"));
}

// ================= LOAD MATERIAL =================
function loadMaterials() {
  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getMaterialList" })
  })
  .then(r => r.json())
  .then(res => {
    if (!res.success) {
      alert("โหลดข้อมูลไม่สำเร็จ");
      return;
    }
    MATERIALS = res.data;
    renderMaterialDropdown(MATERIALS);
  });
}

// ================= RENDER DROPDOWN =================
function renderMaterialDropdown(list) {
  const select = document.getElementById("material");
  select.innerHTML = "";

  list.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.material;
    opt.textContent =
      `${item.material} | ${item.product} | Stock: ${item.stock}`;
    select.appendChild(opt);
  });
}

// ================= SEARCH =================
function searchMaterial(keyword) {
  const k = keyword.toLowerCase();
  const filtered = MATERIALS.filter(m =>
    m.material.toLowerCase().includes(k) ||
    m.product.toLowerCase().includes(k)
  );
  renderMaterialDropdown(filtered);
}

// ================= TRANSACTION =================
function transaction(type) {
  const material = document.getElementById("material").value;
  const qty = Number(document.getElementById("qty").value);
  const user = localStorage.getItem("user");

  if (!material || qty <= 0) {
    alert("กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "transaction",
      type: type,
      material: material,
      qty: qty,
      user: user
    })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      alert("✅ ทำรายการสำเร็จ");
      document.getElementById("qty").value = "";
      loadMaterials();
    } else {
      alert("❌ " + res.msg);
    }
  });
}

// ================= LOAD ALL =================
function loadAll() {
  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getAll" })
  })
  .then(r => r.json())
  .then(res => {
    if (!res.success) return;

    const tbody = document.getElementById("data");
    tbody.innerHTML = "";

    res.data.forEach(r => {
      const tr = document.createElement("tr");

      const stockClass = r[7] <= 0 ? "low-stock" : "";

      tr.innerHTML = `
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[2]}</td>
        <td class="${stockClass}">${r[7]}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}
