/* ==========================================================================
   QIAGEN INVENTORY - THE FINAL CORRECT VERSION (ENGLISH CODE)
   --------------------------------------------------------------------------
   1. FIXED: showall.html shows all 0243 parts perfectly.
   2. FIXED: withdraw/return/deduct shows FULL USER NAME correctly.
   3. FIXED: history.html has no more "undefined" errors.
   4. FIXED: Supervisor, Add Stock, Reset Pass, and Audit options restored.
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
// Use Full Names because the Google Sheet headers use Full Names
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTH & USER DISPLAY (Fix Issues 2, 3, 4) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser'); // Contains Full Name (e.g. Kitti)
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    
    // Find the display element and show the user's name
    const display = document.getElementById('user_display') || document.getElementById('userName') || document.querySelector('.user-display');
    if (display && user) {
        display.innerText = user;
    }
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userVal = uInput.value.trim().toUpperCase(); // Username: KM, TK
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            // Store FULL NAME (e.g. Kitti) for rendering columns correctly
            sessionStorage.setItem('selectedUser', res.fullName); 
            
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userVal); // Pass username for reset
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. RENDER TABLES (Fix Issue 1: Showall) ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Data Load Error", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('stock-data') || document.querySelector('tbody');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'); // Full Name
    
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0); // Maps perfectly to Kitti, Tatchai columns
        
        // Filtering logic: skip if user has no stock in deduct/return
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        html += `<tr>
            <td style="padding:12px;"><b>${item.Material || '-'}</b><br><small>${item['Product Name'] || ''}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;border-radius:5px;border:1px solid #ccc;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data available</td></tr>';
};

/* ===== 3. HISTORY (Fixing Undefined) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data') || document.querySelector('tbody');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success && res.data) {
            // Correctly map backend output: [0:Date, 1:Mat, 3:Prod, 4:Type, 7:WO]
            container.innerHTML = res.data.map(row => {
                const dateStr = row[0] ? new Date(row[0]).toLocaleString('th-TH') : '-';
                const mat = row[1] || '-';
                const prod = row[3] || '';
                const type = row[4] || '';
                const wo = row[7] || '-'; // Prevents undefined
                
                return `<tr>
                    <td>${dateStr}</td>
                    <td><b>${mat}</b></td>
                    <td>${prod}</td>
                    <td style="color:#ef4444; font-weight:bold;">${wo}</td>
                    <td><span style="background:#eee; padding:3px 8px; border-radius:5px; font-size:12px;">${type}</span></td>
                </tr>`;
            }).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">Error loading history</td></tr>'; }
};

/* ===== 4. SUPERVISOR ACTIONS (ALL OPTIONS RESTORED) ===== */
window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data') || document.querySelector('tbody');
    if (!tbody) return;
    let html = '';
    
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            const qty = Number(item[staff] || 0);
            if (qty > 0) {
                html += `<tr>
                    <td><b>${item.Material || '-'}</b><br><small>${item['Product Name'] || ''}</small></td>
                    <td align="center">${staff}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:150px; padding:8px; border-radius:5px; border:1px solid #ccc;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Material Not Found";
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) return alert("❌ Fill all fields");
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Stock Added Successfully"); loadStockData('supervisor'); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`Set new password for ${name}:`, "1234");
    if (!newPass) return;
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert(`✅ Password for ${name} reset to ${newPass}`);
    else alert(`❌ Failed: ${res.msg || 'User not found'}`);
};

window.goToAdmin = function() {
    showModernModal(`
        <h3 style="color:#003366; margin-top:0;">Supervisor Access</h3>
        <input type="password" id="adm-pass" placeholder="Admin Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="authAdmin()" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Login</button>
        <button onclick="document.getElementById('modern-modal-overlay').style.display='none'" style="margin-top:10px; background:none; border:none; color:#666; cursor:pointer;">Cancel</button>
    `);
};

window.authAdmin = function() {
    if (document.getElementById('adm-pass').value === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else { alert("❌ Incorrect Password"); }
};

/* ===== 5. TRANSACTIONS ===== */
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

/* ===== 6. UI MODALS & SYSTEM LOGOUT ===== */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay') || document.createElement('div');
    overlay.id = 'modern-modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(10px); font-family:sans-serif;";
    document.body.appendChild(overlay);
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:360px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.5);">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366;">Set New Password</h2>
        <input type="password" id="new-p1" placeholder="New Password" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Update</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
    else { alert("❌ Failed: " + res.msg); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
