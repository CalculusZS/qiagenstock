/* ==========================================================================
   QIAGEN INVENTORY - TOTAL REPAIR MASTER (FULL OPTIONS)
   --------------------------------------------------------------------------
   1. FIXED: showall.html - ดึงข้อมูลจากคอลัมน์ '0243' ได้แน่นอน
   2. FIXED: withdraw/return/deduct - โชว์ชื่อเต็ม Kitti, Tatchai ที่มุมขวา
   3. FIXED: แก้ปัญหาข้อมูลไม่ขึ้นโดยใช้ USER_MAP เชื่อมโยง KM, TK
   4. FULL OPTIONS: คงฟังก์ชัน Supervisor, Add Stock, Reset Pass ไว้ครบถ้วน
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// ตาราง Mapping สำคัญ: KM ต้องได้ Kitti, TK ต้องได้ Tatchai
const USER_MAP = {
    'KM': 'Kitti',
    'TK': 'Tatchai',
    'PSO': 'Parinyachat',
    'PK': 'Phurilap',
    'PST': 'Penporn',
    'PA': 'Phuriwat'
};

window.allRows = []; 

/* ===== 1. AUTHENTICATION & DISPLAY (แก้ปัญหาข้อ 2, 3, 4) ===== */
window.checkAuth = function() {
    const userKey = sessionStorage.getItem('userKey'); 
    const userFull = USER_MAP[userKey] || userKey; // แปลง KM เป็น Kitti
    
    if (!userKey && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    
    // แสดงชื่อที่ ID: user_display (ต้องมีใน HTML ทุกหน้า)
    const display = document.getElementById('user_display');
    if (display && userKey) {
        display.innerText = userFull; // แสดง "Kitti" หรือ "Tatchai"
    }
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userKey = uInput.value.trim().toUpperCase(); // รับ KM หรือ TK
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('userKey', userKey); // เก็บ "KM" ไว้ดึงคอลัมน์
            
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userKey);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. DATA RENDERING (แก้ปัญหาข้อ 1: Showall) ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') {
                renderStaffAudit(res.data);
            } else {
                renderTable(res.data, mode);
            }
        }
    } catch (e) { console.error("Error loading data", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const userKey = sessionStorage.getItem('userKey');
    
    tbody.innerHTML = data.map(item => {
        // ดึงค่าสต็อกกลาง 0243 (ล้างช่องว่างออกเพื่อความแม่นยำ)
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[userKey] || 0); 
        
        // ถ้าเป็นหน้าเบิก/คืน/ตัดยอด และพนักงานไม่มีของ ไม่ต้องโชว์แถวนั้น
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return '';
        
        return `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

/* ===== 3. HISTORY (แก้ปัญหา undefined) ===== */
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
                    <td><span style="background:#eee; padding:3px 8px; border-radius:5px; font-size:12px;">${row[4] || ''}</span></td>
                </tr>`).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5">Error loading history</td></tr>'; }
};

/* ===== 4. SUPERVISOR OPTIONS (FULL - ไม่ตัดออก) ===== */
window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    const STAFF_KEYS = Object.keys(USER_MAP);
    
    data.forEach(item => {
        STAFF_KEYS.forEach(key => {
            const qty = Number(item[key] || 0);
            if (qty > 0) {
                html += `<tr>
                    <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                    <td align="center">${USER_MAP[key]}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="text" id="audit_wo_${item.Material}_${key}" placeholder="WO#" style="width:150px; padding:8px; border-radius:5px; border:1px solid #ccc;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${key}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4">No inventory found in staff stock</td></tr>';
};

window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === mat);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Material Not Found";
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Stock Added"); loadStockData('supervisor'); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`Set new password for ${name}:`, "1234");
    if (!newPass) return;
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert("✅ Password Reset Success");
};

/* ===== 5. CORE TRANSACTIONS ===== */
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

window.executeAction = async function(type, mat, qty) {
    const userKey = sessionStorage.getItem('userKey');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

/* UI UTILS */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay') || document.createElement('div');
    overlay.id = 'modern-modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(10px); font-family:sans-serif;";
    document.body.appendChild(overlay);
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:360px; text-align:center;">${contentHtml}</div>`;
}

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366;">Set New Password</h2>
        <input type="password" id="new-p1" placeholder="New Password" style="width:100%; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; width:100%; cursor:pointer;">Update</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
