/* ========================================================================== 
   QIAGEN INVENTORY - CUSTOM MASTER CONTROL (SYNC WITH BACKEND V7.1)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.allRows = [];

/* ===== 1. AUTH & LOGIN (FIXED GLOBAL ACCESS) ===== */
window.handleLogin = async function() {
  const uInput = document.getElementById('username-input');
  const pInput = document.getElementById('password-input');
  if (!uInput || !pInput) return;

  const userKey = uInput.value.trim().toUpperCase();
  const passVal = pInput.value.trim();

  // Supervisor Check
  if (passVal === SUP_PASSWORD || userKey === 'SUPERVISOR') {
    sessionStorage.setItem('userKey', 'Supervisor');
    sessionStorage.setItem('selectedUser', 'Supervisor');
    window.location.href = 'supervisor.html';
    return;
  }

  try {
    const url = `${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`;
    const res = await fetch(url).then(r => r.json());

    if (res && res.success) {
      sessionStorage.setItem('userKey', userKey);
      sessionStorage.setItem('selectedUser', res.fullName || USER_MAP[userKey] || userKey);
      
      if (res.status === 'NEW') {
        window.showForcePasswordChange(userKey);
      } else {
        window.location.href = 'main.html';
      }
    } else {
      alert("❌ Login Failed: Incorrect credentials");
    }
  } catch (e) {
    alert("❌ Connection Error");
    console.error(e);
  }
};

window.checkAuth = function() {
  const user = sessionStorage.getItem('selectedUser');
  if (!user && !window.location.pathname.includes('index.html')) {
    window.location.replace('index.html');
    return false;
  }
  // Sync display across all possible IDs in your HTML files
  const ids = ['current-user', 'display-user', 'user_display', 'userName', 'display_user'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = user;
  });
  return true;
};

/* ===== 2. DATA LOADING & RENDERING (FULL UI PRESERVED) ===== */
window.loadStockData = async function(mode) {
  const tbody = document.getElementById('data');
  if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Inventory...</td></tr>';

  try {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res && res.success) {
      window.allRows = res.data;
      window.renderTable(res.data, mode);
    }
  } catch (e) { console.error("Load Error:", e); }
};

window.renderTable = function(data, mode) {
  const tbody = document.getElementById('data');
  if (!tbody) return;

  const user = sessionStorage.getItem('selectedUser');
  const path = window.location.pathname.toLowerCase();
  
  // Logic to determine which stock to show: Central(0243) vs Personal
  const isCentral = path.includes('withdraw') || path.includes('showall') || mode === 'all';

  let html = data.map(item => {
    const qty0243 = Number(item['0243'] || 0);
    const qtyUser = Number(item[user] || 0);
    const displayQty = isCentral ? qty0243 : qtyUser;

    // Filter for Personal stock pages
    if ((path.includes('return') || path.includes('deduct')) && qtyUser <= 0) return '';

    let actionUI = "";
    if (path.includes('withdraw')) {
      actionUI = qty0243 > 0 
        ? `<button onclick="executeAction('withdraw','${item.Material}',1)" class="btn-primary">Withdraw</button>` 
        : `<span style="color:red; font-weight:bold;">OUT OF STOCK</span>`;
    } else if (path.includes('return')) {
      actionUI = `<button onclick="executeAction('return','${item.Material}',1)" class="btn-success">Return</button>`;
    } else if (path.includes('deduct')) {
      // DEDUCT UI: Input WO + Action Button
      actionUI = `
        <div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
          <input type="text" id="wo_${item.Material}" placeholder="Enter WO#" style="width:100px; padding:5px; border-radius:5px; border:1px solid #ccc;">
          <button onclick="handleDeductClick('${item.Material}')" class="btn-danger" style="width:100px;">USE</button>
        </div>`;
    } else if (path.includes('showall')) {
      actionUI = qty0243 > 0 ? `<span style="color:green;">● Available</span>` : `<span style="color:red;">○ Empty</span>`;
    }

    return `
      <tr>
        <td style="padding:12px;">
          <div style="font-weight:bold; color:#003366;">${item.Material}</div>
          <div style="font-size:11px; color:#666;">${item['Product Name'] || ''}</div>
          <div style="font-size:10px; color:#999;">${item['Instrument'] || ''}</div>
        </td>
        <td align="center" style="font-size:18px; font-weight:bold; color:${displayQty > 0 ? '#22c55e' : '#ef4444'};">
          ${displayQty}
        </td>
        <td align="right" style="padding-right:10px;">${actionUI}</td>
      </tr>`;
  }).join('');

  tbody.innerHTML = html || '<tr><td colspan="3" align="center">No items found.</td></tr>';
};

/* ===== 3. TRANSACTION ACTIONS ===== */
window.executeAction = async function(type, mat, qty) {
  const user = sessionStorage.getItem('userKey');
  if (!confirm(`Confirm ${type} for ${mat}?`)) return;

  try {
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) {
      alert("✅ Transaction Successful");
      window.loadStockData();
    }
  } catch (e) { alert("❌ Network Error"); }
};

window.handleDeductClick = async function(mat) {
  const wo = document.getElementById('wo_' + mat).value.trim();
  if (!wo) return alert("❌ Work Order (WO#) is required!");
  
  const user = sessionStorage.getItem('userKey');
  try {
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) {
      alert("✅ Deduct Successful");
      window.loadStockData();
    }
  } catch (e) { alert("❌ Network Error"); }
};

/* ===== 4. SPECIAL FEATURES (HISTORY & PASS CHANGE) ===== */
window.loadHistory = async function() {
  const listDiv = document.getElementById('list');
  if (!listDiv) return;
  listDiv.innerHTML = '<p align="center">Loading History...</p>';
  try {
    const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
    if (res.success) {
      listDiv.innerHTML = res.data.map(row => `
        <div class="history-row" style="display:flex; border-bottom:1px solid #eee; padding:10px; font-size:12px;">
          <div style="flex:1;">${new Date(row[0]).toLocaleString()}</div>
          <div style="flex:1; font-weight:bold;">${row[1]}</div>
          <div style="flex:1; color:#003366;">${row[4]}</div>
          <div style="flex:0.5; text-align:center;">${row[5]}</div>
          <div style="flex:1; text-align:right;">${row[6]}</div>
          <div style="flex:1; text-align:right; color:red; font-weight:bold;">${row[7] || '-'}</div>
        </div>`).join('');
    }
  } catch (e) { console.error(e); }
};

window.showForcePasswordChange = function(userKey) {
  const overlay = document.createElement('div');
  overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:10000;";
  overlay.innerHTML = `
    <div style="background:white; padding:30px; border-radius:15px; text-align:center; width:300px;">
      <h3 style="color:#003366;">Set New Password</h3>
      <input type="password" id="p1" placeholder="New Password" style="width:100%; padding:10px; margin:10px 0; border:1px solid #ddd; border-radius:8px;">
      <input type="password" id="p2" placeholder="Confirm Password" style="width:100%; padding:10px; margin:10px 0; border:1px solid #ddd; border-radius:8px;">
      <button onclick="window.processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:8px;">Update & Login</button>
    </div>`;
  document.body.appendChild(overlay);
};

window.processReset = async function(userKey) {
  const p1 = document.getElementById('p1').value;
  const p2 = document.getElementById('p2').value;
  if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
  const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
  if (res.success) { alert("✅ Password Updated"); window.location.href = 'main.html'; }
};

/* ===== 5. UI UTILITIES ===== */
window.searchStock = function(q, mode) {
  const filtered = window.allRows.filter(r => 
    String(r.Material).toLowerCase().includes(q.toLowerCase()) || 
    String(r['Product Name']).toLowerCase().includes(q.toLowerCase())
  );
  window.renderTable(filtered, mode);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.goBack = () => { window.history.back(); };

// Initialization
window.checkAuth();
