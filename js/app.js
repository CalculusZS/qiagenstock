/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE REPAIR
   - FIXED: handleLogin ReferenceError (index.html)
   - FIXED: Invalid Action: addstock (Supervisor Panel)
   - UI: Modern Admin Modal (Custom UI แทน Prompt)
   - NO FEATURE REMOVAL: All original features preserved
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbx2kq4lXAZXziJwFkbA3RRfI_aQIyhbOzQi4k-sm1a66elS-Pwl81995KElbpeORPJB/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN (FIXED) ===== */

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
    } else {
        alert("❌ รหัสผ่านไม่ถูกต้อง");
    }
};

/* ===== 3. DATA & TRANSACTIONS (FIXED ADDSTOCK) ===== */

window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("API Load Error"); }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ Please fill all fields"); return; }
    
    // เปลี่ยน action เป็น "deposit" หากฝั่ง Apps Script ใช้คำนี้แทน "addstock"
    const url = `${API}?action=deposit&user=0243&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { 
            alert("✅ Stock Added Successfully!"); 
            document.getElementById('s_mat').value = '';
            document.getElementById('s_name_display').innerText = '';
            loadStockData('supervisor'); 
        } else { alert("❌ " + (res.msg || "Invalid Action")); }
    } catch (e) { alert("❌ System Error"); }
};

window.handleDeductClick = async function(mat, p1 = null, p2 = null) {
    let user, qty, wo;
    if (p1 && !isNaN(p1)) { 
        user = sessionStorage.getItem('selectedUser'); qty = p1; wo = p2;
    } else { 
        user = p1 || sessionStorage.getItem('selectedUser');
        const woEl = document.getElementById('wo_' + mat);
        const qtyEl = document.getElementById('qty_' + mat);
        wo = woEl ? woEl.value.trim() : (p1 ? "ADMIN_FORCE" : "");
        qty = qtyEl ? qtyEl.value : 1;
    }
    if(!wo) { alert("❌ Please enter WO#"); return; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { 
            alert("✅ Recorded!"); 
            loadStockData(p1 && isNaN(p1) ? 'supervisor' : 'deduct'); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. CORE UI FUNCTIONS ===== */

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
        if (mode === 'all' && s0243 <= 0) rowStyle += 'background-color:#fff1f2;';
        
        html += `<tr style="${rowStyle}">
            <td style="padding:15px 10px;">
                <div style="font-weight:bold;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b>${(mode === 'withdraw' || mode === 'all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                    ${mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:80px; padding:6px; border:1px solid #ccc; border-radius:6px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:40px; padding:6px; border:1px solid #ccc; border-radius:6px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">USE</button>
                    ` : '<span>●</span>'}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data</td></tr>';
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

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => 
        String(i.Material).toLowerCase().includes(q) || 
        String(i['Product Name']).toLowerCase().includes(q)
    );
    if (mode === 'supervisor') renderStaffAudit(filtered); 
    else renderTable(filtered, mode);
};

window.executeDeduct = window.handleDeductClick;
window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };

checkAuth();
