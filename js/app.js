/* ==========================================================================
   QIAGEN INVENTORY - THE "NO-CUT" FINAL MASTER
   - FIXED: Password Change Modal (Status NEW)
   - FIXED: Add Stock to Central (0243)
   - FIXED: Staff Password Reset Action
   - FIXED: Staff Audit with Mandatory WO# Input
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & CHANGE PASSWORD (FIXED) ===== */
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
            // ข้อ 1: ถ้าเป็น NEW ให้เรียก Modal เปลี่ยนรหัสทันที
            if (res.status === 'NEW') { 
                if (window.showChangePasswordModal) {
                    showChangePasswordModal(userVal);
                } else {
                    alert("⚠️ Status: NEW - Please use Change Password Modal");
                }
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. SUPERVISOR ACTIONS (ADD STOCK & RESET PASS) ===== */
// ข้อ 2: เพิ่มอะไหล่เข้าสต็อกกลาง
window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if (!mat || !qty) return alert("❌ Please enter Material and Qty");

    try {
        const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            alert("✅ Added to Central Stock!");
            loadStockData('supervisor');
            document.getElementById('s_mat').value = '';
            document.getElementById('s_qty').value = '';
        } else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("❌ Connection Error"); }
};

// ข้อ 3: Reset รหัสพนักงาน
window.resetStaffPassword = async function(name) {
    const newPass = prompt(`Set New Password for ${name}:`, "1234");
    if (!newPass) return;
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${SUP_PASSWORD}`).then(r => r.json());
        if (res.success) alert(`✅ Password for ${name} has been reset to ${newPass}`);
        else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Reset failed"); }
};

/* ===== 3. AUDIT & DEDUCT WITH WO# (FIXED) ===== */
// ข้อ 4: หน้า Audit ต้องมีช่องใส่ WO# และบังคับใส่
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
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:60px; padding:5px; border-radius:4px; border:1px solid #ccc;">
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
    const woInput = document.getElementById(`audit_wo_${mat}_${staff}`);
    const wo = woInput ? woInput.value.trim() : "";
    if (!wo) return alert("❌ Mandatory: Please enter Work Order (WO#)");

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Deducted Successfully!"); loadStockData('supervisor'); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. CORE RENDERING & SEARCH ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error", e); }
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
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" class="btn-primary">Withdraw</button>` : 
                  mode === 'deduct' ? `
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px; padding:5px;">
                        <button onclick="handleDeductClick('${item.Material}')" class="btn-danger">USE</button>
                    </div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" class="btn-success">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 5. HISTORY (CORRECT MAPPING) ===== */
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
                    <td><span class="badge">${row[4] || ''}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">Error loading history</td></tr>'; }
};

/* ===== 6. UTILS ===== */
window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Not Found";
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ Please enter WO#");
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
