/* ==========================================================================
   QIAGEN INVENTORY - FINAL MASTER (UI RESTORED + BACKEND V7.1 SYNC)
   ========================================================================== */

const API = "hhttps://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTH & UI (กู้คืนหน้า Login สวยงาม และแก้ข้อ 1) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    // ข้อ 1: แสดงชื่อผู้ใช้งานที่มุมขวาบน
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user;
};

// ฟังก์ชันสร้าง Overlay สวยงาม (กู้คืน UI ที่หายไป)
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modern-modal-overlay';
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(10px);";
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:350px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.5);">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            if (res.status === 'NEW') { 
                showChangePasswordModal(userVal); // เด้งหน้าต่างเปลี่ยนรหัสถ้าเป็น NEW
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366;">Set New Password</h2>
        <p style="color:#666;">Your account is NEW. Please update security.</p>
        <input type="password" id="new-p1" placeholder="New Password" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold;">Update Now</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

/* ===== 2. SUPERVISOR LOGIN (กู้คืน UI สวยงาม) ===== */
window.goToAdmin = function() {
    showModernModal(`
        <h3 style="color:#003366;">Supervisor System</h3>
        <p>Please enter admin credentials</p>
        <input type="password" id="adm-pass" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <div style="display:flex; gap:10px;">
            <button onclick="document.getElementById('modern-modal-overlay').style.display='none'" style="flex:1; padding:10px; border:none; border-radius:10px;">Cancel</button>
            <button onclick="authAdmin()" style="flex:1; padding:10px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold;">Login</button>
        </div>
    `);
};

window.authAdmin = function() {
    const p = document.getElementById('adm-pass').value;
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else { alert("❌ Incorrect Password"); }
};

/* ===== 3. DATA & HISTORY (แก้ข้อ 2: History Undefined และข้อ 3: Show All) ===== */
window.loadStockData = async function(mode) {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res && res.success) {
        window.allRows = res.data;
        if (mode === 'supervisor') renderStaffAudit(res.data);
        else renderTable(res.data, mode); // ข้อ 3: แสดงข้อมูล Show All
    }
};

window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success && res.data) {
            // ข้อ 2: Mapping ข้อมูลให้ตรงกับหลังบ้าน (Date=0, Mat=1, Prod=3, Type=4, Name=6, WO=7)
            container.innerHTML = res.data.map(row => `
                <tr>
                    <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                    <td><b>${row[1] || ''}</b></td>
                    <td>${row[3] || ''}</td>
                    <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                    <td><span style="background:#eee; padding:3px 8px; border-radius:5px;">${row[4] || ''}</span></td>
                </tr>`).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">Error</td></tr>'; }
};

/* ===== 4. STAFF MANAGEMENT (แก้ข้อ 4: Reset Password และข้อ 5: WO Width) ===== */
// แก้ข้อ 4: ใช้ action=setpassword ตาม Backend 7.1
window.resetStaffPassword = async function(name) {
    const newPass = prompt(`Set New Password for ${name}:`, "1234");
    if (!newPass) return;
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) alert(`✅ Reset ${name} Success!`);
    } catch (e) { alert("❌ Failed"); }
};

// แก้ข้อ 5: ขยายช่อง WO# เป็น 150px
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
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:150px; padding:5px; border-radius:5px; border:1px solid #ccc;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html;
};

/* ===== 5. TRANSACTIONS ===== */
window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Done"); loadStockData('supervisor'); }
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
            <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="execute('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;">USE</button>` : 
                  mode === 'return' ? `<button onclick="execute('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

window.execute = async function(t, m, q) {
    const u = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${t}&user=${encodeURIComponent(u)}&material=${encodeURIComponent(m)}&qty=${q}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(t); }
};

window.handleDeduct = async function(m) {
    const u = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + m)?.value;
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(u)}&material=${encodeURIComponent(m)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Done"); loadStockData('deduct'); }
};

window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Not Found";
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Stock Added"); loadStockData('supervisor'); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
