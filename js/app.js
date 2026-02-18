/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE COMPLETE VERSION (MATCH WITH BACKEND V6.0)
   - FIXED: Add Stock (ใช้ action 'add' ตรงตาม App Script)
   - FIXED: Staff Inventory Audit (แสดงข้อมูลสต็อกรายคนครบถ้วน)
   - FIXED: Load Error & Search (กู้คืนฟังก์ชันที่หายไปทั้งหมด)
   - PRESERVED: Login, Withdraw, Return, Use, Search, Reset Password
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbwsU6rp8fvviV3aako-EqVABQHpQ7GQ9vOKvHR-MwnL3-AuWmTcewct_XUsuhEta1l-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN ===== */
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
        } else { alert("❌ Login Failed: " + (res ? res.msg : "User หรือ Password ไม่ถูกต้อง")); }
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
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">ไม่มีข้อมูลสต็อกพนักงาน</td></tr>';
};

/* ===== 3. TRANSACTIONS (MATCHING BACKEND ACTION 'ADD') ===== */
window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ กรุณากรอกข้อมูลให้ครบ"); return; }
    
    // เรียกใช้ action='add' ตามที่คุณตั้งไว้ใน Backend
    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            alert("✅ เพิ่มสต็อกเข้าส่วนกลางสำเร็จ!");
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

    if(!wo) { alert("❌ กรุณากรอก WO#"); return; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ บันทึกการใช้งานสำเร็จ!"); 
            loadStockData(p1 ? 'supervisor' : 'deduct'); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) { alert("✅ Success!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. RESET PASSWORD & OTHER UI ===== */
window.resetStaffPassword = async function(staffName) {
    const newPass = prompt(`กรุณากรอกรหัสผ่านใหม่สำหรับคุณ ${staffName}:`);
    if (!newPass) return;
    const url = `${API}?action=setpassword&user=${encodeURIComponent(staffName)}&newPass=${encodeURIComponent(newPass)}&pass=${SUP_PASSWORD}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) alert(`✅ เปลี่ยนรหัสผ่านให้คุณ ${staffName} เรียบร้อยแล้ว`);
        else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Error"); }
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
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : (matCode ? "❌ ไม่พบข้อมูล" : "");
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
checkAuth();
