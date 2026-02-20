/* ==========================================================================
   QIAGEN INVENTORY - FULL MASTER RESTORE (FIXED NEW USER LOGIN)
   --------------------------------------------------------------------------
   1. หน้า Withdraw/Return/Deduct แสดงชื่อผู้ใช้ (Fixed)
   2. History ไม่โชว์ undefined (Fixed Mapping)
   3. หน้า Showall โชว์ข้อมูลครบ (Fixed)
   4. Reset Password ในหน้า Supervisor กดได้จริง (Fixed)
   5. ช่อง Work Order ใน Audit กว้างขึ้น 2 เท่า (Fixed)
   - แก้ไข: ระบบ Force Change Password สำหรับ New User ให้ทำงานได้จริง
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. BEAUTIFUL MODAL SYSTEM (สำหรับเปลี่ยนรหัสและ Login Admin) ===== */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modern-modal-overlay';
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(10px); font-family:sans-serif;";
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:360px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.5); border:1px solid #eee;">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

/* ===== 2. AUTHENTICATION (แก้จุดที่ New User เข้าไม่ได้) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    // ข้อ 1: แสดงชื่อผู้ใช้ที่มุมขวา
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user;
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
            
            // ตรวจสอบสถานะ NEW เพื่อบังคับเปลี่ยนรหัสผ่าน
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { 
            alert("❌ Login Failed: Username หรือ Password ไม่ถูกต้อง"); 
        }
    } catch (e) { 
        alert("❌ Connection Error: ไม่สามารถเชื่อมต่อฐานข้อมูลได้"); 
    }
};

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366; margin-top:0;">Set New Password</h2>
        <p style="color:#666; font-size:14px;">กรุณาตั้งรหัสผ่านใหม่เพื่อเริ่มใช้งาน</p>
        <input type="password" id="new-p1" placeholder="รหัสผ่านใหม่" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:10px; text-align:center; box-sizing:border-box;">
        <input type="password" id="new-p2" placeholder="ยืนยันรหัสผ่านใหม่" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center; box-sizing:border-box;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; width:100%;">Update Password</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ รหัสผ่านไม่ตรงกัน!");
    
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { 
        alert("✅ เปลี่ยนรหัสสำเร็จ! กรุณาเข้าสู่ระบบอีกครั้ง"); 
        window.location.reload(); 
    }
};

/* ===== 3. DATA & HISTORY (แก้ข้อ 2 & 3) ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode); // ข้อ 3: แสดงข้อมูลหน้า Showall
        }
    } catch (e) { console.error(e); }
};

window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success && res.data) {
            // ข้อ 2: ปรับตำแหน่ง Column ให้ตรงกับ Sheets (0=Date, 1=Mat, 3=Product, 7=WO)
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

/* ===== 4. SUPERVISOR ACTIONS (แก้ข้อ 4 & 5) ===== */
window.goToAdmin = function() {
    showModernModal(`
        <h3 style="color:#003366; margin-top:0;">Supervisor Access</h3>
        <input type="password" id="adm-pass" placeholder="Admin Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center; box-sizing:border-box;">
        <button onclick="authAdmin()" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; width:100%;">Login</button>
        <button onclick="document.getElementById('modern-modal-overlay').style.display='none'" style="margin-top:10px; background:none; border:none; color:#666; cursor:pointer;">Cancel</button>
    `);
};

window.authAdmin = function() {
    if (document.getElementById('adm-pass').value === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else { alert("❌ รหัสผ่านไม่ถูกต้อง"); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`ตั้งรหัสผ่านใหม่ให้ ${name}:`, "1234");
    if (!newPass) return;
    // ข้อ 4: ใช้ action=setpassword และ MASTER_PASS เพื่อให้มีสิทธิ์แก้
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) alert(`✅ รีเซ็ตรหัสผ่านของ ${name} สำเร็จ!`);
    } catch (e) { alert("❌ ทำรายการไม่สำเร็จ"); }
};

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
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:150px; padding:8px; border-radius:5px; border:1px solid #ccc;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4">No staff inventory</td></tr>';
};

/* ===== 5. CORE TRANSACTIONS ===== */
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
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ กรุณากรอก WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ตัดสต็อกพนักงานสำเร็จ"); loadStockData('supervisor'); }
};

window.handleDeduct = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ กรุณากรอก WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ สำเร็จ"); loadStockData('deduct'); }
};

window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ สำเร็จ"); loadStockData(type); }
};

window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ ไม่พบข้อมูลอะไหล่";
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ เพิ่มสต็อกเรียบร้อย"); loadStockData('supervisor'); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
