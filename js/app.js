/* ==========================================================================
   QIAGEN INVENTORY - TOTAL RESTORE (SYNC WITH FULL NAME COLUMNS)
   --------------------------------------------------------------------------
   - ใช้ชื่อเต็ม: Kitti, Tatchai, Parinyachat, Phurilap, Penporn, Phuriwat
   - ออปชั่นครบ: Audit, Add Stock, Reset Password, History, User Display
   - แก้ไข: ปัญหาข้อมูลไม่โหลดในหน้าต่างๆ ด้วยการเช็ค DOM
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// รายชื่อพนักงานตรงตามหัวคอลัมน์ใน Google Sheets
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
window.allRows = [];

/* ===== 1. ระบบตรวจสอบสิทธิ์และแสดงชื่อ (User Display) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser'); 
    
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    const renderName = () => {
        const targets = ['user_display', 'userName', 'display_user'];
        targets.forEach(id => {
            const el = document.getElementById(id);
            if (el && user) el.innerText = user;
        });
        const classEl = document.querySelector('.user-display');
        if (classEl && user) classEl.innerText = user;
    };

    renderName();
    window.addEventListener('load', renderName);
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            // สำคัญ: เก็บชื่อเต็ม (เช่น Kitti) เพื่อใช้เป็น Key ในการดึงข้อมูลคอลัมน์
            sessionStorage.setItem('selectedUser', res.fullName); 
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. ระบบดึงข้อมูลสต็อก (Stock Display) ===== */
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

    const user = sessionStorage.getItem('selectedUser'); 
    let html = '';

    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0); // ดึงข้อมูลจากคอลัมน์ชื่อพนักงานโดยตรง
        
        // ถ้าเป็นหน้าเบิก หรือ หน้าแสดงทั้งหมด ให้โชว์ยอดคลังหลัก
        const displayQty = (mode === 'withdraw' || mode === 'showall' || mode === 'all') ? s0243 : sUser;

        // หน้าตัดจ่าย/คืนของ: จะแสดงเฉพาะรายการที่พนักงานคนนั้น "มีของในมือ" เท่านั้น
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        html += `<tr>
            <td style="padding:12px;"><b>${item.Material || '-'}</b><br><small>${item['Product Name'] || ''}</small></td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;border-radius:5px;border:1px solid #ccc;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data available</td></tr>';
};

/* ===== 3. ระบบ SUPERVISOR & AUDIT (ครบทุกออปชั่น) ===== */
window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data') || document.querySelector('tbody');
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
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:80px; padding:5px; border-radius:5px; border:1px solid #ccc;">
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
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ ไม่พบข้อมูลอะไหล่";
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) return alert("❌ กรุณากรอกข้อมูลให้ครบ");
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ เติมสต็อกสำเร็จ"); loadStockData('supervisor'); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`ตั้งรหัสผ่านใหม่สำหรับ ${name}:`, "1234");
    if (!newPass) return;
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert(`✅ รีเซ็ตรหัสผ่าน ${name} เป็น ${newPass} สำเร็จ`);
};

window.goToAdmin = function() {
    const p = prompt("กรุณากรอกรหัสผ่าน Supervisor:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (p !== null) { alert("❌ รหัสผ่านไม่ถูกต้อง"); }
};

/* ===== 4. การทำรายการ (Transactions) & ประวัติ (History) ===== */
window.handleDeduct = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ กรุณาระบุ WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ตัดจ่ายสำเร็จ"); loadStockData('deduct'); }
};

window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ กรุณาระบุ WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ตัดจ่าย (Audit) สำเร็จ"); loadStockData('supervisor'); }
};

window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ดำเนินการสำเร็จ"); loadStockData(type); }
};

window.loadHistory = async function() {
    const container = document.getElementById('history-data') || document.querySelector('tbody');
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            container.innerHTML = res.data.map(row => `<tr>
                <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                <td><b>${row[1]}</b></td>
                <td>${row[3]}</td>
                <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                <td><span style="background:#eee; padding:3px 8px; border-radius:5px;">${row[4]}</span></td>
            </tr>`).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">ไม่สามารถโหลดประวัติได้</td></tr>'; }
};

/* ===== 5. ระบบ Modal & เปลี่ยนรหัสผ่าน ===== */
window.showChangePasswordModal = function(userKey) {
    const p1 = prompt("ตั้งรหัสผ่านใหม่ของคุณ:");
    if (p1) {
        const p2 = prompt("ยืนยันรหัสผ่านใหม่อีกครั้ง:");
        if (p1 === p2) window.processReset(userKey, p1);
        else alert("❌ รหัสผ่านไม่ตรงกัน");
    }
};

window.processReset = async function(userKey, newPass) {
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบอีกครั้ง"); window.location.reload(); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// เริ่มต้นระบบ
window.checkAuth();
