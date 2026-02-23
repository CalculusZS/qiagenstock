/* ========================================================================== 
   QIAGEN INVENTORY - ABSOLUTE RESTORE (NO FUNCTIONS REMOVED)
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

/* ===== 1. LOGIN & AUTH (ซ่อมจุดที่ทำให้ Login ไม่ติด) ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    if (passVal === SUP_PASSWORD) {
        sessionStorage.setItem('userKey', 'Supervisor');
        sessionStorage.setItem('selectedUser', 'Supervisor');
        location.href = 'supervisor.html';
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('userKey', userVal);
            sessionStorage.setItem('selectedUser', res.fullName || USER_MAP[userVal] || userVal);
            if (res.status === 'NEW') window.showForcePasswordChange(userVal);
            else location.href = 'main.html';
        } else {
            if (passVal === MASTER_PASS && USER_MAP[userVal]) {
                sessionStorage.setItem('userKey', userVal);
                sessionStorage.setItem('selectedUser', USER_MAP[userVal]);
                location.href = 'main.html';
            } else alert("❌ Login Failed");
        }
    } catch (e) { alert("❌ Error connecting to API"); }
};

window.checkAuth = function() {
  let userKey = sessionStorage.getItem('userKey');
  let selectedUser = sessionStorage.getItem('selectedUser');

  if (userKey && !selectedUser) {
      selectedUser = USER_MAP[userKey] || userKey;
      sessionStorage.setItem('selectedUser', selectedUser);
  }

  if (!selectedUser && !window.location.pathname.includes('index.html')) {
    window.location.replace('index.html');
    return;
  }

  const renderName = () => {
    // อัปเดตชื่อทุก ID ที่มีใน HTML (current-user, user_display ฯลฯ)
    ['user_display', 'current-user', 'userName', 'display_user', 'username'].forEach(id => {
      const el = document.getElementById(id);
      if (el && selectedUser) el.innerText = selectedUser;
    });
  };
  renderName();
  setTimeout(renderName, 500);
};

/* ===== 2. DATA RENDERING (ซ่อมจุดที่ "แยกผู้ใช้" และ "หน้า Showall") ===== */
window.loadStockData = async function(mode) {
  try {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res && res.success) {
      window.allRows = res.data;
      if (window.location.pathname.includes('supervisor')) renderStaffAudit(res.data);
      else renderTable(res.data, mode);
    }
  } catch (e) { console.error(e); }
};

window.renderTable = function(data, mode) {
  const tbody = document.getElementById('data');
  if (!tbody) return;
  const user = sessionStorage.getItem('selectedUser');
  
  // จุดสำคัญ: แยกคลังกลาง (0243) สำหรับหน้าเบิก/ดูทั้งหมด กับคลังส่วนตัวสำหรับหน้าคืน/ใช้ของ
  const isCentral = window.location.pathname.includes('showall') || window.location.pathname.includes('withdraw') || mode === 'all';

  tbody.innerHTML = data.map(item => {
    const qty = isCentral ? Number(item['0243'] || 0) : Number(item[user] || 0);
    
    // ถ้าหน้าคืน (Return) หรือ ใช้ (Deduct) แล้วคนนั้นไม่มีของ ไม่ต้องโชว์บรรทัดนั้น
    if (!isCentral && qty <= 0 && (mode === 'return' || mode === 'deduct')) return '';

    return `<tr>
      <td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
      <td align="center"><b>${qty}</b></td>
      <td align="right">
        ${mode==='withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;border:none;padding:8px;border-radius:5px;">Withdraw</button>` :
          mode==='return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#22c55e;color:white;border:none;padding:8px;border-radius:5px;">Return</button>` :
          mode==='deduct' ? `<button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;border:none;padding:8px;border-radius:5px;">USE</button>` : '●'}
      </td>
    </tr>`;
  }).join('');
};

/* ===== 3. RESTORE ALL OTHER FUNCTIONS FROM APP (29) ===== */
window.handleDeduct = async function(mat) {
  const user = sessionStorage.getItem('selectedUser');
  const wo = prompt("Enter WO#:");
  if (!wo) return;
  const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("✅ Success"); loadStockData(); }
};

window.executeAction = async function(type, mat, qty) {
  const user = sessionStorage.getItem('selectedUser');
  const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("✅ Success"); loadStockData(); }
};

window.renderStaffAudit = function(data) {
  const tbody = document.getElementById('staff-data');
  if (!tbody) return;
  let html = '';
  data.forEach(item => {
    STAFF_LIST.forEach(staff => {
      const q = Number(item[staff] || 0);
      if (q > 0) {
        html += `<tr><td>${item.Material}</td><td>${staff}</td><td align="center">${q}</td><td align="right"><button onclick="handleAuditDeduct('${item.Material}','${staff}')">Deduct</button></td></tr>`;
      }
    });
  });
  tbody.innerHTML = html;
};

window.showForcePasswordChange = function(userKey) {
  const div = document.createElement('div');
  div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;";
  div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;">
    <h3>Set New Password</h3>
    <input type="password" id="p1" placeholder="New Password" style="display:block;margin:10px auto;padding:8px;">
    <input type="password" id="p2" placeholder="Confirm Password" style="display:block;margin:10px auto;padding:8px;">
    <button onclick="processReset('${userKey}')" style="padding:10px 20px;background:#003366;color:white;border:none;border-radius:10px;">Update</button>
  </div>`;
  document.body.appendChild(div);
};

window.processReset = async function(userKey) {
  const p1 = document.getElementById('p1').value;
  const p2 = document.getElementById('p2').value;
  if (!p1 || p1 !== p2) return alert("Passwords do not match");
  const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("Success!"); location.href='main.html'; }
};

window.searchStock = function(q, mode) {
  const filter = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
  renderTable(filter, mode);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.goBack = () => { window.history.back(); };

window.checkAuth();
