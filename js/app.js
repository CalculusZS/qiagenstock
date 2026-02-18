/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE UI & LOGIN FIX
   - FIXED: handleLogin is not defined (index.html:25)
   - FIXED: Admin Modal UI (Modern Design)
   - FIXED: Action Buttons & Status Icons
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbx2kq4lXAZXziJwFkbA3RRfI_aQIyhbOzQi4k-sm1a66elS-Pwl81995KElbpeORPJB/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. LOGIN & AUTHENTICATION ===== */

// ฟังก์ชัน Login ที่หน้า index.html เรียกใช้
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

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    if (!user && !isLoginPage) {
        window.location.replace('index.html');
        return false;
    }
    if (path.includes('supervisor.html') && user !== 'Supervisor') {
        window.location.replace('main.html');
        return false;
    }
    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { displayElem.innerText = user; }
    return true;
};

/* ===== 2. MODERN ADMIN LOGIN MODAL ===== */

// สร้าง Modal แทนการใช้ Prompt เพื่อความสวยงาม
document.body.insertAdjacentHTML('beforeend', `
    <div id="admin-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.8); backdrop-filter:blur(8px); z-index:9999; justify-content:center; align-items:center;">
        <div style="background:white; padding:30px; border-radius:20px; width:340px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); text-align:center; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size:48px; margin-bottom:15px;">🛡️</div>
            <h3 style="margin:0 0 10px 0; color:#1e293b; font-size:20px;">Supervisor System</h3>
            <p style="font-size:13px; color:#64748b; margin-bottom:25px;">Please enter Admin Password</p>
            <input type="password" id="admin-pass-input" placeholder="••••••••" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:12px; margin-bottom:20px; box-sizing:border-box; text-align:center; font-size:18px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#003366'">
            <div style="display:flex; gap:12px;">
                <button onclick="window.closeAdminModal()" style="flex:1; padding:12px; background:#f1f5f9; border:none; border-radius:12px; color:#64748b; font-weight:bold; cursor:pointer; transition:0.2s;">Cancel</button>
                <button onclick="window.submitAdminPass()" style="flex:1; padding:12px; background:#003366; border:none; border-radius:12px; color:white; font-weight:bold; cursor:pointer; transition:0.2s;">Login</button>
            </div>
        </div>
    </div>
`);

window.goToAdmin = () => {
    const modal = document.getElementById('admin-modal');
    modal.style.display = 'flex';
    document.getElementById('admin-pass-input').focus();
};
window.closeAdminModal = () => document.getElementById('admin-modal').style.display = 'none';

window.submitAdminPass = function() {
    const val = document.getElementById('admin-pass-input').value;
    if (val === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        sessionStorage.setItem('isSupervisor', 'true');
        window.location.href = 'supervisor.html';
    } else {
        alert("❌ Incorrect Password");
        document.getElementById('admin-pass-input').value = '';
    }
};

/* ===== 3. DATA RENDERING (WITH BUTTONS & STATUS) ===== */

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

        let rowStyle = 'border-bottom: 1px solid #f1f5f9; transition: 0.2s;';
        let statusTag = '<span style="color:#10b981; font-weight:bold; font-size:12px;">● In Stock</span>';
        
        if (mode === 'all' && s0243 <= 0) {
            rowStyle += 'background-color:#fff1f2;';
            statusTag = '<span style="color:#ef4444; font-weight:bold; font-size:12px;">⚠️ Out of Stock</span>';
        }

        html += `<tr style="${rowStyle}">
            <td style="padding:15px 10px;">
                <div style="font-weight:bold; color:#1e293b; font-size:14px;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b style="font-size:16px; ${(mode==='all' && s0243<=0)?'color:red':''}">${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                    ${mode === 'withdraw' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:8px; border:1px solid #cbd5e1; border-radius:8px;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border:none; padding:10px 14px; border-radius:10px; font-weight:bold; cursor:pointer;">Withdraw</button>
                    ` : mode === 'return' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:8px; border:1px solid #cbd5e1; border-radius:8px;">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#10b981; color:white; border:none; padding:10px 14px; border-radius:10px; font-weight:bold; cursor:pointer;">Return</button>
                    ` : mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:85px; padding:8px; border:1px solid #cbd5e1; border-radius:8px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:40px; padding:8px; border:1px solid #cbd5e1; border-radius:8px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:10px 14px; border-radius:10px; font-weight:bold; cursor:pointer;">USE</button>
                    ` : statusTag}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:40px; color:#94a3b8;">No data found</td></tr>';
};

/* ===== 4. TRANSACTIONS & SUPERVISOR UTILS ===== */

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
    } else { // From UI inputs
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

window.executeDeduct = window.handleDeductClick; // Bridge for older calls

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ Fill all fields"); return; }
    
    const url = `${API}?action=addstock&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { 
            alert("✅ Stock Added to Central!"); 
            document.getElementById('s_mat').value = '';
            document.getElementById('s_name_display').innerText = '';
            loadStockData('supervisor'); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const nameDisplay = document.getElementById('s_name_display');
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    if (item && nameDisplay) {
        nameDisplay.innerText = `📦 ${item['Product Name']}`;
        nameDisplay.style.color = "#003366";
    } else if (nameDisplay) {
        nameDisplay.innerText = matCode ? "❌ Not found" : "";
        nameDisplay.style.color = "red";
    }
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
checkAuth();
