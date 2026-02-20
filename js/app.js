/* ==========================================================================
   QIAGEN INVENTORY - RESTORED TO PREVIOUS WORKING VERSION
   --------------------------------------------------------------------------
   1. FIXED: PK -> Phurilap mapping restored.
   2. FIXED: User display (Logged in as) on all pages.
   3. FIXED: Showall.html displaying 0243 stock data.
   4. KEEP: Original Password Modal & All Supervisor Options from app(24).js
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
const STAFF_LIST = Object.values(USER_MAP);

/* ===== 1. AUTH & USER DISPLAY (Fix: Logged in as) ===== */
window.checkAuth = function() {
    const userKey = sessionStorage.getItem('userKey'); 
    const userFull = sessionStorage.getItem('selectedUser'); 
    
    if (!userKey && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    const updateName = () => {
        // อัปเดตชื่อผู้ใช้ในทุกหน้า (Withdraw, Return, Deduct)
        const displayIds = ['user_display', 'userName', 'display_user', 'username'];
        displayIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && userFull) el.innerText = userFull;
        });
    };

    updateName();
    window.addEventListener('load', updateName);
    setTimeout(updateName, 500);
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const fullName = USER_MAP[userVal] || res.fullName;
            sessionStorage.setItem('userKey', userVal);
            sessionStorage.setItem('selectedUser', fullName); 
            
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. STOCK DATA (Fix: Showall) ===== */
window.loadStockData = async function(mode) {
    try {
        const isShowAll = window.location.pathname.includes('showall.html');
        const fetchMode = isShowAll ? 'all' : mode;

        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (fetchMode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, fetchMode);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('stock-data') || document.querySelector('tbody');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        const displayQty = (mode === 'withdraw' || mode === 'all') ? s0243 : sUser;

        html += `<tr>
            <td style="padding:12px;"><b>${item.Material || '-'}</b><br><small>${item['Product Name'] || ''}</small></td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" class="btn-action" style="background:#003366;color:white;padding:8px 12px;border:none;border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border:none;border-radius:8px;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border:none;border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No Data</td></tr>';
};

/* ===== 3. ORIGINAL MODAL SYSTEM (Restore from app 24) ===== */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modern-modal-overlay';
        overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;justify-content:center;align-items:center;";
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div style="background:white;padding:30px;border-radius:25px;width:360px;text-align:center;">${contentHtml}</div>`;
}

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366;">Set New Password</h2>
        <input type="password" id="new-p1" placeholder="New Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;text-align:center;">
        <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #ddd;border-radius:10px;text-align:center;">
        <button onclick="processReset('${userKey}')" style="width:100%;padding:12px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;">Update</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

/* ===== 4. ALL OTHER OPTIONS (History, Supervisor, Audit) ===== */
window.loadHistory = async function() {
    const tbody = document.getElementById('history-data') || document.querySelector('tbody');
    const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) {
        tbody.innerHTML = res.data.map(row => `<tr><td>${new Date(row[0]).toLocaleString()}</td><td>${row[1]}</td><td>${row[3]}</td><td style="color:red">${row[7]||''}</td><td>${row[4]}</td></tr>`).join('');
    }
};

window.goToAdmin = function() {
    const p = prompt("Admin Password:");
    if (p === SUP_PASSWORD) { sessionStorage.setItem('selectedUser', 'Supervisor'); window.location.href = 'supervisor.html'; }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
