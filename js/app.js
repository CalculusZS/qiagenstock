/* ==========================================================================
   QIAGEN INVENTORY - THE ULTIMATE MASTER VERSION (PRESERVE ALL FEATURES)
   - FIXED: Admin & User Login (No Loop)
   - FIXED: Modern Password Modal (New & Confirm)
   - FEATURES: Withdraw, Return, Use (WO#), Search, Supervisor Audit, Reset Pass
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzDwLIahmJn4yMt_NqrRr2diHGo6BQ1TsdXBLqsDRuanUvUU2sPCBZsfWQkdMBQaY4S/exec"; 
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

            // กรณี Supervisor: ให้เข้าหน้าหลักทันที
            if (res.fullName === 'Supervisor' || passVal === SUP_PASSWORD) {
                sessionStorage.setItem('selectedUser', 'Supervisor');
                window.location.replace('main.html');
                return;
            }

            // กรณีพนักงานปกติ และต้องเปลี่ยนรหัส (สถานะ NEW)
            if (res.status === 'NEW') {
                showChangePasswordModal(userVal, passVal);
                return; 
            }

            window.location.replace('main.html');
        } else { 
            alert("❌ Login Failed: User หรือ Password ไม่ถูกต้อง"); 
        }
    } catch (e) { 
        alert("❌ Connection Error: ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้"); 
    }
};

// ฟังก์ชัน Modern Password Modal (New & Confirm)
function showChangePasswordModal(username, oldPass) {
    if (document.getElementById('pass-modal-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'pass-modal-backdrop';
    backdrop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.9); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(8px);";
    backdrop.innerHTML = `
        <div style="background:white; padding:35px; border-radius:24px; width:90%; max-width:400px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); font-family:sans-serif; text-align:center;">
            <div style="background:#dcfce7; color:#166534; width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px; font-size:32px;">🔑</div>
            <h2 style="margin:0; color:#0f172a; font-size:22px;">ตั้งรหัสผ่านใหม่</h2>
            <p style="color:#64748b; font-size:14px; margin:8px 0 20px;">เพื่อความปลอดภัย โปรดกำหนดรหัสผ่านใหม่</p>
            <input type="password" id="new_p1" placeholder="รหัสผ่านใหม่" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; margin-bottom:12px;">
            <input type="password" id="new_p2" placeholder="ยืนยันรหัสผ่านใหม่" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; margin-bottom:20px;">
            <button id="btn_save_pass" style="width:100%; background:#003366; color:white; border:none; padding:15px; border-radius:12px; font-weight:bold; cursor:pointer; font-size:16px;">บันทึกและเข้าสู่ระบบ</button>
        </div>`;
    document.body.appendChild(backdrop);
    document.getElementById('btn_save_pass').onclick = async function() {
        const p1 = document.getElementById('new_p1').value;
        const p2 = document.getElementById('new_p2').value;
        if (p1.length < 4) { alert("❌ รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"); return; }
        if (p1 !== p2) { alert("❌ รหัสผ่านไม่ตรงกัน"); return; }
        this.innerText = "กำลังบันทึก..."; this.disabled = true;
        try {
            const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(username)}&newPass=${encodeURIComponent(p1)}&pass=${SUP_PASSWORD}`).then(r => r.json());
            if (res.success) { alert("✅ เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบอีกครั้ง"); location.reload(); }
            else { alert("❌ " + res.msg); this.disabled = false; this.innerText = "บันทึกและเข้าสู่ระบบ"; }
        } catch (e) { alert("❌ Error"); this.disabled = false; }
    };
}

/* ===== 2. ADMIN MODAL UI (PRESERVED) ===== */
if (!document.getElementById('admin-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="admin-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(10px); z-index:9999; justify-content:center; align-items:center;">
            <div style="background:white; padding:40px; border-radius:24px; width:350px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); text-align:center;">
                <div style="font-size:50px; margin-bottom:15px;">🛡️</div>
                <h3 style="margin:0 0 10px 0; color:#1e293b; font-size:22px;">Supervisor System</h3>
                <input type="password" id="admin-pass-input" placeholder="Password" style="width:100%; padding:15px; border:2px solid #e2e8f0; border-radius:12px; margin-bottom:20px; box-sizing:border-box; text-align:center; font-size:20px;">
                <div style="display:flex; gap:12px;">
                    <button onclick="window.closeAdminModal()" style="flex:1; padding:12px; background:#f1f5f9; border-radius:12px; cursor:pointer;">Cancel</button>
                    <button onclick="window.submitAdminPass()" style="flex:1; padding:12px; background:#003366; color:white; border-radius:12px; cursor:pointer;">Login</button>
                </div>
            </div>
        </div>`);
}
window.goToAdmin = () => { document.getElementById('admin-modal').style.display = 'flex'; document.getElementById('admin-pass-input').focus(); };
window.closeAdminModal = () => document.getElementById('admin-modal').style.display = 'none';
window.submitAdminPass = function() {
    if (document.getElementById('admin-pass-input').value === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else { alert("❌ รหัสผ่านไม่ถูกต้อง"); }
};

/* ===== 3. DATA & TRANSACTIONS (PRESERVED) ===== */
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
                    <td align="center">${staff}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right"><button onclick="window.handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ กรุณากรอกข้อมูลให้ครบ"); return; }
    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ เพิ่มสต็อกสำเร็จ!"); loadStockData('supervisor'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (p1 && typeof p1 === 'string') ? p1 : sessionStorage.getItem('selectedUser');
    const wo = (p1 && typeof p1 === 'string') ? "ADMIN_FORCE" : (document.getElementById('wo_' + mat)?.value || "");
    const qty = (p1 && typeof p1 === 'string') ? 1 : (document.getElementById('qty_' + mat)?.value || 1);
    if(!wo) { alert("❌ กรุณาระบุ WO#"); return; }
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ บันทึกสำเร็จ!"); loadStockData(p1 ? 'supervisor' : 'deduct'); }
    } catch (e) { alert("❌ Error"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ " + type.toUpperCase() + " Success!"); loadStockData(type); }
    } catch (e) { alert("❌ Error"); }
};

window.resetStaffPassword = async function(staffName) {
    const tempPass = prompt(`ตั้งรหัสชั่วคราวให้คุณ ${staffName}:`, "1234");
    if (!tempPass) return;
    const url = `${API}?action=setpassword&user=${encodeURIComponent(staffName)}&newPass=${encodeURIComponent(tempPass)}&pass=${SUP_PASSWORD}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) alert(`✅ Reset สำเร็จ! พนักงานต้องตั้งรหัสใหม่เมื่อ Login`);
    } catch (e) { alert("❌ Error"); }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => String(i.Material).toLowerCase().includes(q) || String(i['Product Name']).toLowerCase().includes(q));
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
        html += `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="window.executeTransaction('withdraw', '${item.Material}', 1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px; padding:5px;"><button onclick="window.handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">USE</button>` : 
                  mode === 'return' ? `<button onclick="window.executeTransaction('return', '${item.Material}', 1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ ไม่พบข้อมูล";
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        window.location.replace('index.html');
        return false;
    }
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user;
    return true;
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
checkAuth();
