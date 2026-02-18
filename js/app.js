/* ==========================================================================
   QIAGEN INVENTORY - MASTER REPAIR VERSION
   - FIXED: executeDeduct is not defined (deduct.html:59)
   - FIXED: Product Name Lookup in Supervisor Page
   - FIXED: Admin Login UI & Session Protection
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbx2kq4lXAZXziJwFkbA3RRfI_aQIyhbOzQi4k-sm1a66elS-Pwl81995KElbpeORPJB/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & SESSION ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    if (!user && !isLoginPage) {
        window.location.replace('index.html');
        return false;
    }

    // ป้องกันการเข้าหน้า Supervisor โดยไม่ได้รับอนุญาต
    if (path.includes('supervisor') && user !== 'Supervisor') {
        alert("🔒 Access Denied: Supervisor Only");
        window.location.replace('main.html');
        return false;
    }

    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { displayElem.innerText = user; }
    return true;
};

/* ===== 2. LOGIN FUNCTIONS ===== */
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
            window.location.replace('main.html');
        } else { alert("❌ " + (res ? res.msg : "Login Failed")); }
    } catch (e) { alert("❌ Connection Error"); }
};

// Admin Login UI แบบ Professional Prompt
window.goToAdmin = function() {
    const p = prompt("🔐 QIAGEN INVENTORY SYSTEM (ADMIN)\n" + 
                    "--------------------------------------------------\n" +
                    "Enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html'; 
    } else if (p !== null) {
        alert("❌ Incorrect Password");
    }
};

/* ===== 3. CORE TRANSACTIONS (FIX DEDUCT) ===== */

// ฟังก์ชันหลักที่หน้า deduct.html เรียกใช้
window.executeDeduct = async function(user, mat, qty, wo) {
    if(!wo) { alert("❌ Please enter Work Order (WO#)"); return {success:false}; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const response = await fetch(url);
        const res = await response.json();
        if (res && res.success) {
            alert("✅ Recorded Successfully!");
            // รีโหลดข้อมูลหลังจากตัดสำเร็จ
            loadStockData(sessionStorage.getItem('selectedUser') === 'Supervisor' ? 'supervisor' : 'deduct');
            return res; 
        } else { 
            alert("❌ " + (res ? res.msg : "Failed")); 
            return res || {success:false}; 
        }
    } catch (e) { alert("❌ Connection error"); return {success:false}; }
};

// ฟังก์ชันดักจับการคลิกปุ่ม USE
window.handleDeductClick = async function(mat, p1 = null, p2 = null) {
    let user, qty, wo;
    if (p1 && !isNaN(p1)) { 
        // มาจาก deduct.html (ส่งค่ามา 3 ตัว: mat, qty, wo)
        user = sessionStorage.getItem('selectedUser');
        qty = p1; wo = p2;
    } else { 
        // มาจากหน้า Supervisor หรือหน้าอื่นๆ
        user = p1 || sessionStorage.getItem('selectedUser');
        const woEl = document.getElementById('wo_' + mat);
        const qtyEl = document.getElementById('qty_' + mat);
        wo = woEl ? woEl.value.trim() : (p1 ? "ADMIN_FORCE" : "");
        qty = qtyEl ? qtyEl.value : 1;
    }
    return await window.executeDeduct(user, mat, qty, wo);
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { 
            alert("✅ Success!"); 
            loadStockData(type); 
            return res; 
        } else { alert("❌ Error: " + (res ? res.msg : "Failed")); return res || {success:false}; }
    } catch (e) { alert("❌ Connection Error"); return {success:false}; }
};

/* ===== 4. DATA RENDERING & UI ===== */
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

        let rowStyle = 'border-bottom: 1px solid #eee;';
        if (mode === 'all' && s0243 <= 0) rowStyle += 'background-color: #fee2e2;'; // สีแดงเมื่อหมด

        html += `<tr style="${rowStyle}">
            <td style="padding:12px 8px;">
                <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b>${(mode === 'withdraw' || mode === 'all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                    ${mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:100px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:40px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">USE</button>
                    ` : `<span>●</span>`}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 5. SUPERVISOR UTILITIES ===== */
// ฟังก์ชันดึงชื่อสินค้า (Product Name) อัตโนมัติ
window.setupAdminLookup = function() {
    const matInput = document.getElementById('s_mat');
    const nameDisplay = document.getElementById('s_name_display');
    if (!matInput || !nameDisplay) return;
    
    const matCode = matInput.value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    if (item) {
        nameDisplay.innerText = `📦 ${item['Product Name']}`;
        nameDisplay.style.color = "#003366";
    } else {
        nameDisplay.innerText = matCode === "" ? "" : "❌ Material Not Found";
        nameDisplay.style.color = "red";
    }
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
checkAuth();
