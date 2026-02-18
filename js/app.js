/* ==========================================================================
   QIAGEN INVENTORY - ULTIMATE MASTER RESTORE (FULL VERSION)
   - FIXED: History "undefined" (Correct Array Mapping)
   - PRESERVED: Admin Modal, Audit System, Product Lookup, Search, Change Password
   - API: เชื่อมต่อ Web App URL ล่าสุดที่คุณแก้ไขแล้ว
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & UI SETUP ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user;
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            if (res.status === 'NEW') { 
                if (window.showChangePasswordModal) showChangePasswordModal(userVal);
                else alert("Please change your password.");
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed: รหัสผ่านหรือชื่อผู้ใช้ผิด"); }
    } catch (e) { alert("❌ Connection Error: โปรดตรวจสอบสัญญาณอินเทอร์เน็ต"); }
};

/* ===== 2. ADMIN MODAL UI (สวยงามแบบหน้ากากดำ) ===== */
if (!document.getElementById('admin-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.style = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center; backdrop-filter:blur(5px);";
    overlay.innerHTML = `
        <div style="background:white; padding:40px; border-radius:20px; width:320px; text-align:center;">
            <h3 style="margin-bottom:20px; color:#003366;">Supervisor Access</h3>
            <input type="password" id="admin_p" placeholder="Admin Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('admin-overlay').style.display='none'" style="flex:1; padding:10px; border-radius:10px; border:none; cursor:pointer;">Cancel</button>
                <button id="admin_btn" style="flex:1; padding:10px; background:#003366; color:white; border-radius:10px; border:none; cursor:pointer; font-weight:bold;">Login</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('admin_btn').onclick = function() {
        if (document.getElementById('admin_p').value === SUP_PASSWORD) {
            sessionStorage.setItem('selectedUser', 'Supervisor');
            window.location.href = 'supervisor.html';
        } else { alert("❌ รหัสผ่านไม่ถูกต้อง"); }
    };
}
window.goToAdmin = () => { document.getElementById('admin-overlay').style.display = 'flex'; };

/* ===== 3. CORE DATA & HISTORY (FIXED UNDEFINED) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success && res.data) {
            container.innerHTML = res.data.map(row => `
                <tr>
                    <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                    <td><b>${row[1] || ''}</b></td>
                    <td>${row[3] || ''}</td>
                    <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                    <td><span style="background:#eee; padding:3px 6px; border-radius:4px; font-size:12px;">${row[4] || ''}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">Error loading history</td></tr>'; }
};

window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error", e); }
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
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" style="background:#003366;color:white;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:4px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444;color:white;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" style="background:#10b981;color:white;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 4. SUPERVISOR & SEARCH FUNCTIONS ===== */
window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ ไม่พบข้อมูล";
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
                    <td align="center">${staff}</td><td align="center"><b>${qty}</b></td>
                    <td align="right"><button onclick="handleDeductClick('${item.Material}','${staff}')" style="background:#ef4444;color:white;border:none;padding:5px 10px;border-radius:5px;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.searchProduct = function() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtered = window.allRows.filter(r => r.Material.toLowerCase().includes(q) || r['Product Name'].toLowerCase().includes(q));
    const mode = window.location.pathname.includes('withdraw') ? 'withdraw' : (window.location.pathname.includes('return') ? 'return' : (window.location.pathname.includes('deduct') ? 'deduct' : 'all'));
    renderTable(filtered, mode);
};

/* ===== 5. TRANSACTIONS & LOGOUT ===== */
window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    try {
        const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ สำเร็จ"); loadStockData(type); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาด"); }
};

window.handleDeductClick = async function(mat, staff = null) {
    const user = staff || sessionStorage.getItem('selectedUser');
    let wo = staff ? prompt(`Enter WO# for ${mat} (Staff: ${staff}):`) : document.getElementById('wo_'+mat)?.value;
    if (!wo) { alert("❌ กรุณาระบุ WO#"); return; }
    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ บันทึกแล้ว"); loadStockData(staff ? 'supervisor' : 'deduct'); }
    } catch (e) { alert("❌ Error"); }
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
