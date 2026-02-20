/* ==========================================================================
   QIAGEN INVENTORY - ABSOLUTE RESTORE (FIXED ISSUES ONLY)
   --------------------------------------------------------------------------
   - FIX: Login PK -> Phurilap (Full Name Sync)
   - FIX: User Display on all pages (Withdraw, Return, Deduct)
   - FIX: showall.html display from column '0243'
   - KEEP: Original Password Modal and Supervisor Options
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// ตาราง Mapping เพื่อให้ Login PK แล้วได้ชื่อ Phurilap
const USER_MAP = {
    'KM': 'Kitti',
    'TK': 'Tatchai',
    'PSO': 'Parinyachat',
    'PK': 'Phurilap',
    'PST': 'Penporn',
    'PA': 'Phuriwat'
};

window.allRows = []; 
const STAFF_LIST = Object.values(USER_MAP);

/* ===== 1. AUTH & USER DISPLAY (แก้ปัญหาชื่อไม่ขึ้น) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser'); // ชื่อเต็ม
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    // ฟังก์ชันแสดงชื่อผู้ใช้ (ค้นหาทุก ID ที่เป็นไปได้ใน HTML ของคุณ)
    const renderUser = () => {
        const ids = ['user_display', 'userName', 'display_user', 'username_display'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el && user) el.innerText = user;
        });
        const classEl = document.querySelector('.user-display');
        if (classEl && user) classEl.innerText = user;
    };

    renderUser();
    window.addEventListener('load', renderUser);
    setTimeout(renderUser, 300); // กันพลาดกรณีโหลดช้า
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim().toUpperCase(); // PK, KM...
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            // บันทึกทั้งตัวย่อและชื่อเต็ม
            sessionStorage.setItem('userKey', userVal);
            sessionStorage.setItem('selectedUser', USER_MAP[userVal] || res.fullName);
            
            if (res.status === 'NEW') { 
                // เรียก Modal เดิมใน HTML ของคุณ (ถ้ามีฟังก์ชันนี้อยู่แล้ว)
                if(typeof window.showChangePasswordModal === 'function') {
                    window.showChangePasswordModal(userVal);
                } else {
                    alert("Please change your password.");
                }
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. STOCK DATA (แก้ปัญหาหน้า Showall) ===== */
window.loadStockData = async function(mode) {
    try {
        // เช็คหน้า showall.html
        const isShowAll = window.location.pathname.includes('showall.html');
        const currentMode = isShowAll ? 'all' : mode;

        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (currentMode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, currentMode);
        }
    } catch (e) { console.error("Data Load Error", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('stock-data') || document.querySelector('tbody');
    if (!tbody) return;

    const user = sessionStorage.getItem('selectedUser'); // ชื่อเต็ม เช่น Phurilap
    let html = '';

    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        
        // กรองหน้าตัดจ่าย/คืน: โชว์เฉพาะที่มีของในมือ
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        // หน้าเบิก หรือ Showall: โชว์ยอดจากคลัง 0243
        const displayQty = (mode === 'withdraw' || mode === 'all') ? s0243 : sUser;

        html += `<tr>
            <td style="padding:12px;"><b>${item.Material || '-'}</b><br><small>${item['Product Name'] || ''}</small></td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style=\"display:flex;gap:5px;justify-content:flex-end;\"><input type=\"text\" id=\"wo_${item.Material}\" placeholder=\"WO#\" style=\"width:70px;padding:5px;\"><button onclick=\"handleDeduct('${item.Material}')\" style=\"background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;\">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data available</td></tr>';
};

/* ===== 3. SUPERVISOR & HISTORY (คงเดิมทุกอย่าง) ===== */
window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data') || document.querySelector('tbody');
    if (!tbody) return;
    let html = '';
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            const qty = Number(item[staff] || 0);
            if (qty > 0) {
                html += `<tr>
                    <td><b>${item.Material}</b></td>
                    <td align="center">${staff}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right">
                        <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:80px; padding:5px;">
                        <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px;">Deduct</button>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html;
};

window.loadHistory = async function() {
    const container = document.getElementById('history-data') || document.querySelector('tbody');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            container.innerHTML = res.data.map(row => `<tr>
                <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                <td><b>${row[1]}</b></td>
                <td>${row[3]}</td>
                <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                <td><span style="background:#eee; padding:3px 8px; border-radius:5px;">${row[4]}</span></td>
            </tr>`).join('');
        }
    } catch (e) { console.error(e); }
};

window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeduct = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('deduct'); }
};

window.handleAuditDeduct = async function(mat, staff) {
    const wo = document.getElementById(`audit_wo_${mat}_${staff}`)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(staff)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('supervisor'); }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Stock Added"); loadStockData('supervisor'); }
};

window.goToAdmin = function() {
    const p = prompt("Admin Password:");
    if (p === SUP_PASSWORD) { sessionStorage.setItem('selectedUser', 'Supervisor'); window.location.href = 'supervisor.html'; }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
