/* ==========================================================================
   QIAGEN INVENTORY - FULL MASTER RESTORE (COMPLETE VERSION)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. UI & AUTHENTICATION (แก้เรื่องแสดงชื่อผู้ใช้) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }
    const display = document.getElementById('user_display');
    if (display && user) display.innerText = user; // ข้อ 1: โชว์ชื่อมุมขวา
};

// ฟังก์ชัน Modal สวยงามสำหรับ Login Admin และเปลี่ยนรหัส
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modern-modal-overlay';
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(10px);";
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:350px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.5);">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

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
            if (res.status === 'NEW') { 
                showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error (Check API URL)"); }
};

/* ===== 2. DATA & HISTORY (แก้เรื่อง undefined และ Showall) ===== */
window.loadStockData = async function(mode) {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res && res.success) {
        window.allRows = res.data;
        if (mode === 'supervisor') renderStaffAudit(res.data);
        else renderTable(res.data, mode); // ข้อ 3: แก้หน้า Showall ให้มีข้อมูล
    }
};

window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success && res.data) {
        // ข้อ 2: Mapping ให้ตรงกับ Backend (0:Date, 1:Material, 3:Product, 7:WO)
        container.innerHTML = res.data.map(row => `
            <tr>
                <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                <td><b>${row[1] || ''}</b></td>
                <td>${row[3] || ''}</td>
                <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                <td><span style="background:#eee; padding:3px 8px; border-radius:5px;">${row[4] || ''}</span></td>
            </tr>`).join('');
    }
};

/* ===== 3. SUPERVISOR ACTIONS (แก้เรื่อง Reset Pass และช่อง WO) ===== */
window.goToAdmin = function() {
    showModernModal(`
        <h3 style="color:#003366;">Supervisor Access</h3>
        <input type="password" id="adm-pass" placeholder="Password" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center;">
        <button onclick="authAdmin()" style="width:100%; padding:12px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; width:100%;">Login</button>
    `);
};

window.authAdmin = function() {
    const p = document.getElementById('adm-pass').value;
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else { alert("❌ Incorrect Password"); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`Set New Password for ${name}:`, "1234");
    if (!newPass) return;
    // ข้อ 4: ใช้ action=setpassword ตามหลังบ้าน V7.1
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert(`✅ Reset ${name} Success!`);
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
                    <td><b>${item.Material}</b></td>
                    <td align="center">${staff}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="text" id="audit_wo_${item.Material}_${staff}" placeholder="WO#" style="width:150px; padding:8px; border:1px solid #ccc; border-radius:5px;">
                            <button onclick="handleAuditDeduct('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">Deduct</button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html;
};

/* ===== 4. TRANSACTIONS ===== */
window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    tbody.innerHTML = data.map(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return '';
        return `<tr>
            <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)">Withdraw</button>` : 
                  mode === 'deduct' ? `<input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;"><button onclick="handleDeduct('${item.Material}')">USE</button>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeduct = async function(mat) {
    const user = sessionStorage.getItem('selectedUser');
    const wo = document.getElementById('wo_' + mat)?.value;
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Done"); loadStockData('deduct'); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
