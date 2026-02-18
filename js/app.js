/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE COMPLETE VERSION (RESTORING ALL FEATURES)
   - FIXED: Load Error (Restored renderStaffAudit & searchStock)
   - FIXED: Add Stock Error (Auto-fallback addstock/deposit)
   - PRESERVED: Withdraw, Return, Use, Search, Staff Management
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbx2kq4lXAZXziJwFkbA3RRfI_aQIyhbOzQi4k-sm1a66elS-Pwl81995KElbpeORPJB/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. LOGIN & AUTHENTICATION ===== */
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
        } else { alert("❌ Login Failed: " + (res ? res.msg : "Invalid Credentials")); }
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
    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { displayElem.innerText = user; }
    return true;
};

/* ===== 2. ADMIN MODAL & SUPERVISOR ACCESS ===== */
if (!document.getElementById('admin-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="admin-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(10px); z-index:9999; justify-content:center; align-items:center;">
            <div style="background:white; padding:40px; border-radius:24px; width:350px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); text-align:center;">
                <div style="font-size:50px; margin-bottom:15px;">🛡️</div>
                <h3 style="margin:0 0 10px 0; color:#1e293b; font-size:22px;">Supervisor System</h3>
                <p style="font-size:14px; color:#64748b; margin-bottom:25px;">กรุณากรอกรหัสผ่านผู้ดูแลระบบ</p>
                <input type="password" id="admin-pass-input" placeholder="••••••••" style="width:100%; padding:15px; border:2px solid #e2e8f0; border-radius:12px; margin-bottom:20px; box-sizing:border-box; text-align:center; font-size:20px; outline:none;">
                <div style="display:flex; gap:12px;">
                    <button onclick="window.closeAdminModal()" style="flex:1; padding:12px; background:#f1f5f9; border:none; border-radius:12px; color:#64748b; font-weight:bold; cursor:pointer;">Cancel</button>
                    <button onclick="window.submitAdminPass()" style="flex:1; padding:12px; background:#003366; border:none; border-radius:12px; color:white; font-weight:bold; cursor:pointer;">Login</button>
                </div>
            </div>
        </div>
    `);
}

window.goToAdmin = () => {
    document.getElementById('admin-modal').style.display = 'flex';
    document.getElementById('admin-pass-input').focus();
};
window.closeAdminModal = () => document.getElementById('admin-modal').style.display = 'none';
window.submitAdminPass = function() {
    const val = document.getElementById('admin-pass-input').value;
    if (val === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        sessionStorage.setItem('isSupervisor', 'true');
        window.location.href = 'supervisor.html';
    } else { alert("❌ รหัสผ่านไม่ถูกต้อง"); }
};

/* ===== 3. DATA LOADING & AUDIT (RE-ADDED) ===== */
window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error at app.js:218", e); }
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
                    <td>${staff}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right">
                        <button onclick="window.handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">Deduct</button>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

/* ===== 4. TRANSACTIONS (WITH COMPATIBILITY FIX) ===== */
window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ กรุณากรอกข้อมูลให้ครบ"); return; }
    
    // ลองส่ง action=addstock ก่อน ถ้าไม่ได้ให้ลอง deposit (เพื่อกัน Error Invalid Action)
    try {
        let res = await fetch(`${API}?action=addstock&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        if (!res.success) {
            res = await fetch(`${API}?action=deposit&user=0243&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        }
        if (res.success) {
            alert("✅ เพิ่มสต็อกสำเร็จ!");
            document.getElementById('s_mat').value = '';
            loadStockData('supervisor');
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ"); }
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (typeof p1 === 'string' && isNaN(p1)) ? p1 : sessionStorage.getItem('selectedUser');
    const wo = (typeof p1 === 'string' && isNaN(p1)) ? "ADMIN_FORCE" : (document.getElementById('wo_' + mat)?.value || "");
    const qty = (typeof p1 === 'string' && isNaN(p1)) ? 1 : (document.getElementById('qty_' + mat)?.value || 1);

    if(!wo && user !== 'Supervisor') { alert("❌ กรุณากรอก WO#"); return; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ บันทึกสำเร็จ!"); 
            loadStockData(user === 'Supervisor' || p1 ? 'supervisor' : 'deduct'); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { alert("✅ Success!"); loadStockData(type); }
        else { alert("❌ Error: " + (res ? res.msg : "Failed")); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 5. UI UTILS & SEARCH ===== */
window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => 
        String(i.Material).toLowerCase().includes(q) || 
        String(i['Product Name']).toLowerCase().includes(q)
    );
    if (mode === 'supervisor') renderStaffAudit(filtered);
    else renderTable(filtered, mode);
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
        let rowStyle = (mode === 'all' && s0243 <= 0) ? 'background-color:#fff1f2;' : '';
        
        html += `<tr style="${rowStyle}">
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                ${mode === 'deduct' ? `
                    <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:80px; padding:6px; border:1px solid #ccc; border-radius:6px;">
                    <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">USE</button>
                ` : mode === 'withdraw' ? `
                    <button onclick="executeTransaction('withdraw', '${item.Material}', 1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Withdraw</button>
                ` : mode === 'return' ? `
                    <button onclick="executeTransaction('return', '${item.Material}', 1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Return</button>
                ` : '●'}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    const display = document.getElementById('s_name_display');
    if (display) {
        display.innerText = item ? `📦 ${item['Product Name']}` : (matCode ? "❌ Not Found" : "");
        display.style.color = item ? "#003366" : "red";
    }
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
checkAuth();
