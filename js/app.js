/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE MASTER (NO-CUT VERSION)
   - FIXED: Supervisor System Access (Modal & Prompt)
   - FIXED: Password Change Modal (For Status NEW)
   - FIXED: Central Stock (0243) Add & Product Lookup
   - FIXED: Staff Audit (Mandatory WO# before Deduct)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN (หน้าต่างเปลี่ยนรหัสกลับมาแล้ว) ===== */
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
            // ข้อ 1: ถ้าเป็นพนักงานใหม่ (NEW) บังคับเด้งหน้าต่างเปลี่ยนรหัส
            if (res.status === 'NEW') { 
                window.pendingUserKey = userVal;
                const modal = document.getElementById('password-modal');
                if (modal) modal.style.display = 'flex';
                else alert("Status: NEW. Please use Change Password page.");
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed: User หรือ Password ผิด"); }
    } catch (e) { alert("❌ Connection Error: ตรวจสอบ URL API"); }
};

window.submitChangePassword = async function() {
    const p1 = document.getElementById('new-pass').value;
    const p2 = document.getElementById('confirm-pass').value;
    if (!p1 || p1 !== p2) return alert("❌ รหัสผ่านใหม่ไม่ตรงกัน");
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(window.pendingUserKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ เปลี่ยนรหัสสำเร็จ กรุณา Login ใหม่"); window.location.reload(); }
    } catch (e) { alert("❌ เปลี่ยนรหัสล้มเหลว"); }
};

/* ===== 2. SUPERVISOR SYSTEM ACCESS (เข้า Admin ได้แน่นอน) ===== */
window.goToAdmin = function() {
    const pass = prompt("Enter Supervisor Password:");
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (pass !== null) { alert("❌ Incorrect Password"); }
};

/* ===== 3. ADD STOCK TO CENTRAL (0243) & LOOKUP (แก้ข้อ 2) ===== */
window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) {
        display.innerText = item ? `📦 ${item['Product Name']}` : "❌ ไม่พบข้อมูลอะไหล่";
    }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if (!mat || !qty) return alert("❌ กรุณาใส่ Material และ จำนวน");
    try {
        const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            alert("✅ เพิ่มสต็อกกลาง (0243) สำเร็จ!");
            loadStockData('supervisor');
            document.getElementById('s_mat').value = '';
            document.getElementById('s_qty').value = '';
        }
    } catch (e) { alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ"); }
};

/* ===== 4. STAFF INVENTORY AUDIT (บังคับใส่ WO# - แก้ข้อ 3) ===== */
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
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:70px; padding:5px; border:1px solid #ccc; border-radius:5px;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ บังคับ: ต้องระบุ Work Order (WO#) ก่อนตัดสต็อก");
    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ ตัดสต็อกสำเร็จ!"); loadStockData('supervisor'); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 5. CORE FUNCTIONS (HISTORY / TABLE / SEARCH) ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Data Load Fail", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        html += `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
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

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`Set Password for ${name}:`, "1234");
    if (!newPass) return;
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${SUP_PASSWORD}`).then(r => r.json());
        if (res.success) alert(`✅ Reset ${name} Success!`);
    } catch (e) { alert("❌ Failed"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ กรุณาระบุ WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('deduct'); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) window.location.replace('index.html');
    if (document.getElementById('user_display')) document.getElementById('user_display').innerText = user;
};
window.checkAuth();
