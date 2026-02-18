/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (FULL MASTER VERSION)
   - ครบทุกฟังก์ชัน: Login, Withdraw, Return, Deduct, Search, Admin Lookup
   - แก้ไข Bug: TypeError 'success' of undefined
   - ป้องกัน: การเด้งออกจากหน้า Supervisor
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. ระบบตรวจสอบสิทธิ์ (Authentication) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    if (!user && !isLoginPage) {
        window.location.replace('index.html');
        return false;
    }
    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { displayElem.innerText = user; }
    return true;
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    if (!userVal || !passVal) { alert("Please enter Username and Password"); return; }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            if (res.status === 'FIRST_TIME') {
                document.getElementById('welcome-msg').innerText = `Welcome, ${res.fullName}!`;
                document.getElementById('reset-modal').style.display = 'flex';
            } else {
                window.location.replace('main.html');
            }
        } else { alert("❌ " + (res ? res.msg : "Login Failed")); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. ฟังก์ชันหลักของหน้าพนักงาน (Withdraw, Return, Deduct) ===== */

window.loadStockData = async function(mode) {
    if (!sessionStorage.getItem('selectedUser')) return;
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Data Load Error:", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        
        // กรองแถวที่ไม่จำเป็นในหน้า Deduct/Return
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;

        html += `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding:12px 8px;">
                <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b>${(mode === 'withdraw' || mode === 'all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                    ${mode === 'withdraw' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">Withdraw</button>
                    ` : mode === 'return' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">Return</button>
                    ` : mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:100px; padding:8px; border:1px solid #334155; border-radius:6px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:45px; padding:8px; border:1px solid #334155; border-radius:6px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:10px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">USE</button>
                    ` : `<span>● ${s0243 > 0 ? 'In Stock' : 'Empty'}</span>`}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px;">No data found.</td></tr>';
};

/* ===== 3. การประมวลผลคำสั่ง (Transaction Processing) ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const response = await fetch(url);
        const res = await response.json();
        if (res && res.success) { alert("✅ Success!"); loadStockData(type); }
        else { alert("❌ " + (res ? res.msg : "Error")); }
    } catch (e) { alert("❌ Connection failed"); }
};

window.handleDeductClick = async function(mat, overrideUser = null) {
    const user = overrideUser || sessionStorage.getItem('selectedUser');
    const woEl = document.getElementById('wo_' + mat);
    const qtyEl = document.getElementById('qty_' + mat);
    
    const wo = woEl ? woEl.value.trim() : (overrideUser ? "ADMIN_FORCE" : "");
    const qty = qtyEl ? qtyEl.value : 1;
    
    if(!wo) { alert("❌ Please enter Work Order (WO#)"); return; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const response = await fetch(url);
        const res = await response.json();
        if (res && res.success) { 
            alert("✅ Usage recorded!"); 
            loadStockData(overrideUser ? 'supervisor' : 'deduct'); 
        } else { alert("❌ " + (res ? res.msg : "Failed to record")); }
    } catch (e) { alert("❌ Connection error"); }
};

/* ===== 4. ระบบสำหรับ Supervisor (Admin Panel) ===== */

window.goToAdmin = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        const p = prompt("Enter Supervisor Password:");
        if (p === SUP_PASSWORD) {
            sessionStorage.setItem('selectedUser', 'Supervisor');
            sessionStorage.setItem('isSupervisor', 'true');
            window.location.assign('supervisor.html');
        }
    }
};

window.submitAdminPass = function() {
    const passInput = document.getElementById('admin-pass-input');
    if (passInput && passInput.value === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        sessionStorage.setItem('isSupervisor', 'true');
        window.location.assign('supervisor.html');
    } else {
        alert("❌ Incorrect Password");
    }
};

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const nameDisplay = document.getElementById('s_name_display');
    if (!nameDisplay) return;
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    if (item) {
        nameDisplay.innerText = `📦 ${item['Product Name']}`;
        nameDisplay.style.color = "#003366";
    } else {
        nameDisplay.innerText = matCode ? "❌ Not found" : "";
    }
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
                    <td><span style="background:#e2e8f0; padding:2px 8px; border-radius:10px;">${staff}</span></td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right"><button onclick="handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">FORCE USE</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found.</td></tr>';
};

/* ===== 5. ฟังก์ชันเสริม (Search, Logout) ===== */

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => 
        String(i.Material || "").toLowerCase().includes(q) || 
        String(i['Product Name'] || "").toLowerCase().includes(q)
    );
    if (mode === 'supervisor') renderStaffAudit(filtered);
    else renderTable(filtered, mode);
};

window.logout = function() { 
    sessionStorage.clear(); 
    window.location.replace('index.html'); 
};

window.closeAdminModal = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'none';
};

// เริ่มต้นตรวจสอบสิทธิ์ทันที
checkAuth();
