/* ==========================================================================
   QIAGEN INVENTORY - THE ULTIMATE FIX (NO MORE ERRORS)
   - FIXED: Connection Error (URL Validation)
   - FIXED: History "undefined" (Correct Array Mapping)
   - FIXED: Modern Admin Login UI (No more browser prompt)
   ========================================================================== */

// *** ตรวจสอบ URL นี้ให้มั่นใจว่าคือตัวล่าสุดที่ Deploy จาก Google Sheets ***
const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & MODERN ADMIN MODAL ===== */
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
            if (res.status === 'NEW') { showChangePasswordModal(userVal); return; }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed: User หรือ Password ผิด"); }
    } catch (e) { alert("❌ Connection Error: URL ของ Web App อาจจะผิดหรือยังไม่ได้เลือก 'Anyone'"); }
};

// สร้างหน้าต่าง Login ของ Admin ให้สวยงาม (ไม่ต้องใช้ prompt จืดๆ)
if (!document.getElementById('admin-login-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'admin-login-overlay';
    overlay.style = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; justify-content:center; align-items:center; backdrop-filter:blur(5px);";
    overlay.innerHTML = `
        <div style="background:white; padding:40px; border-radius:20px; width:320px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.4);">
            <div style="font-size:45px; margin-bottom:15px;">🔒</div>
            <h3 style="margin:0 0 20px; color:#003366;">Supervisor Login</h3>
            <input type="password" id="admin_p" placeholder="Admin Password" style="width:100%; padding:15px; margin-bottom:20px; border:2px solid #ddd; border-radius:10px; font-size:18px; text-align:center;">
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('admin-login-overlay').style.display='none'" style="flex:1; padding:12px; background:#eee; border:none; border-radius:10px; cursor:pointer;">Cancel</button>
                <button id="admin_submit" style="flex:1; padding:12px; background:#003366; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">Login</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    
    document.getElementById('admin_submit').onclick = function() {
        if (document.getElementById('admin_p').value === SUP_PASSWORD) {
            sessionStorage.setItem('selectedUser', 'Supervisor');
            window.location.href = 'supervisor.html';
        } else { alert("❌ รหัสผ่าน Admin ไม่ถูกต้อง"); }
    };
}

window.goToAdmin = () => { 
    document.getElementById('admin-login-overlay').style.display = 'flex'; 
    document.getElementById('admin_p').value = '';
    document.getElementById('admin_p').focus();
};

/* ===== 2. HISTORY FIX (แก้คำว่า undefined) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success && res.data) {
            // ดึงค่าตามลำดับคอลัมน์ใน Sheets: 0=Date, 1=Material, 3=ProductName, 7=WO, 4=Type
            container.innerHTML = res.data.map(row => `
                <tr>
                    <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                    <td><b>${row[1] || '-'}</b></td>
                    <td>${row[3] || '-'}</td>
                    <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                    <td><span style="background:#e2e8f0; padding:3px 8px; border-radius:5px; font-size:11px;">${row[4] || ''}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">Error loading history</td></tr>'; }
};

/* ===== 3. RENDERING & TRANSACTIONS ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Data Load Error", e); }
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
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:50px;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data available</td></tr>';
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ สำเร็จ!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Connection Error"); }
};

window.handleDeductClick = async function(mat, staff = null) {
    const user = staff || sessionStorage.getItem('selectedUser');
    const woInput = document.getElementById('wo_' + mat);
    const wo = staff ? prompt("ระบุ WO# สำหรับ " + mat + ":") : (woInput ? woInput.value.trim() : "");
    if (!wo) { alert("❌ ต้องระบุ WO#"); return; }

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ บันทึกแล้ว!"); loadStockData(staff ? 'supervisor' : 'deduct'); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. UTILS & AUTH CHECK ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) window.location.replace('index.html');
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user;
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };

window.checkAuth();
