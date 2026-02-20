/* ==========================================================================
   QIAGEN INVENTORY - MASTER RESTORE (ENGLISH CODE)
   --------------------------------------------------------------------------
   1. FIXED: user_display showing on Withdraw/Return/Deduct pages
   2. FIXED: Showall.html displaying all central stock data
   3. FIXED: history.html "undefined" error (Corrected Column Mapping)
   4. FIXED: New User login & Force Password Change modal
   5. FIXED: Audit WO# width expanded
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. MODAL SYSTEM (For Login & New User) ===== */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modern-modal-overlay';
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(10px); font-family:sans-serif;";
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:360px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.5);">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

/* ===== 2. AUTHENTICATION (Fix Issues 2, 3, 4: User Display) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    // If not logged in, redirect to index
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    // Update name on the top-right (ID must be 'user_display' in HTML)
    const display = document.getElementById('user_display');
    if (display && user) {
        display.innerText = user;
    }
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
            sessionStorage.setItem('selectedUser', res.fullName);
            // Check if status is NEW
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366;">Set New Password</h2>
        <p>Please update your temporary password.</p>
        <input type="password" id="new-p1" placeholder="New Password" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; width:100%;">Update</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

/* ===== 3. DATA & TABLE RENDERING (Fix Issue 1: Show All) ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') {
                renderStaffAudit(res.data);
            } else {
                renderTable(res.data, mode);
            }
        }
    } catch (e) { console.error("Error loading data", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    
    tbody.innerHTML = data.map(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        
        // Logic for Show All (mode 'all') must show everything regardless of qty
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return '';
        
        return `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

/* ===== 4. HISTORY (Fix Issue 5: undefined) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success && res.data) {
            // Mapping: 0=Date, 1=Material, 3=Product Name, 4=Type, 7=Work Order
            container.innerHTML = res.data.map(row => `
                <tr>
                    <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                    <td><b>${row[1] || ''}</b></td>
                    <td>${row[3] || ''}</td>
                    <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                    <td><span style="background:#eee; padding:3px 8px; border-radius:5px; font-size:12px;">${row[4] || ''}</span></td>
                </tr>`).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">Error</td></tr>'; }
};

/* ===== 5. SUPERVISOR & AUDIT ===== */
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
                    <td align="center">${staff}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:140px; padding:8px; border-radius:5px; border:1px solid #ccc;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html;
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`New Password for ${name}:`, "1234");
    if (!newPass) return;
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert("✅ Reset Success!");
};

/* ===== 6. CORE OPERATIONS ===== */
window.handleDeduct = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('deduct'); }
};

window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('supervisor'); }
};

window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// RUN INITIAL CHECK
window.checkAuth();
