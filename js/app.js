/* ========================================================================== 
   QIAGEN INVENTORY - ABSOLUTE FIX (SESSION RECOVERY & STOCK MAPPING)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti',
  'TK': 'Tatchai',
  'PSO': 'Parinyachat',
  'PK': 'Phurilap',
  'PST': 'Penporn',
  'PA': 'Phuriwat'
};

window.allRows = [];

/* ===== 1. AUTH & USER DISPLAY (พร้อมระบบแก้ Session ค้าง) ===== */
window.checkAuth = function() {
  let userKey = sessionStorage.getItem('userKey');
  let selectedUser = sessionStorage.getItem('selectedUser');

  // ระบบฟื้นฟู: ถ้ามีแต่รหัส PK แต่ไม่มีชื่อ Phurilap ให้บังคับใส่ชื่อเต็ม
  if (userKey && !selectedUser) {
      selectedUser = USER_MAP[userKey] || userKey;
      sessionStorage.setItem('selectedUser', selectedUser);
  } else if (!userKey && selectedUser) {
      userKey = selectedUser;
      sessionStorage.setItem('userKey', userKey);
  }

  // ถ้าไม่มีการล็อกอินเลย ให้เด้งกลับหน้า index
  if (!selectedUser && !window.location.pathname.includes('index.html')) {
    window.location.replace('index.html');
    return;
  }

  // ฟังก์ชันเขียนชื่อผู้ใช้งานทับลงไป
  const renderName = () => {
    ['user_display', 'userName', 'display_user', 'username', 'logged_in_as'].forEach(id => {
      const el = document.getElementById(id);
      if (el && selectedUser) {
        el.innerText = selectedUser; // จะแสดงชื่อ 'Phurilap'
      }
    });
  };

  renderName();
  window.addEventListener('load', renderName);
  setTimeout(renderName, 500); // ดีเลย์เผื่อหน้าเว็บโหลดช้า
};

window.handleLogin = async function() {
  const uInput = document.getElementById('username-input');
  const pInput = document.getElementById('password-input');
  if (!uInput || !pInput) return;

  const userVal = uInput.value.trim().toUpperCase();
  const passVal = pInput.value.trim();

  try {
    const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());

    if (res && res.success) {
      const fullName = USER_MAP[userVal] || res.fullName || userVal;
      sessionStorage.setItem('userKey', userVal);
      sessionStorage.setItem('selectedUser', fullName);

      if (res.status === 'NEW') {
        window.showChangePasswordModal(userVal);
        return;
      }

      window.location.replace('main.html');
    } else {
      alert("❌ Login Failed");
    }
  } catch (e) {
    alert("❌ Connection Error");
  }
};

/* ===== 2. STOCK DATA & RENDERING (แก้ปัญหาข้อมูลเป็น 0) ===== */
window.loadStockData = async function(mode) {
  try {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());

    if (res && res.success) {
      window.allRows = res.data;
      if (mode === 'supervisor') renderStaffAudit(res.data);
      else renderTable(res.data, mode);
    }
  } catch (e) { console.error(e); }
};

window.renderTable = function(data, mode) {
  const tbody = document.getElementById('data') || document.getElementById('stock-data');
  if (!tbody) return;

  const selectedUser = sessionStorage.getItem('selectedUser'); 
  const userKey = sessionStorage.getItem('userKey'); 
  const isShowAll = window.location.pathname.includes('showall.html');

  tbody.innerHTML = data.map(item => {
    const s0243 = Number(item['0243'] || 0);
    // จุดสำคัญ: ค้นหาสต็อกด้วยชื่อเต็ม (Phurilap) ถ้าไม่เจอลองหาด้วยตัวย่อ (PK)
    const sUser = Number(item[selectedUser] || item[userKey] || 0);  

    if (!isShowAll && (mode === 'deduct' || mode === 'return') && sUser <= 0) return '';

    const displayQty = (isShowAll || mode === 'withdraw') ? s0243 : sUser;

    return `
      <tr>
        <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
        <td align="center"><b>${displayQty}</b></td>
        <td align="right">
          ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;">Withdraw</button>` :
            mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;border:1px solid #ccc;border-radius:5px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;">USE</button></div>` :
            mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;">Return</button>` : '●'}
        </td>
      </tr>`;
  }).join('');
};

/* ===== 3. TRANSACTIONS (ทำงานปกติ) ===== */
window.executeAction = async function(type, mat, qty) {
  const user = sessionStorage.getItem('selectedUser');  
  const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());

  if (res.success) {
    alert("✅ Success");
    loadStockData(type);
  } else {
    alert("❌ Error: " + (res.msg || "Unknown error"));
  }
};

window.handleDeduct = async function(mat) {
  const user = sessionStorage.getItem('selectedUser');  
  const wo = document.getElementById('wo_' + mat)?.value.trim();

  if (!wo) return alert("❌ Enter WO#");

  const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());

  if (res.success) {
    alert("✅ Success");
    loadStockData('deduct');
  } else {
    alert("❌ Error: " + (res.msg || "Unknown error"));
  }
};

/* ===== 4. SUPERVISOR & AUDIT (ทำงานปกติ) ===== */
window.renderStaffAudit = function(data) {
  const tbody = document.getElementById('staff-data');
  if (!tbody) return;

  let html = '';
  const staffs = Object.values(USER_MAP); 

  data.forEach(item => {
    staffs.forEach(sName => {
      const qty = Number(item[sName] || 0);
      if (qty > 0) {
        html += `<tr><td><b>${item.Material}</b></td><td>${sName}</td><td align="center"><b>${qty}</b></td><td align="right"><input type="text" id="audit_wo_${item.Material}_${sName}" placeholder="WO#" style="width:80px;padding:5px;"><button onclick="handleAuditDeduct('${item.Material}','${sName}')" style="background:#ef4444;color:white;border:none;padding:5px 10px;border-radius:5px;margin-left:5px;cursor:pointer;">Deduct</button></td></tr>`;
      }
    });
  });

  tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.handleAuditDeduct = async function(mat, sName) {
  const wo = document.getElementById(`audit_wo_${mat}_${sName}`)?.value.trim();
  if (!wo) return alert("❌ Enter WO#");

  const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(sName)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());

  if (res.success) {
    alert("✅ Success");
    loadStockData('supervisor');
  } else {
    alert("❌ Error: " + (res.msg || "Unknown error"));
  }
};

/* ===== 5. PASSWORD MODAL (หน้าต่างเปลี่ยนรหัสเดิม) ===== */
window.showChangePasswordModal = function(userKey) {
  const overlay = document.createElement('div');
  overlay.id = 'modern-modal-overlay';
  overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;justify-content:center;align-items:center;";

  overlay.innerHTML = `
    <div style="background:white;padding:30px;border-radius:25px;width:360px;text-align:center;">
      <h2 style="color:#003366;">Set New Password</h2>
      <input type="password" id="new-p1" placeholder="New Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;text-align:center;">
      <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #ddd;border-radius:10px;text-align:center;">
      <button onclick="processReset('${userKey}')" style="width:100%;padding:12px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Update</button>
    </div>`;

  document.body.appendChild(overlay);
};

window.processReset = async function(userKey) {
  const p1 = document.getElementById('new-p1').value;
  const p2 = document.getElementById('new-p2').value;

  if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");

  const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());

  if (res.success) {
    alert("✅ Success! Please login.");
    window.location.reload();
  } else {
    alert("❌ Error: " + (res.msg || "Unknown error"));
  }
};

/* ===== 6. HISTORY & OTHERS ===== */
window.loadHistory = async function() {
  const listDiv = document.getElementById('list') || document.getElementById('history-data');
  if (!listDiv) return;
  try {
      const response = await fetch(`${API}?action=gethistory&password=${MASTER_PASS}&t=${Date.now()}`);
      const res = await response.json();
      if (res.success && res.data) {
          const isTable = document.getElementById('history-data') !== null;
          if (isTable) {
              listDiv.innerHTML = res.data.map(row => `
                  <tr>
                      <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                      <td><b>${row[1]}</b></td>
                      <td>${row[3]}</td>
                      <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                      <td><span style="background:#eee; padding:3px 8px; border-radius:5px;">${row[4]}</span></td>
                  </tr>`).join('');
          } else {
              listDiv.innerHTML = res.data.map(item => `
                  <div class="history-row">
                      <div class="col-date">${item['Date and Time']}</div>
                      <div class="col-mat">${item['Material']}</div>
                      <div class="col-inst">${item['Instrument'] || '-'}</div>
                      <div class="col-pname">${item['Product Name']}</div>
                      <div class="col-wo">${item['Work Order'] || '-'}</div>
                      <div class="col-type"><span class="type-tag ${item['Transaction Type']}">${item['Transaction Type']}</span></div>
                      <div class="col-qty">${item['Qty']}</div>
                      <div class="col-user">${item['User']}</div>
                  </div>
              `).join('');
          }
      }
  } catch (e) { console.error(e); }
};

window.goToAdmin = function() {
  const p = prompt("Supervisor Password:");
  if (p === SUP_PASSWORD) {
    sessionStorage.setItem('selectedUser', 'Supervisor');
    window.location.href = 'supervisor.html';
  } else if (p !== null) {
    alert("❌ Incorrect Password");
  }
};

window.logout = () => {
  sessionStorage.clear();
  window.location.replace('index.html');
};

window.checkAuth();
