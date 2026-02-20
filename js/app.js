/* ==========================================================================
   QIAGEN INVENTORY - ABSOLUTE RESTORE VERSION
   --------------------------------------------------------------------------
   - RESTORED: Original Password Modal (p1, p2) from app(24).js
   - RESTORED: Action Buttons (Colors & Layout)
   - FIXED: PK -> Phurilap Mapping & User Display
   - FIXED: History.html undefined error
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// ตารางเชื่อมตัวย่อเป็นชื่อเต็มเพื่อโชว์ในระบบ
const USER_MAP = {
    'KM': 'Kitti',
    'TK': 'Tatchai',
    'PSO': 'Parinyachat',
    'PK': 'Phurilap',
    'PST': 'Penporn',
    'PA': 'Phuriwat'
};

window.allRows = []; 

/* ===== 1. AUTH & USER DISPLAY (Fix: Logged in as) ===== */
window.checkAuth = function() {
    const userKey = sessionStorage.getItem('userKey'); 
    const userFull = USER_MAP[userKey] || userKey;
    
    if (!userKey && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    const updateUI = () => {
        // อัปเดตชื่อในทุกหน้า (Withdraw, Return, Deduct)
        const displayIds = ['user_display', 'userName', 'display_user', 'username'];
        displayIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && userKey) el.innerText = userFull;
        });
    };

    updateUI();
    window.addEventListener('load', updateUI);
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('userKey', userKey);
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userKey);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. DATA RENDERING (Fix: Showall) ===== */
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
    const userKey = sessionStorage.getItem('userKey');
    
    tbody.innerHTML = data.map(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[userKey] || 0);
        
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return '';
        const displayQty = (mode === 'withdraw' || mode === 'all') ? s0243 : sUser;

        return `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;border-radius:5px;border:1px solid #ccc;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border:none;border-radius:8px;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border:none;border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

/* ===== 3. PASSWORD MODAL (RESTORED FROM APP 24) ===== */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay') || document.createElement('div');
    overlay.id = 'modern-modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center;";
    document.body.appendChild(overlay);
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:360px; text-align:center;">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366;">Set New Password</h2>
        <input type="password" id="new-p1" placeholder="New Password" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; width:100%; cursor:pointer;">Update</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

/* ===== 4. HISTORY (Fixed Undefined) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data') || document.getElementById('list');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success && res.data) {
            container.innerHTML = res.data.map(row => `
                <tr>
                    <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                    <td><b>${row[1] || ''}</b></td>
                    <td>${row[3] || ''}</td>
                    <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                    <td><span style="background:#eee; padding:3px 8px; border-radius:5px; font-size:12px;">${row[4] || ''}</span></td>
                </tr>`).join('');
        }
    } catch (e) { console.error(e); }
};

/* ===== 5. OTHER OPTIONS ===== */
window.goToAdmin = function() {
    const p = prompt("Supervisor Password:");
    if (p === SUP_PASSWORD) { sessionStorage.setItem('userKey', 'Supervisor'); window.location.href = 'supervisor.html'; }
};

window.handleDeduct = async function(mat) {
    const userKey = sessionStorage.getItem('userKey');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('deduct'); }
};

window.executeAction = async function(type, mat, qty) {
    const userKey = sessionStorage.getItem('userKey');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
