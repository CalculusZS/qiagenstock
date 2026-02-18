/* ==========================================================================
   QIAGEN INVENTORY - PROFESSIONAL UI & COMPLETE RESTORE
   - UI: Custom Modern Admin Modal (แทนที่ Prompt เก่า)
   - FIX: Restore Action Buttons & Status Tags
   - FIX: ExecuteDeduct & executeTransaction fully connected
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbx2kq4lXAZXziJwFkbA3RRfI_aQIyhbOzQi4k-sm1a66elS-Pwl81995KElbpeORPJB/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & UI MODAL ===== */

// สร้าง Modal สำหรับ Admin Login แบบสวยงาม (ใส่ไว้ใน Body อัตโนมัติ)
document.body.insertAdjacentHTML('beforeend', `
    <div id="admin-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.8); backdrop-filter:blur(5px); z-index:9999; justify-content:center; align-items:center;">
        <div style="background:white; padding:30px; border-radius:16px; width:320px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); text-align:center;">
            <div style="font-size:40px; margin-bottom:10px;">🔐</div>
            <h3 style="margin:0 0 5px 0; color:#1e293b;">Supervisor Access</h3>
            <p style="font-size:12px; color:#64748b; margin-bottom:20px;">Please enter your administration password</p>
            <input type="password" id="admin-pass-input" placeholder="Password" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px; margin-bottom:15px; box-sizing:border-box; text-align:center;">
            <div style="display:flex; gap:10px;">
                <button onclick="window.closeAdminModal()" style="flex:1; padding:10px; background:#f1f5f9; border:none; border-radius:8px; color:#64748b; font-weight:bold; cursor:pointer;">Cancel</button>
                <button onclick="window.submitAdminPass()" style="flex:1; padding:10px; background:#003366; border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer;">Login</button>
            </div>
        </div>
    </div>
`);

window.goToAdmin = () => document.getElementById('admin-modal').style.display = 'flex';
window.closeAdminModal = () => document.getElementById('admin-modal').style.display = 'none';

window.submitAdminPass = function() {
    const val = document.getElementById('admin-pass-input').value;
    if (val === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else {
        alert("❌ Incorrect Password");
        document.getElementById('admin-pass-input').value = '';
    }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';
    if (!user && !isLoginPage) { window.location.replace('index.html'); return false; }
    if (path.includes('supervisor.html') && user !== 'Supervisor') { window.location.replace('main.html'); return false; }
    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { displayElem.innerText = user; }
    return true;
};

/* ===== 2. DATA RENDERING (ปุ่ม Action & Status กลับมาแล้ว) ===== */

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;

        // UI Alert for Empty Stock
        let rowStyle = 'border-bottom: 1px solid #f1f5f9;';
        let statusTag = '<span style="color:#10b981; font-weight:bold;">● In Stock</span>';
        
        if (mode === 'all' && s0243 <= 0) {
            rowStyle += 'background-color:#fff1f2;';
            statusTag = '<span style="color:#ef4444; font-weight:bold;">⚠️ Out of Stock</span>';
        }

        html += `<tr style="${rowStyle}">
            <td style="padding:15px 10px;">
                <div style="font-weight:bold; color:#1e293b;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b style="font-size:15px; ${(mode==='all' && s0243<=0)?'color:red':''}">${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                    ${mode === 'withdraw' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Withdraw</button>
                    ` : mode === 'return' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Return</button>
                    ` : mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:80px; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:40px; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">USE</button>
                    ` : statusTag}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:30px; color:#94a3b8;">No data found</td></tr>';
};

/* ===== 3. CRITICAL TRANSACTION FIX ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { alert("✅ Success!"); loadStockData(type); return res; }
        else { alert("❌ Error: " + (res ? res.msg : "Failed")); return res || {success:false}; }
    } catch (e) { alert("❌ Connection Error"); return {success:false}; }
};

window.handleDeductClick = async function(mat, p1 = null, p2 = null) {
    let user, qty, wo;
    if (p1 && !isNaN(p1)) { // From deduct.html direct call
        user = sessionStorage.getItem('selectedUser'); qty = p1; wo = p2;
    } else { // From UI
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
        if (res && res.success) {
            alert("✅ Recorded Successfully!");
            loadStockData(p1 && isNaN(p1) ? 'supervisor' : 'deduct');
            return res;
        } else { alert("❌ " + (res ? res.msg : "Failed")); return res || {success:false}; }
    } catch (e) { alert("❌ Connection error"); return {success:false}; }
};

window.executeDeduct = window.handleDeductClick; // Bridge

/* ===== 4. SUPERVISOR UTILITIES ===== */

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

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const nameDisplay = document.getElementById('s_name_display');
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    if (item && nameDisplay) {
        nameDisplay.innerText = `📦 ${item['Product Name']}`;
        nameDisplay.style.color = "#003366";
    }
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
checkAuth();
