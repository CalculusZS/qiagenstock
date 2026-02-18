/* ==========================================================================
   QIAGEN INVENTORY - UI & LOGIC RESTORE (BEAUTIFUL VERSION)
   - RESTORED: Beautiful Login UI & Modal Overlay
   - RESTORED: Force Password Change for 'NEW' status
   - FIXED: Add Stock Lookup & Supervisor Audit with WO#
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycby8X9GKrYlyBx6JHsTtgsVE85RtnT_iCNEIcefKu9UQszc34bDATxJ7beUHqsHn42c/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. BEAUTIFUL UI MODAL (สร้างหน้ากากดำอัตโนมัติ) ===== */
function createUIOverlay() {
    if (document.getElementById('custom-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'custom-overlay';
    overlay.style = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; justify-content:center; align-items:center; backdrop-filter:blur(8px); font-family:sans-serif;";
    overlay.innerHTML = `
        <div id="modal-content" style="background:white; padding:30px; border-radius:20px; width:350px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div id="modal-body"></div>
        </div>`;
    document.body.appendChild(overlay);
}

// ฟังก์ชันโชว์หน้าต่างเปลี่ยนรหัส (แบบสวยงาม)
window.showChangePasswordModal = function(userKey) {
    createUIOverlay();
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <h2 style="color:#003366; margin-bottom:10px;">Security Update</h2>
        <p style="color:#666; font-size:14px; margin-bottom:20px;">Your password is temporary.<br>Please set a new password.</p>
        <input type="password" id="new-p" placeholder="New Password" style="width:90%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:10px; text-align:center; font-size:16px;">
        <input type="password" id="confirm-p" placeholder="Confirm Password" style="width:90%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center; font-size:16px;">
        <button onclick="processPasswordChange('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Update Password</button>
    `;
    document.getElementById('custom-overlay').style.display = 'flex';
};

window.processPasswordChange = async function(userKey) {
    const p1 = document.getElementById('new-p').value;
    const p2 = document.getElementById('confirm-p').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");

    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            alert("✅ Password changed successfully! Please login again.");
            window.location.reload();
        }
    } catch (e) { alert("❌ Error connecting to server."); }
};

/* ===== 2. LOGIN & AUTH ===== */
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
            if (res.status === 'NEW') { 
                showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 3. SUPERVISOR SYSTEM (ADDS & AUDIT) ===== */
window.goToAdmin = function() {
    createUIOverlay();
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <h3 style="color:#003366; margin-bottom:15px;">Supervisor Access</h3>
        <input type="password" id="adm-p" placeholder="Enter Admin Password" style="width:90%; padding:12px; margin-bottom:15px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <div style="display:flex; gap:10px;">
            <button onclick="document.getElementById('custom-overlay').style.display='none'" style="flex:1; padding:10px; border-radius:10px; border:none;">Cancel</button>
            <button id="adm-login-btn" style="flex:1; padding:10px; background:#003366; color:white; border-radius:10px; border:none; font-weight:bold;">Login</button>
        </div>
    `;
    document.getElementById('custom-overlay').style.display = 'flex';
    document.getElementById('adm-login-btn').onclick = function() {
        if (document.getElementById('adm-p').value === SUP_PASSWORD) {
            sessionStorage.setItem('selectedUser', 'Supervisor');
            window.location.href = 'supervisor.html';
        } else { alert("❌ Incorrect Password"); }
    };
};

// สต็อกกลาง (0243) Lookup ข้อมูลสินค้า
window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Material not found";
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if (!mat || !qty) return alert("❌ Please fill all fields");
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Stock Added!"); loadStockData('supervisor'); }
};

/* ===== 4. AUDIT: MANDATORY WO# ===== */
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
                    <td align="center">${staff}</td><td align="center"><b>${qty}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:70px; padding:5px; border-radius:5px; border:1px solid #ccc;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4">No staff inventory found</td></tr>';
};

window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ Mandatory: Enter WO# before Deduct");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Deducted!"); loadStockData('supervisor'); }
};

/* ===== 5. CORE LOADERS ===== */
window.loadStockData = async function(mode) {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) {
        window.allRows = res.data;
        if (mode === 'supervisor') renderStaffAudit(res.data);
        else renderTable(res.data, mode);
    }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    tbody.innerHTML = data.map(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return '';
        return `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" style="background:#003366;color:white;border:none;padding:8px 12px;border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:4px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444;color:white;border:none;padding:8px 12px;border-radius:8px;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" style="background:#10b981;color:white;border:none;padding:8px 12px;border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) window.location.replace('index.html');
    if (document.getElementById('user_display')) document.getElementById('user_display').innerText = user;
};
createUIOverlay(); // เตรียม Overlay ตั้งแต่โหลด
window.checkAuth();
