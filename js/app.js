/* ==========================================================================
   QIAGEN INVENTORY - FINAL MASTER RESTORE (วางทับแล้วใช้งานได้ทันที)
   --------------------------------------------------------------------------
   - FIXED: Login PK -> Phurilap mapping & Display name fix.
   - FIXED: Showall.html 0243 stock display.
   - RESTORED: Original Password Modal & All Action Buttons.
   - RESTORED: History mapping (No undefined).
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// ตารางชื่อพนักงาน (แก้ไขจาก PK ให้โชว์ Phurilap)
const USER_MAP = {
    'KM': 'Kitti',
    'TK': 'Tatchai',
    'PSO': 'Parinyachat',
    'PK': 'Phurilap',
    'PST': 'Penporn',
    'PA': 'Phuriwat'
};

window.allRows = []; 

/* ===== 1. ระบบตรวจสอบสิทธิ์และแสดงชื่อ (แก้จุดที่ชื่อไม่ขึ้น) ===== */
window.checkAuth = function() {
    const userKey = sessionStorage.getItem('userKey'); 
    const userFull = USER_MAP[userKey] || userKey;
    
    if (!userKey && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    // ฟังก์ชันยัดชื่อใส่ทุกจุดที่อาจจะเป็นไปได้ใน HTML ของคุณ
    const renderName = () => {
        const ids = ['user_display', 'userName', 'display_user', 'username', 'logged_in_as'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el && userKey) el.innerText = userFull;
        });
    };

    renderName();
    window.addEventListener('load', renderName);
    setTimeout(renderName, 500); // กันเหนียวสำหรับหน้าที่โหลดช้า
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('userKey', userKey);
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userKey);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. การดึงข้อมูลและสร้างตาราง (Showall / Withdraw / Return / Deduct) ===== */
window.loadStockData = async function(mode) {
    try {
        const isShowAll = window.location.pathname.includes('showall.html');
        const fetchMode = isShowAll ? 'all' : mode;

        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (fetchMode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, fetchMode);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('stock-data');
    if (!tbody) return;
    const userKey = sessionStorage.getItem('userKey');
    
    tbody.innerHTML = data.map(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[userKey] || 0);
        
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return '';
        const displayQty = (mode === 'withdraw' || mode === 'all') ? s0243 : sUser;

        return `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366; color:white; padding:8px 12px; border:none; border-radius:8px; cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px; padding:5px; border:1px solid #ccc; border-radius:5px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444; color:white; padding:8px 12px; border:none; border-radius:8px; cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981; color:white; padding:8px 12px; border:none; border-radius:8px; cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

/* ===== 3. หน้าต่างเปลี่ยนรหัสผ่าน (กู้คืนจากไฟล์ 24 เดิมของคุณ) ===== */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay') || document.createElement('div');
    overlay.id = 'modern-modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center;";
    document.body.appendChild(overlay);
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:360px; text-align:center;">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366;">Set New Password</h2>
        <input type="password" id="new-p1" placeholder="New Password" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; width:100%;">Update</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

/* ===== 4. หน้าประวัติ HISTORY (แก้ค่า Undefined) ===== */
window.loadHistory = async function() {
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    try {
        const response = await fetch(`${API}?action=gethistory&password=${MASTER_PASS}&t=${Date.now()}`);
        const res = await response.json();
        if (res.success && res.data) {
            listDiv.innerHTML = res.data.map(item => `
                <div class="history-row">
                    <div class="col-date">${item['Date and Time']}</div>
                    <div class="col-mat">${item['Material']}</div>
                    <div class="col-inst">${item['Instrument'] || '-'}</div>
                    <div class="col-pname">${item['Product Name']}</div>
                    <div class="col-wo">${item['Work Order'] || '-'}</div>
                    <div class="col-type"><span class="type-tag ${item['Transaction Type']}">${item['Transaction Type']}</span></div>
                    <div class="col-qty">${item['Qty']}</div>
                    <div class="col-user">${item['User']}</div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
};

/* ===== 5. ฟังก์ชันอื่นๆ (Audit, Supervisor, Logout) ===== */
window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    Object.keys(USER_MAP).forEach(key => {
        data.forEach(item => {
            const qty = Number(item[key] || 0);
            if (qty > 0) {
                html += `<tr><td><b>${item.Material}</b></td><td>${USER_MAP[key]}</td><td align="center"><b>${qty}</b></td><td align="right"><input type="text" id="audit_wo_${item.Material}_${key}" placeholder="WO#" style="width:80px;padding:5px;"><button onclick="handleAuditDeduct('${item.Material}','${key}')" style="background:#ef4444;color:white;border:none;padding:5px 10px;border-radius:5px;margin-left:5px;cursor:pointer;">Deduct</button></td></tr>`;
            }
        });
    });
    tbody.innerHTML = html;
};

window.executeAction = async function(type, mat, qty) {
    const userKey = sessionStorage.getItem('userKey');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeduct = async function(mat) {
    const userKey = sessionStorage.getItem('userKey');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('deduct'); }
};

window.handleAuditDeduct = async function(mat, key) {
    const wo = document.getElementById(`audit_wo_${mat}_${key}`)?.value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(key)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData('supervisor'); }
};

window.goToAdmin = function() {
    const p = prompt("Supervisor Password:");
    if (p === SUP_PASSWORD) { sessionStorage.setItem('userKey', 'Supervisor'); window.location.href = 'supervisor.html'; }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// เริ่มต้นระบบ
window.checkAuth();
