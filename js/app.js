/* ========================================================================== 
   QIAGEN INVENTORY - ULTIMATE MASTER (ALL FUNCTIONS RESTORED + FIXES)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

window.allRows = [];

/* ===== 1. AUTH & FORCE NAME DISPLAY (แก้ปัญหาชื่อไม่โชว์) ===== */
window.checkAuth = function() {
  const userKey = sessionStorage.getItem('userKey');
  let selectedUser = sessionStorage.getItem('selectedUser');

  // ถ้า Session หลุดหรือเปลี่ยน User ให้ดึงจาก MAP เสมอ
  if (userKey && (!selectedUser || selectedUser === 'null')) {
    selectedUser = USER_MAP[userKey] || userKey;
    sessionStorage.setItem('selectedUser', selectedUser);
  }

  if (!selectedUser && !window.location.pathname.includes('index.html')) {
    window.location.replace('index.html');
    return;
  }

  // ฟังก์ชันยัดชื่อลงทุก ID ที่มีในทุกไฟล์ HTML (current-user, user_display ฯลฯ)
  const render = () => {
    const ids = ['user_display', 'current-user', 'userName', 'display_user', 'logged_in_as'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && selectedUser) el.innerText = selectedUser;
    });
  };
  render();
  setTimeout(render, 500); // กันพลาดสำหรับเครื่องที่เน็ตช้า
};

/* ===== 2. DATA LOADING & STOCK LOGIC (แก้ปัญหาหน้า Showall/Withdraw) ===== */
window.loadStockData = async function(passedMode) {
  try {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res && res.success) {
      window.allRows = res.data;
      
      // ตรวจหาโหมดการแสดงผลจากชื่อไฟล์โดยตรง (แม่นยำกว่าส่งค่า parameter)
      const path = window.location.pathname.toLowerCase();
      let mode = passedMode;
      if (path.includes('showall')) mode = 'all';
      else if (path.includes('withdraw')) mode = 'withdraw';
      else if (path.includes('return')) mode = 'return';
      else if (path.includes('supervisor')) mode = 'supervisor';

      if (mode === 'supervisor') {
        renderStaffAudit(res.data);
      } else {
        renderTable(res.data, mode);
      }
    }
  } catch (e) { console.error("Load Error:", e); }
};

window.renderTable = function(data, mode) {
  const tbody = document.getElementById('data');
  if (!tbody) return;

  const selectedUser = sessionStorage.getItem('selectedUser');
  const userKey = sessionStorage.getItem('userKey');

  tbody.innerHTML = data.map(item => {
    const s0243 = Number(item['0243'] || 0);
    const sUser = Number(item[selectedUser] || item[userKey] || 0);

    // เลือกจำนวนสต็อกที่จะแสดง
    let displayQty = (mode === 'all' || mode === 'withdraw') ? s0243 : sUser;

    // เงื่อนไขการซ่อนบรรทัด (ถ้าหน้าคืน/ใช้ของ แล้วไม่มีของในมือ ไม่ต้องโชว์)
    if ((mode === 'return' || mode === 'deduct') && sUser <= 0) return '';

    return `
      <tr>
        <td style="padding:12px;">
          <div style="font-weight:bold; color:#1e293b;">${item.Material}</div>
          <div style="font-size:12px; color:#64748b;">${item['Product Name']}</div>
        </td>
        <td align="center" style="font-size:16px; font-weight:bold; color:#003366;">${displayQty}</td>
        <td align="right">
          ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" class="btn-primary" style="background:#003366;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">Withdraw</button>` :
            mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#22c55e;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">Return</button>` :
            mode === 'deduct' ? `<button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">USE</button>` : 
            '<span style="color:#cbd5e1;">●</span>'}
        </td>
      </tr>`;
  }).join('');
};

/* ===== 3. SUPERVISOR & AUDIT FUNCTIONS (ฟังก์ชันเดิมที่ต้องมี) ===== */
window.renderStaffAudit = function(data) {
  const tbody = document.getElementById('staff-data');
  if (!tbody) return;
  let html = '';
  data.forEach(item => {
    STAFF_LIST.forEach(staff => {
      const qty = Number(item[staff] || 0);
      if (qty > 0) {
        html += `<tr>
          <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
          <td><span class="badge-user">${staff}</span></td>
          <td align="center"><b>${qty}</b></td>
          <td align="right">
            <button onclick="handleAuditDeduct('${item.Material}','${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Deduct</button>
          </td>
        </tr>`;
      }
    });
  });
  tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.handleAuditDeduct = async function(mat, staff) {
  const wo = prompt(`Enter WO# for ${staff}:`);
  if (!wo) return;
  const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("✅ Success"); loadStockData('supervisor'); }
};

window.doSupAdd = async function() {
  const mat = document.getElementById('s_mat').value.trim().toUpperCase();
  const qty = document.getElementById('s_qty').value;
  if(!mat) return alert("Please enter Material");
  const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("✅ Stock Added"); loadStockData('supervisor'); }
};

/* ===== 4. CORE OPERATIONS (WITHDRAW, RETURN, USE) ===== */
window.executeAction = async function(type, mat, qty) {
  const user = sessionStorage.getItem('selectedUser');
  const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("✅ Success"); loadStockData(); } else { alert("❌ " + res.msg); }
};

window.handleDeduct = async function(mat) {
  const user = sessionStorage.getItem('selectedUser');
  const wo = prompt("Enter Work Order (WO#):");
  if (!wo) return;
  const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("✅ Success"); loadStockData(); }
};

/* ===== 5. UTILITIES (SEARCH, NAV, LOGOUT) ===== */
window.searchStock = function(query, mode) {
  const q = query.toLowerCase();
  const filtered = window.allRows.filter(r => 
    String(r.Material).toLowerCase().includes(q) || 
    String(r['Product Name']).toLowerCase().includes(q)
  );
  if (mode === 'supervisor') renderStaffAudit(filtered);
  else renderTable(filtered, mode);
};

window.goBack = () => { window.history.back(); };
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// เริ่มทำงาน
window.checkAuth();
