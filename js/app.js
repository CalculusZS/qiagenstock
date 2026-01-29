const API_URL =
"https://script.google.com/macros/s/AKfycbzKLZGMyl6mKzTfOhbmtyflEt4_wnoV9Xvp7-MLNzT7kkyiBlH6sNOOLy3zzIjZjdm4/exec";

let MATERIALS = [];

// ===== LOGIN =====
function login() {
  const pwd = document.getElementById("password").value;
  fetch(`${API_URL}?action=login&password=${pwd}`)
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        localStorage.setItem("login", "1");
        location.href = "user.html";
      } else alert("Password ไม่ถูกต้อง");
    });
}

function logout() {
  localStorage.clear();
  location.href = "index.html";
}

// ===== LOAD MATERIAL =====
function loadMaterials() {
  fetch(`${API_URL}?action=list`)
    .then(r => r.json())
    .then(data => {
      MATERIALS = data;
      renderMaterialDropdown(data);
    });
}

function renderMaterialDropdown(list) {
  const s = document.getElementById("material");
  s.innerHTML = "";
  list.forEach(m => {
    const o = document.createElement("option");
    o.value = m.code;
    o.textContent = `${m.code} | ${m.name} | Stock:${m.qty}`;
    s.appendChild(o);
  });
}

// ===== SEARCH =====
function searchMaterial(k) {
  const key = k.toLowerCase();
  renderMaterialDropdown(
    MATERIALS.filter(m =>
      m.code.toLowerCase().includes(key) ||
      m.name.toLowerCase().includes(key)
    )
  );
}

// ===== TRANSACTION =====
function transaction(type) {
  const code = material.value;
  const qty  = qtyInput = document.getElementById("qty").value;

  if (!code || qty <= 0) return alert("กรอกข้อมูลให้ครบ");

  fetch(`${API_URL}?action=${type}&code=${code}&qty=${qty}`)
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        alert("สำเร็จ");
        loadMaterials();
        loadAll();
      } else alert(res.msg);
    });
}

// ===== LOAD TABLE =====
function loadAll() {
  fetch(`${API_URL}?action=list`)
    .then(r => r.json())
    .then(data => {
      const tb = document.getElementById("data");
      tb.innerHTML = "";
      data.forEach(r => {
        tb.innerHTML += `
          <tr class="${r.qty<=0?'low':''}">
            <td>${r.code}</td>
            <td>${r.name}</td>
            <td>${r.qty}</td>
          </tr>`;
      });
    });
}
