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

/* ===== 1. AUTH & FORCE PASSWORD CHANGE ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    if (passVal === SUP_PASSWORD || userKey === 'SUPERVISOR') {
        sessionStorage.setItem('userKey', 'Supervisor');
        sessionStorage.setItem('selectedUser', 'Supervisor');
        location.href = 'supervisor.html';
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', res.fullName || USER_MAP[userKey]);
            if (res.status === 'NEW') showForcePasswordChange(userKey);
            else location.href = 'main.html';
        } else {
            alert("❌ Login Failed");
        }
    } catch (e) { alert("❌ Connection Error"); }
};

function showForcePasswordChange(userKey) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;";
    overlay.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;text-align:center;width:320px;">
            <h3>Set New Password</h3>
            <input type="password" id="new-p1" placeholder="New Password" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:8px;">
            <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:8px;">
            <button onclick="processReset('${userKey}')" style="width:100%;padding:12px;background:#003366;color:white;border:none;border-radius:10px;">Update & Login</button>
        </div>`;
    document.body.appendChild(overlay);
}

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success!"); location.href = 'main.html'; }
};

/* ===== 2. DATA RENDERING (ซ่อมให้โชว์ทุกหน้า) ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Data...</td></tr>';
    
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error:", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    
    // กำหนดว่าหน้าไหนต้องดึง 0243 หรือ ชื่อตัวเอง
    const isCentral = path.includes('withdraw') || path.includes('showall') || mode === 'all';

    let html = data.map(item => {
        const stock0243 = Number(item['0243'] || 0);
        const userStock = Number(item[user] || 0);
        const displayQty = isCentral ? stock0243 : userStock;

        // เงื่อนไขหน้า Return/Deduct: ถ้าพนักงานคนนั้นไม่มีของชิ้นนี้ ให้ซ่อนไปเลย
        if ((path.includes('return') || path.includes('deduct') || mode === 'return' || mode === 'deduct') && userStock <= 0) {
            return '';
        }

        let qtyStyle = "font-weight:bold;";
        let actionBtn = "";

        if (isCentral) {
            if (stock0243 <= 0) {
                qtyStyle += "color:red;";
                actionBtn = path.includes('showall') ? "Empty" : `<span style="color:red; font-size:12px;">OUT OF STOCK</span>`;
            } else {
                actionBtn = path.includes('showall') ? "Available" : `<button onclick="executeAction('withdraw','${item.Material}',1)" class="btn-primary">Withdraw</button>`;
            }
        } else {
            // หน้า Return หรือ Deduct
            if (path.includes('return')) {
                actionBtn = `<button onclick="executeAction('return','${item.Material}',1)" class="btn-success">Return</button>`;
            } else {
                actionBtn = `<button onclick="handleDeduct('${item.Material}')" class="btn-danger">USE</button>`;
            }
        }

        return `<tr>
            <td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center" style="${qtyStyle}">${displayQty}</td>
            <td align="right">${actionBtn}</td>
        </tr>`;
    }).join('');

    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 3. OPERATIONS ===== */
window.handleDeduct = async function(mat) {
    const userKey = sessionStorage.getItem('userKey');
    const wo = prompt("⚠️ Enter WO# before use:");
    if (!wo) return;
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('deduct'); }
};

window.executeAction = async function(type, mat, qty) {
    const userKey = sessionStorage.getItem('userKey');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

/* ===== 4. HISTORY & UI ===== */
window.loadHistory = async function() {
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.map(row => `
                <div style="display:flex; padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                    <div style="flex:1">${new Date(row[0]).toLocaleString()}</div>
                    <div style="flex:1"><b>${row[1]}</b></div>
                    <div style="flex:1">${row[4]}</div>
                    <div style="flex:0.5; text-align:center">${row[5]}</div>
                    <div style="flex:1; text-align:right">${row[6]}</div>
                    <div style="flex:1; text-align:right; color:red;">${row[7] || '-'}</div>
                </div>`).join('');
        }
    } catch (e) { console.error(e); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        location.replace('index.html');
        return;
    }
    // อัปเดตชื่อทุกจุดที่เจอ
    ['user_display', 'current-user', 'userName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = user;
    });
};

window.logout = () => { sessionStorage.clear(); location.replace('index.html'); };
window.goBack = () => { history.back(); };
window.searchStock = function(q, mode) {
    const filter = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(q.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(q.toLowerCase())
    );
    renderTable(filter, mode);
};

window.checkAuth();

window.checkAuth();
