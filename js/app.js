/* ==========================================================================
   QIAGEN INVENTORY - FULL OPTIONS RESTORED (COMPLETE VERSION)
   --------------------------------------------------------------------------
   - NO OPTIONS REMOVED: Audit, Add Stock, Reset Pass, History are all here.
   - FULL NAME SYNC: Syncs directly with 'Kitti', 'Tatchai' columns in Sheets.
   - UI FIX: Guaranteed User Name display on all pages.
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
window.allRows = [];

/* ===== 1. AUTH & USER DISPLAY (แสดงชื่อผู้ใช้ทุกหน้า) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser'); // ชื่อเต็มจากระบบ
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    const updateDisplay = () => {
        const els = [document.getElementById('user_display'), document.getElementById('userName'), document.querySelector('.user-display')];
        els.forEach(el => { if(el && user) el.innerText = user; });
    };
    
    updateDisplay();
    window.addEventListener('DOMContentLoaded', updateDisplay);
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName); // เก็บชื่อเต็ม (Kitti, etc.)
            if (res.status === 'NEW') { window.showChangePasswordModal(userVal); return; }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. STOCK DATA (แสดงข้อมูล 0243 และของในมือพนักงาน) ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Error loading data", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('stock-data') || document.querySelector('tbody');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'); // ชื่อเต็ม
    
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0); // ดึงจากคอลัมน์ชื่อเต็มโดยตรง
        
        // กรองหน้า Deduct/Return ให้โชว์เฉพาะที่มีของ
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        html += `<tr>
            <td style="padding:12px;"><b>${item.Material || '-'}</b><br><small>${item['Product Name'] || ''}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all'||mode==='showall') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;border-radius:5px;border:1px solid #ccc;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 3. SUPERVISOR OPTIONS (Audit, Add, Reset) ===== */
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
                        <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:80px; padding:5px;">
                        <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px;">Deduct</button>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory</td></tr>';
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) return alert("❌ Fill all fields");
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Stock Added"); loadStockData('supervisor'); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`New password for ${name}:`, "1234");
    if (!newPass) return;
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert(`✅ Reset to ${newPass}`);
};

window.goToAdmin = function() {
    const pass = prompt("Enter Admin Password:");
    if (pass === SUP_PASSWORD) { sessionStorage.setItem('selectedUser', 'Supervisor'); window.location.href = 'supervisor.html'; }
    else if (pass !== null) { alert("❌ Incorrect"); }
};

/* ===== 4. TRANSACTIONS & HISTORY ===== */
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

window.loadHistory = async function() {
    const tbody = document.getElementById('history-data') || document.querySelector('tbody');
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            tbody.innerHTML = res.data.map(row => `<tr>
                <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                <td><b>${row[1]}</b></td>
                <td>${row[3]}</td>
                <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                <td><span style="background:#eee; padding:2px 5px; border-radius:4px;">${row[4]}</span></td>
            </tr>`).join('');
        }
    } catch (e) { console.error("History Error", e); }
};

/* ===== 5. UI HELPERS ===== */
window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    if (document.getElementById('s_name_display')) 
        document.getElementById('s_name_display').innerText = item ? `📦 ${item['Product Name']}` : "❌ Not Found";
};

window.showChangePasswordModal = function(userKey) {
    const p1 = prompt("Set New Password:");
    if (p1) window.processReset(userKey, p1);
};

window.processReset = async function(userKey, newPass) {
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login again."); window.location.reload(); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
