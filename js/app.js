const API = "https://script.google.com/macros/s/AKfycbwG6Hm-9nLBTV_OC5iq_9KC_zl0cV9DHcddz39qN1dAuDl_cEmd0OX9UU6WNimAoPsAjQ/exec";
const PASSWORD = "Service";
let materials = [];

function loadAll() {
  fetch(`${API}?action=list&password=${PASSWORD}`)
    .then(r => r.json())
    .then(res => {
      if (!res.success) return alert("โหลดข้อมูลไม่สำเร็จ");
      materials = res.data;
      render(materials);
      loadSelect(materials);
    });
}

function render(list) {
  const tb = document.getElementById("data");
  tb.innerHTML = list.map(m => `
    <tr>
      <td>${m.code}</td>
      <td>${m.name}</td>
      <td>${m.qty}</td>
    </tr>
  `).join("");
}

function loadSelect(list) {
  const sel = document.getElementById("material");
  sel.innerHTML = list.map(m =>
    `<option value="${m.code}">${m.code} - ${m.name}</option>`
  ).join("");
}

function searchMaterial(k) {
  k = k.toLowerCase();
  render(materials.filter(m =>
    m.code.toLowerCase().includes(k) ||
    m.name.toLowerCase().includes(k)
  ));
}

function transaction(type) {
  const code = material.value;
  const qty  = document.getElementById("qty").value;

  fetch(`${API}?action=${type}&code=${code}&qty=${qty}&password=${PASSWORD}`)
    .then(r => r.json())
    .then(res => {
      if (!res.success) return alert(res.msg);
      alert("สำเร็จ");
      loadAll();
    });
}

function logout() {
  location.href = "index.html";
}

loadAll();
