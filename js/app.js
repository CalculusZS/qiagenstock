/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE COMPLETE VERSION (MATCH WITH BACKEND V8.0)
   - FEATURE: Modern Change Password Modal (New & Confirm)
   - FEATURE: Status 'NEW' Check for Forced Password Change
   - PRESERVED: All features (Withdraw, Return, Use, Search, Admin Audit)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbwsU6rp8fvviV3aako-EqVABQHpQ7GQ9vOKvHR-MwnL3-AuWmTcewct_XUsuhEta1l-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN (WITH MODERN MODAL) ===== */
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

            // ตรวจสอบถ้าสถานะเป็น NEW ให้เด้ง Modal เปลี่ยนรหัสผ่านทันที
            if (res.status === 'NEW') {
                showChangePasswordModal(userVal, passVal);
                return; 
            }

            window.location.replace('main.html');
        } else { 
            alert("❌ Login Failed: User หรือ Password ไม่ถูกต้อง"); 
        }
    } catch (e) { 
        alert("❌ Connection Error"); 
    }
};

// --- ฟังก์ชันสร้าง UI เปลี่ยนรหัสผ่าน (Modern Modal) ---
function showChangePasswordModal(username, oldPass) {
    const backdrop = document.createElement('div');
    backdrop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.8); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(8px);";
    
    const modal = document.createElement('div');
    modal.style = "background:white; padding:32px; border-radius:20px; width:90%; max-width:400px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;";
    
    modal.innerHTML = `
        <div style="text-align:center; margin-bottom:24px;">
            <div style="background:#dcfce7; color:#166534; width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:32px;">🔑</div>
            <h2 style="margin:0; color:#0f172a; font-size:22px; font-weight:700;">Set New Password</h2>
            <p style="color:#64748b; font-size:14px; margin-top:8px;">Please set your new password before proceeding.</p>
        </div>
        
        <div style="margin-bottom:16px;">
            <label style="display:block; font-size:13px; color:#475569; margin-bottom:6px; font-weight:600;">New Password</label>
            <input type="password" id="new_p1" placeholder="Enter new password" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; outline:none; font-size:16px;">
        </div>
        
        <div style="margin-bottom:24px;">
            <label style="display:block; font-size:13px; color:#475569; margin-bottom:6px; font-weight:600;">Confirm New Password</label>
            <input type="password" id="new_p2" placeholder="Confirm new password" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; outline:none; font-size:16px;">
        </div>
        
        <button id="btn_save_pass" style="width:100%; background:#003366; color:white; border:none; padding:14px; border-radius:10px; font-weight:bold; cursor:pointer; font-size:16px; transition:all 0.2s;">
            Save & Continue
        </button>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    document.getElementById('btn_save_pass').onclick = async function() {
        const p1 = document.getElementById('new_p1').value;
        const p2 = document.getElementById('new_p2').value;
        const btn = this;

        if (p1.length < 4) { alert("❌ Password must be at least 4 characters."); return; }
        if (p1 !== p2) { alert("❌ Passwords do not match!"); return; }
        if (p1 === oldPass) { alert("❌ New password cannot be the same as old one."); return; }

        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            const updateUrl = `${API}?action=setpassword&user=${encodeURIComponent(username)}&newPass=${encodeURIComponent(p1)}&pass=${SUP_PASSWORD}`;
            const res = await fetch(updateUrl).then(r => r.json());
            if (res.success) {
                alert("✅ Password updated successfully! Please login again.");
                location.reload();
            } else {
                alert("❌ Error: " + res.msg);
                btn.disabled = false; btn.innerText = "Save & Continue";
            }
        } catch (e) {
            alert("❌ Connection Error");
            btn.disabled = false;
        }
    };
}

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

/* ===== 2. DATA LOADING & STAFF AUDIT ===== */
window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error: ", e); }
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
                    <td><b>${item.Material}</b><br><small style="color:#64748b;">${item['Product Name']}</small></td>
                    <td align="center">${staff}</td>
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

/* ===== 3. TRANSACTIONS ===== */
window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ Please fill all fields"); return; }
    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            alert("✅ Stock added to 0243 successfully!");
            document.getElementById('s_mat').value = '';
            document.getElementById('s_name_display').innerText = '';
            loadStockData('supervisor');
        } else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("❌ Connection Error"); }
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (p1 && typeof p1 === 'string') ? p1 : sessionStorage.getItem('selectedUser');
    const wo = (p1 && typeof p1 === 'string') ? "ADMIN_FORCE" : (document.getElementById('wo_' + mat)?.value || "");
    const qty = (p1 && typeof p1 === 'string') ? 1 : (document.getElementById('qty_' + mat)?.value || 1);
    if(!wo) { alert("❌ Please enter Work Order (WO#)"); return; }
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Transaction logged!"); loadStockData(p1 ? 'supervisor' : 'deduct'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { alert("✅ " + type.toUpperCase() + " Success!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. STAFF MANAGEMENT & UI ===== */
window.resetStaffPassword = async function(staffName) {
    const tempPass = prompt(`Set temporary password for ${staffName}:`, "1234");
    if (!tempPass) return;
    if(!confirm(`Reset ${staffName}'s password to "${tempPass}"?\nStatus will change to 'NEW' for forced update.`)) return;
    const url = `${API}?action=setpassword&user=${encodeURIComponent(staffName)}&newPass=${encodeURIComponent(tempPass)}&pass=${SUP_PASSWORD}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) alert(`✅ Reset successful.\nStaff must login and set a new password.`);
        else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Connection Error"); }
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
                ${mode === 'withdraw' ? `<button onclick="window.executeTransaction('withdraw', '${item.Material}', 1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:80px; padding:5px; border-radius:4px; border:1px solid #ccc;">
                        <button onclick="window.handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">USE</button>
                    </div>` : 
                  mode === 'return' ? `<button onclick="window.executeTransaction('return', '${item.Material}', 1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : (matCode ? "❌ Not found" : "");
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
checkAuth();
