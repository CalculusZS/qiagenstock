/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE REPAIR & UI RESTORE
   - FIXED: executeDeduct is not defined (deduct.html error)
   - FIXED: Product Name not showing in Supervisor Add Stock
   - FIXED: Supervisor Login UI & Session stability
   - FEATURE: Red Alert Row for showall.html
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbx2kq4lXAZXziJwFkbA3RRfI_aQIyhbOzQi4k-sm1a66elS-Pwl81995KElbpeORPJB/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN ===== */

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
        } else {
            alert("❌ Login Failed: " + (res ? res.msg : "Invalid Credentials"));
        }
    } catch (e) { alert("❌ Connection Error"); }
};

// Admin Login UI - ปรับให้สวยงามและดูเป็นทางการ
window.goToAdmin = function() {
    const p = prompt("🔐 QIAGEN INVENTORY SYSTEM (ADMIN)\n" + 
                    "--------------------------------------------------\n" +
                    "Access restricted to authorized supervisors.\n" +
                    "Please enter Admin Password:");
    
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        // ตรวจสอบชื่อไฟล์หน้า Supervisor ให้ตรงกัน
        window.location.href = 'supervisor.html'; 
    } else if (p !== null) {
        alert("❌ Access Denied: Incorrect Password");
    }
};

/* ===== 2. DATA LOADING & RENDERING ===== */

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

        let rowStyle = 'border-bottom: 1px solid #eee; transition: 0.2s;';
        let statusTag = '<span style="color:#16a34a; font-weight:bold;">● In Stock</span>';
        
        if (mode === 'all' && s0243 <= 0) {
            rowStyle += 'background-color: #fee2e2;'; 
            statusTag = '<span style="color:#ef4444; font-weight:bold;">⚠️ OUT OF STOCK</span>';
        }

        html += `<tr style="${rowStyle}">
            <td style="padding:15px 10px;">
                <div style="font-weight:bold; font-size:14px; color:#1e293b;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b style="font-size:16px; ${(mode === 'all' && s0243 <= 0) ? 'color:red;' : ''}">${(mode === 'withdraw' || mode === 'all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    ${mode === 'withdraw' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:8px; border:1px solid #cbd5e1; border-radius:6px;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border:none; padding:10px 15px; border-radius:8px; font-weight:bold; cursor:pointer;">Withdraw</button>
                    ` : mode === 'return' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:8px; border:1px solid #cbd5e1; border-radius:6px;">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#16a34a; color:white; border:none; padding:10px 15px; border-radius:8px; font-weight:bold; cursor:pointer;">Return</button>
                    ` : mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:100px; padding:10px; border:2px solid #334155; border-radius:8px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:45px; padding:10px; border:2px solid #334155; border-radius:8px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:12px 18px; border-radius:8px; font-weight:bold; cursor:pointer;">USE</button>
                    ` : statusTag}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px; color:#94a3b8;">No records found</td></tr>';
};

/* ===== 3. CORE TRANSACTIONS & DEDUCT FIX ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { alert("✅ Success!"); loadStockData(type); return res; }
        else { alert("❌ Failed: " + (res ? res.msg : "Error")); return {success:false}; }
    } catch (e) { alert("❌ Connection failed"); return {success:false}; }
};

// แก้ไขฟังก์ชันสำหรับการตัดอะไหล่ (Deduct)
window.handleDeductClick = async function(mat, p1 = null, p2 = null) {
    let user, qty, wo;
    if (p1 && !isNaN(p1)) { // มาจากหน้า deduct.html
        user = sessionStorage.getItem('selectedUser'); qty = p1; wo = p2;
    } else { // มาจากหน้า Supervisor
        user = p1 || sessionStorage.getItem('selectedUser');
        const woEl = document.getElementById('wo_' + mat);
        const qtyEl = document.getElementById('qty_' + mat);
        wo = woEl ? woEl.value.trim() : (p1 ? "ADMIN_CORRECTION" : "");
        qty = qtyEl ? qtyEl.value : 1;
    }
    if(!wo) { alert("❌ Please enter Work Order (WO#)"); return {success:false}; }
    return await window.executeDeduct(user, mat, qty, wo);
};

// ฟังก์ชันหลักในการส่งค่าไป API (แก้ปัญหา ReferenceError)
window.executeDeduct = async function(user, mat, qty, wo) {
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { 
            alert("✅ Recorded Successfully!"); 
            const isSup = sessionStorage.getItem('selectedUser') === 'Supervisor';
            loadStockData(isSup ? 'supervisor' : 'deduct'); 
            return res; 
        } else { alert("❌ Failed: " + (res ? res.msg : "Error")); return {success:false}; }
    } catch (e) { alert("❌ System Error"); return {success:false}; }
};

/* ===== 4. SUPERVISOR ADD STOCK FUNCTIONS ===== */

// ฟังก์ชันดึงชื่อสินค้ามาโชว์ทันทีเมื่อใส่ Material (แก้ปัญหาไม่โชว์ Product Name)
window.updateProductName = function(matCode) {
    matCode = matCode.trim().toUpperCase();
    const nameDisplay = document.getElementById('s_name_display');
    if (!nameDisplay) return;
    
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    if (item) {
        nameDisplay.innerText = `📦 ${item['Product Name']}`;
        nameDisplay.style.color = "#1e293b";
        nameDisplay.style.fontWeight = "bold";
    } else {
        nameDisplay.innerText = matCode === "" ? "" : "❌ Material not found";
        nameDisplay.style.color = "#ef4444";
    }
};

window.addStockCentral = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if (!mat || !qty) { alert("❌ Please enter both Material and Quantity"); return; }
    
    const url = `${API}?action=addstock&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            alert("✅ Central Stock Updated!");
            document.getElementById('s_mat').value = '';
            document.getElementById('s_qty').value = '1';
            document.getElementById('s_name_display').innerText = '';
            loadStockData('supervisor');
        } else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("❌ Connection failed"); }
};

/* ===== 5. UTILITIES ===== */

window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            if (Number(item[staff] || 0) > 0) {
                html += `<tr>
                    <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                    <td>${staff}</td><td align="center">${item[staff]}</td>
                    <td align="right"><button onclick="handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">FORCE USE</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html;
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => String(i.Material).toLowerCase().includes(q) || String(i['Product Name']).toLowerCase().includes(q));
    if (mode === 'supervisor') renderStaffAudit(filtered); else renderTable(filtered, mode);
};

checkAuth();
