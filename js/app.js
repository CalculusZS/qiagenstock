/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (STABLE VERSION V9.0)
   - FIXED: Session Kick-out & Supervisor Auth (แก้ปัญหาเด้งออก)
   - UI: 100% English & Wide Input
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 

/* ===== 1. AUTHENTICATION & SESSION CONTROL ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    
    // ตรวจสอบว่าเป็นหน้า Login หรือไม่
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    // กรณีไม่มี User และไม่ได้อยู่หน้า Login -> ให้ส่งกลับไป Login
    if (!user && !isLoginPage) {
        window.location.replace('index.html');
        return false;
    }

    // แสดงชื่อผู้ใช้
    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { 
        displayElem.innerText = user; 
    }
    return true;
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    if (!userVal || !passVal) { alert("Please enter credentials"); return; }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res.success) {
            // บันทึก Session หลัก
            sessionStorage.setItem('selectedUser', res.fullName);
            
            // กรณีเป็นรหัสผ่านตั้งต้น ให้เปลี่ยนรหัสก่อน
            if (res.status === 'FIRST_TIME') {
                const welcome = document.getElementById('welcome-msg');
                if (welcome) welcome.innerText = `Welcome, ${res.fullName}!`;
                document.getElementById('reset-modal').style.display = 'flex';
            } else {
                // Login สำเร็จ ไปหน้าหลัก
                window.location.replace('main.html');
            }
        } else {
            alert("❌ " + (res.msg || "Login Failed"));
        }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. ADMIN & SUPERVISOR ACCESS ===== */

window.goToAdmin = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        const p = prompt("Enter Supervisor Password:");
        if (p === SUP_PASSWORD) {
            // บันทึกสิทธิ์ Supervisor เพื่อไม่ให้หน้า supervisor.html เตะออก
            sessionStorage.setItem('selectedUser', 'Supervisor'); 
            sessionStorage.setItem('isSupervisor', 'true');
            window.location.assign('supervisor.html');
        } else if (p !== null) {
            alert("Incorrect Password");
        }
    }
};

window.submitAdminPass = function() {
    const input = document.getElementById('admin-pass-input');
    if (input.value === SUP_PASSWORD) {
        // บันทึกสิทธิ์ก่อนย้ายหน้า เพื่อป้องกันการเด้งกลับ
        sessionStorage.setItem('selectedUser', 'Supervisor');
        sessionStorage.setItem('isSupervisor', 'true');
        window.location.assign('supervisor.html');
    } else {
        alert("❌ Incorrect Password");
        input.value = "";
    }
};

window.closeAdminModal = function() {
    document.getElementById('admin-modal').style.display = 'none';
};

/* ===== 3. STOCK & TRANSACTIONS (คงฟังก์ชันเดิม) ===== */

window.loadStockData = async function(mode) {
    if (!sessionStorage.getItem('selectedUser')) return;
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error"); }
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

        html += `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding:12px 8px;">
                <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b>${(mode === 'withdraw' || mode === 'all') ? s0243 : sUser}</b></td>
            <td align="right">
                <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                    ${mode === 'withdraw' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:40px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold;">Withdraw</button>
                    ` : mode === 'return' ? `
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:40px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold;">Return</button>
                    ` : mode === 'deduct' ? `
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:100px; padding:8px; border:1px solid #334155; border-radius:6px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:40px; padding:8px; border:1px solid #334155; border-radius:6px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:10px 14px; border-radius:6px; font-weight:bold;">USE</button>
                    ` : '●'}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px;">No data found.</td></tr>';
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    const qty = document.getElementById('qty_' + mat).value;
    if(!wo) return alert("❌ Enter WO#");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Recorded"); loadStockData('deduct'); }
};

window.logout = function() { 
    sessionStorage.clear(); 
    window.location.replace('index.html'); 
};

// Map ฟังก์ชันเก่าให้ทำงานได้
window.executeDeduct = window.handleDeductClick;

// เช็คสิทธิ์ทันทีเมื่อโหลดหน้าเว็บ
checkAuth();
