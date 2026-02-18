/* ==========================================================================
   QIAGEN INVENTORY - THE COMPLETE MASTER RESTORE (NO FEATURES REMOVED)
   - FIXED: Admin UI & Entry (สวยเหมือนเดิม เข้าได้ 100%)
   - FIXED: User Display (ชื่อพนักงานโชว์ทุกหน้า ไม่ค้าง Loading)
   - FIXED: History "undefined" (เรียงลำดับคอลัมน์ใหม่ให้ตรง Backend V7.0)
   - FIXED: Admin Force Deduct (บังคับใส่ WO# เหมือนหน้า Deduct)
   - FIXED: Product Name Lookup (ในหน้า Add Stock)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & ADMIN ENTRY ===== */

// แก้ไขทางเข้า Admin ให้สวยงามและกดได้จาก index.html
window.goToAdmin = function() {
    const pass = prompt("Enter Supervisor Password:");
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (pass !== null) { 
        alert("❌ Incorrect Password"); 
    }
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            if (res.status === 'NEW') { showChangePasswordModal(userVal); return; }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. CORE DATA & PRODUCT LOOKUP ===== */

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

// ฟังก์ชันโชว์ Product Name ทันทีเมื่อพิมพ์ Material Code (หน้า Add Stock)
window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Material not found";
};

/* ===== 3. TRANSACTIONS (บังคับใส่ WO# ทุกจุด) ===== */

window.handleDeductClick = async function(mat, staff = null) {
    const user = (typeof staff === 'string') ? staff : sessionStorage.getItem('selectedUser');
    let woVal = "";
    
    if (typeof staff === 'string') {
        // ถ้าเป็น Admin กดจากหน้า Audit ให้ Prompt ถาม WO# เพื่อความปลอดภัย
        woVal = prompt(`Enter Work Order (WO#) for ${mat} (Staff: ${staff}):`);
        if (!woVal) return; 
    } else {
        woVal = document.getElementById('wo_' + mat)?.value || "";
        if (!woVal) { alert("❌ Please enter WO# before USE"); return; }
    }

    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(woVal)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Recorded!"); loadStockData(staff ? 'supervisor' : 'deduct'); }
    } catch (e) { alert("❌ Error"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Success"); loadStockData(type); }
    } catch (e) { alert("❌ Error"); }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) return alert("❌ Please fill all fields");
    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Stock Added!"); loadStockData('supervisor'); }
};

/* ===== 4. UI RENDERING (แก้ History undefined และ Admin UI) ===== */

window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            // แก้ไขการ Map ข้อมูลให้ตรงกับคอลัมน์ใน LOG_SHEET (V7.0)
            container.innerHTML = res.data.map(row => `
                <tr>
                    <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                    <td><b>${row[1] || ''}</b></td>
                    <td>${row[2] || '-'}</td>
                    <td><small>${row[3] || ''}</small></td>
                    <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                    <td><span class="badge">${row[4] || ''}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="6">Error loading history</td></tr>'; }
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
                  mode === 'deduct' ? `<div style="display:flex;gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" class="input-wo"><button onclick="handleDeductClick('${item.Material}')" class="btn-danger">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" class="btn-success">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3">No Data Found</td></tr>';
};

window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            if (Number(item[staff] || 0) > 0) {
                html += `<tr>
                    <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                    <td align="center">${staff}</td>
                    <td align="center" style="color:#003366; font-weight:bold;">${item[staff]}</td>
                    <td align="right"><button onclick="handleDeductClick('${item.Material}','${staff}')" class="btn-danger-sm">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4">No staff inventory</td></tr>';
};

/* ===== 5. RESET PASSWORD & UTILS ===== */

window.resetStaffPassword = async function(staffName) {
    const newPass = prompt(`Set Temporary Password for ${staffName}:`, "1234");
    if (!newPass) return;
    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(staffName)}&newPass=${encodeURIComponent(newPass)}&pass=${SUP_PASSWORD}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) alert(`✅ Password reset for ${staffName} successfully!`);
    } catch (e) { alert("❌ Reset failed"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
    }
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user;
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// Start Application
window.checkAuth();
if (window.location.pathname.includes('supervisor.html')) {
    loadStockData('supervisor');
}
