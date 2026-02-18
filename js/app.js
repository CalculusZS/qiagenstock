/* ==========================================================================
   QIAGEN INVENTORY - THE COMPLETE MASTER RESTORE (FIXED ALL ISSUES)
   - FIXED: History "undefined" & Admin Login UI
   - FIXED: User display on all transaction pages
   - FIXED: Show All data display
   - FEATURES: Product Name Lookup, Force WO# on Deduct, Password Reset
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycby8X9GKrYlyBx6JHsTtgsVE85RtnT_iCNEIcefKu9UQszc34bDATxJ7beUHqsHn42c/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & UI SETUP ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    // อัปเดตชื่อผู้ใช้งานที่มุมขวาบนของทุกหน้า
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user;
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            if (res.status === 'NEW') { showChangePasswordModal(userVal); return; }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

window.goToAdmin = function() {
    const pass = prompt("Enter Supervisor Password:");
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (pass !== null) { alert("❌ Incorrect Password"); }
};

/* ===== 2. CORE DATA & RENDERING ===== */
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
        
        // กรองเฉพาะที่มีของสำหรับหน้า Deduct/Return
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        html += `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" class="btn-primary">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:50px;"><button onclick="handleDeductClick('${item.Material}')" class="btn-danger">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" class="btn-success">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3">No Data Found</td></tr>';
};

/* ===== 3. HISTORY (FIXED UNDEFINED) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            // แมพคอลัมน์ตาม Backend: 0=Date, 1=Material, 3=Product, 7=WO, 4=Type
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

/* ===== 4. SUPERVISOR FUNCTIONS (ADMIN) ===== */
window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Material not found";
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
                    <td align="center"><b>${item[staff]}</b></td>
                    <td align="right"><button onclick="handleDeductClick('${item.Material}','${staff}')" class="btn-danger-sm">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4">No staff inventory</td></tr>';
};

window.handleDeductClick = async function(mat, staff = null) {
    const user = staff || sessionStorage.getItem('selectedUser');
    let wo = "";
    if (staff) {
        wo = prompt(`Enter Work Order (WO#) for ${mat} (Staff: ${staff}):`);
        if (!wo) return;
    } else {
        wo = document.getElementById('wo_' + mat)?.value;
        if (!wo) { alert("❌ Please enter WO# before USE"); return; }
    }

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Success!"); loadStockData(staff ? 'supervisor' : 'deduct'); }
    } catch (e) { alert("❌ Error"); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`Set New Password for ${name}:`, "1234");
    if (!newPass) return;
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${SUP_PASSWORD}`).then(r => r.json());
        if (res.success) alert(`✅ Password for ${name} has been reset!`);
    } catch (e) { alert("❌ Reset failed"); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
