/* ==========================================================================
   QIAGEN INVENTORY - FINAL RECOVERY V10 (COMPLETE & STABLE)
   - FIXED: Password Change Modal (Status NEW)
   - FIXED: Add Stock to Central (0243) Action & Lookup
   - FIXED: Supervisor Audit with Mandatory WO# Input
   - FIXED: Staff Password Reset Logic
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycby8X9GKrYlyBx6JHsTtgsVE85RtnT_iCNEIcefKu9UQszc34bDATxJ7beUHqsHn42c/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & CHANGE PASSWORD MODAL ===== */
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
            // ข้อ 1: ถ้าสถานะเป็น NEW ให้เปิด Modal ทันที
            if (res.status === 'NEW') { 
                showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed: User หรือ Password ผิด"); }
    } catch (e) { alert("❌ Connection Error"); }
};

// ฟังก์ชันเปิด Modal เปลี่ยนรหัส (กู้คืนจากไฟล์ต้นฉบับ)
window.showChangePasswordModal = function(userKey) {
    const modal = document.getElementById('password-modal');
    if (modal) {
        modal.style.display = 'flex';
        window.pendingUserKey = userKey;
    } else {
        alert("Please change your password in the Change Password page.");
    }
};

window.submitChangePassword = async function() {
    const p1 = document.getElementById('new-pass').value;
    const p2 = document.getElementById('confirm-pass').value;
    if (!p1 || p1 !== p2) return alert("❌ รหัสผ่านไม่ตรงกัน");

    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(window.pendingUserKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            alert("✅ เปลี่ยนรหัสผ่านสำเร็จ กรุณา Login ใหม่");
            window.location.reload();
        }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 2. SUPERVISOR: ADD STOCK & RESET PASSWORD ===== */
// ข้อ 2: ค้นหาและเพิ่มสต็อกกลาง (0243)
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
    if (!mat || !qty) return alert("❌ กรุณากรอก Material และจำนวน");

    try {
        const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            alert("✅ เพิ่มสต็อกสำเร็จ!");
            loadStockData('supervisor');
            document.getElementById('s_mat').value = '';
            document.getElementById('s_qty').value = '';
        }
    } catch (e) { alert("❌ Error Connecting"); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`ตั้งรหัสผ่านใหม่ให้ ${name}:`, "1234");
    if (!newPass) return;
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${SUP_PASSWORD}`).then(r => r.json());
        if (res.success) alert(`✅ Reset รหัส ${name} เป็น ${newPass} สำเร็จ`);
    } catch (e) { alert("❌ Failed"); }
};

/* ===== 3. STAFF INVENTORY AUDIT (บังคับ WO#) ===== */
// ข้อ 3: หน้า Audit ต้องมีช่องกรอก WO# เหมือนหน้า Deduct
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
                    <td align=\"center\">${staff}</td>
                    <td align=\"center\"><b>${qty}</b></td>
                    <td align=\"right\">
                        <div style=\"display:flex; gap:5px; justify-content:flex-end;\">
                            <input type=\"text\" id=\"audit_wo_${item.Material}_${staff}\" placeholder=\"WO#\" style=\"width:70px; padding:5px; border:1px solid #ccc; border-radius:5px;\">
                            <button onclick=\"handleAuditDeduct('${item.Material}', '${staff}')\" style=\"background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;\">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan=\"4\" align=\"center\">No staff inventory</td></tr>';
};

window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ บังคับ: กรุณากรอก Work Order (WO#) ก่อนตัดสต็อก");

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            alert("✅ ตัดสต็อกสำเร็จ!");
            loadStockData('supervisor');
        }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. CORE & TRANSACTIONS ===== */
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
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        html += `<tr>
            <td style=\"padding:12px;\"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align=\"center\"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align=\"right\">
                ${mode === 'withdraw' ? `<button onclick=\"executeTransaction('withdraw','${item.Material}',1)\" style=\"background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;\">Withdraw</button>` : 
                  mode === 'deduct' ? `
                    <div style=\"display:flex; gap:5px; justify-content:flex-end;\">
                        <input type=\"text\" id=\"wo_${item.Material}\" placeholder=\"WO#\" style=\"width:60px; padding:5px;\">
                        <button onclick=\"handleDeductClick('${item.Material}')\" style=\"background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;\">USE</button>
                    </div>` : 
                  mode === 'return' ? `<button onclick=\"executeTransaction('return','${item.Material}',1)\" style=\"background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px;\">Return</button>` : '●'}
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
                    <td style=\"color:#ef4444; font-weight:bold;\">${row[7] || '-'}</td>
                    <td><span style=\"background:#eee; padding:3px 8px; border-radius:5px; font-size:12px;\">${row[4] || ''}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan=\"5\">Error</td></tr>'; }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ กรุณากรอก WO#");
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
