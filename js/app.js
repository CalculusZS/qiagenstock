/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (ULTRA STABLE V8.0)
   - FIXED: Sticky Session & Path Bypass (แก้ปัญหาเด้งออกแบบถาวร)
   - UI: 100% English, Wide WO Input, Professional Admin Modal
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 

/* ===== 1. CORE AUTH SYSTEM (ป้องกันการเด้งออก) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path === '/' || path.endsWith('/');

    // ถ้าไม่มี User และไม่ได้อยู่หน้า Login -> ให้เด้งไปหน้า Login
    if (!user && !isLoginPage) {
        window.location.replace('index.html');
        return false;
    }
    
    // ถ้ามี User และเผลออยู่ที่หน้า Login -> ให้เด้งไปหน้า Main
    if (user && isLoginPage) {
        window.location.replace('main.html');
        return true;
    }

    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { displayElem.innerText = user; }
    return true;
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    if (!userVal || !passVal) { alert("Please enter credentials"); return; }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res.success) {
            // บันทึกข้อมูลลง Session Storage ทันที
            sessionStorage.setItem('selectedUser', res.fullName); 
            
            if (res.status === 'FIRST_TIME') {
                document.getElementById('welcome-msg').innerText = `Welcome, ${res.fullName}!`;
                document.getElementById('reset-modal').style.display = 'flex';
            } else {
                // ย้ายหน้าทันทีหลังจากเซ็ตค่าสำเร็จ
                window.location.replace('main.html'); 
            }
        } else {
            alert("❌ " + (res.msg || "Login Failed"));
        }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. ADMIN & MODAL SYSTEM ===== */

window.goToAdmin = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'flex';
    else {
        const p = prompt("Enter Supervisor Password:");
        if (p === SUP_PASSWORD) window.location.assign('supervisor.html');
    }
};

window.submitAdminPass = function() {
    if (document.getElementById('admin-pass-input').value === SUP_PASSWORD) {
        window.location.assign('supervisor.html');
    } else {
        alert("❌ Incorrect Password");
    }
};

window.closeAdminModal = function() {
    document.getElementById('admin-modal').style.display = 'none';
};

/* ===== 3. STOCK OPERATIONS ===== */

window.loadStockData = async function(mode) {
    if (!sessionStorage.getItem('selectedUser')) return window.location.replace('index.html');
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
                <div style="display:flex; gap:5px; justify-content:flex-end;">
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
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px;">No items found.</td></tr>';
};

/* ===== 4. CORE LOGIC ===== */

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

window.searchStock = function(q, mode) {
    const query = q.toLowerCase().trim();
    const filtered = window.allRows.filter(i => String(i.Material || "").toLowerCase().includes(query) || String(i['Product Name'] || "").toLowerCase().includes(query));
    renderTable(filtered, mode);
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
window.executeDeduct = window.handleDeductClick;

// บังคับเช็คสิทธิ์ทันทีที่โหลดสคริปต์
checkAuth();
