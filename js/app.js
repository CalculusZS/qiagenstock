/* ==========================================================================
   QIAGEN INVENTORY - FULL RESTORE VERSION (FIXED NAME & SHOWALL)
   --------------------------------------------------------------------------
   - FIX: Login PK maps to Phurilap
   - FIX: Username shows on all pages (Withdraw, Return, Deduct)
   - FIX: showall.html shows all stock from 0243
   - OPTIONS: All Supervisor features included (Audit, Add, Reset)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// Mapping Table: เปลี่ยนตัวย่อเป็นชื่อเต็มสำหรับแสดงผลและหัวคอลัมน์
const USER_MAP = {
    'KM': 'Kitti',
    'TK': 'Tatchai',
    'PSO': 'Parinyachat',
    'PK': 'Phurilap',
    'PST': 'Penporn',
    'PA': 'Phuriwat'
};

const STAFF_LIST = Object.values(USER_MAP);
window.allRows = [];

/* ===== 1. ระบบจัดการชื่อผู้ใช้ (แก้ข้อ 2, 3, 4) ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    // ฟังก์ชันช่วยแสดงชื่อให้ครอบคลุมทุกหน้า HTML
    const updateUI = () => {
        const nameElements = ['user_display', 'userName', 'display_user', 'username'];
        nameElements.forEach(id => {
            const el = document.getElementById(id);
            if (el && user) el.innerText = user;
        });
        const classEl = document.querySelector('.user-display');
        if (classEl && user) classEl.innerText = user;
    };

    updateUI();
    window.addEventListener('load', updateUI);
    setTimeout(updateUI, 500); // ทำซ้ำเพื่อกันพลาด
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim().toUpperCase(); // เช่น PK
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            // บันทึกชื่อเต็ม (Phurilap) แทนตัวย่อ (PK)
            const fullName = USER_MAP[userVal] || res.fullName;
            sessionStorage.setItem('selectedUser', fullName); 
            
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. การแสดงผลตาราง (แก้ข้อ 1: showall.html) ===== */
window.loadStockData = async function(mode) {
    try {
        // ตรวจสอบว่าอยู่หน้า showall หรือไม่
        const isShowAllPage = window.location.pathname.includes('showall.html');
        const currentMode = isShowAllPage ? 'all' : mode;

        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (currentMode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, currentMode);
        }
    } catch (e) { console.error("Error", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('stock-data') || document.querySelector('tbody');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        
        // กรอง: หน้า Deduct/Return แสดงเฉพาะที่มีของในมือ
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        // หน้า showall (all) หรือ withdraw ให้โชว์คลัง 0243
        const displayQty = (mode === 'withdraw' || mode === 'all') ? s0243 : sUser;

        html += `<tr>
            <td style="padding:12px;"><b>${item.Material || '-'}</b><br><small>${item['Product Name'] || ''}</small></td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;border:none;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px;padding:5px;"><button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;border:none;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;border:none;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 3. ประวัติ & SUPERVISOR (ครบทุกออปชั่น) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data') || document.querySelector('tbody');
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

window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data') || document.querySelector('tbody');
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

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Stock Added"); loadStockData('supervisor'); }
};

window.resetStaffPassword = async function(name) {
    const newPass = prompt(`New Password for ${name}:`, "1234");
    if (!newPass) return;
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(name)}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert("✅ Success");
};

window.goToAdmin = function() {
    const pass = prompt("Enter Supervisor Password:");
    if (pass === SUP_PASSWORD) { sessionStorage.setItem('selectedUser', 'Supervisor'); window.location.href = 'supervisor.html'; }
    else if (pass !== null) alert("❌ Incorrect");
};

/* ===== 4. การทำรายการ (Transactions) ===== */
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

window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
