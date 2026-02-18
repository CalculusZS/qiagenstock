/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE MASTER FIX (COMPLETE VERSION)
   - FIXED: handleLogin ReferenceError (User Login Restored)
   - FIXED: Supervisor Session Stability
   - UI: Professional Admin Prompt & Red Alert for showall.html
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbx2kq4lXAZXziJwFkbA3RRfI_aQIyhbOzQi4k-sm1a66elS-Pwl81995KElbpeORPJB/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION (USER & SUPERVISOR) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    if (!user && !isLoginPage) {
        window.location.replace('index.html');
        return false;
    }

    if (path.includes('supervisor') && user !== 'Supervisor') {
        alert("🔒 Access Denied: Authorized Personnel Only");
        window.location.replace('main.html');
        return false;
    }

    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { displayElem.innerText = user; }
    return true;
};

// คืนค่าฟังก์ชัน Login หน้าแรก
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    if (!userVal || !passVal) {
        alert("Please enter both Username and Password");
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            window.location.replace('main.html');
        } else {
            alert("❌ Login Failed: " + (res ? res.msg : "Invalid Credentials"));
        }
    } catch (e) {
        alert("❌ Connection Error");
    }
};

// Admin Login UI (แบบ Prompt ที่สวยงามและเป็นสัดส่วน)
window.goToAdmin = function() {
    const p = prompt("🔑 QIAGEN INVENTORY SYSTEM (ADMIN)\n--------------------------------------------------\nPlease enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html'; 
    } else if (p !== null) {
        alert("❌ Access Denied: Incorrect Password");
    }
};

/* ===== 2. DATA RENDERING (แถบสีแดงเมื่อของหมด) ===== */

window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error"); }
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

        // UI: แถบสีแดงถ้าของในคลังหลัก (0243) เป็น 0
        let rowStyle = 'border-bottom: 1px solid #eee;';
        let statusTag = '<span style="color:#16a34a; font-weight:bold;">In Stock</span>';
        
        if (mode === 'all' && s0243 <= 0) {
            rowStyle += 'background-color: #fee2e2;'; // สีแดงอ่อน
            statusTag = '<span style="color:#ef4444; font-weight:bold;">OUT OF STOCK</span>';
        }

        html += `<tr style="${rowStyle}">
            <td style="padding:15px 10px;">
                <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b style="${(mode === 'all' && s0243 <= 0) ? 'color:red;' : ''}">${(mode === 'withdraw' || mode === 'all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    ${mode === 'withdraw' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold;">Withdraw</button>
                    ` : mode === 'return' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold;">Return</button>
                    ` : mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:100px; padding:8px; border:1px solid #334155; border-radius:6px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:45px; padding:8px; border:1px solid #334155; border-radius:6px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:10px 14px; border-radius:6px; font-weight:bold;">USE</button>
                    ` : statusTag}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 3. TRANSACTIONS & OTHERS ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { alert("✅ Success!"); loadStockData(type); return res; }
        else { alert("❌ Error"); return {success:false}; }
    } catch (e) { return {success:false}; }
};

window.handleDeductClick = async function(mat, p1 = null, p2 = null) {
    let user, qty, wo;
    if (p1 && !isNaN(p1)) { user = sessionStorage.getItem('selectedUser'); qty = p1; wo = p2; }
    else {
        user = p1 || sessionStorage.getItem('selectedUser');
        const woEl = document.getElementById('wo_' + mat);
        const qtyEl = document.getElementById('qty_' + mat);
        wo = woEl ? woEl.value.trim() : (p1 ? "ADMIN_FORCE" : "");
        qty = qtyEl ? qtyEl.value : 1;
    }
    if(!wo) { alert("❌ Please enter WO#"); return {success:false}; }
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { alert("✅ Recorded!"); loadStockData(p1 && isNaN(p1) ? 'supervisor' : 'deduct'); return res; }
        else { alert("❌ Failed"); return {success:false}; }
    } catch (e) { return {success:false}; }
};

window.executeDeduct = window.handleDeductClick;
window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => String(i.Material).toLowerCase().includes(q) || String(i['Product Name']).toLowerCase().includes(q));
    if (mode === 'supervisor') renderStaffAudit(filtered); else renderTable(filtered, mode);
};

checkAuth();
