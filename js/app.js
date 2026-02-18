/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (STABLE AUTH V7.5)
   - Fixed: Redirect Loop / Kick-out issue (แก้ปัญหาเด้งออก)
   - Added: Admin Modal & English UI
   - Features: KM/TK/PK Support, Search, Wide WO Input
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 
let currentUserData = null; 

/* ===== 1. AUTHENTICATION (แก้ไขส่วนที่ทำให้เด้งออก) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    // ตรวจสอบว่าถ้าไม่มี User และไม่ใช่หน้า index.html ให้ส่งกลับไป login
    if (!user) {
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            window.location.replace('index.html'); 
            return false;
        }
    }
    
    // แสดงชื่อผู้ใช้ถ้ามี element รองรับ
    const displayElem = document.getElementById('user_display');
    if (displayElem && user) { 
        displayElem.innerText = user; 
    }
    return true;
};

window.handleLogin = async function() {
    const userInput = document.getElementById('username-input').value.trim().toUpperCase();
    const password = document.getElementById('password-input').value.trim();
    if (!userInput || !password) { alert("Please enter both Username and Password."); return; }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userInput)}&pass=${encodeURIComponent(password)}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res.success) {
            // บันทึก Session ให้เรียบร้อยก่อนย้ายหน้า
            sessionStorage.setItem('selectedUser', res.fullName); 
            
            if (res.status === 'FIRST_TIME') {
                currentUserData = res;
                document.getElementById('welcome-msg').innerText = `Welcome, ${res.fullName}!`;
                document.getElementById('reset-modal').style.display = 'flex';
            } else {
                // ใช้ replace เพื่อป้องกันการกด back กลับมาหน้า login
                window.location.replace('main.html'); 
            }
        } else { 
            alert("❌ " + (res.msg || "Incorrect Username or Password")); 
        }
    } catch (e) { alert("❌ Connection Error."); }
};

/* ===== 2. ADMIN & SUPERVISOR SYSTEM ===== */

window.goToAdmin = function() {
    const adminModal = document.getElementById('admin-modal');
    if (adminModal) adminModal.style.display = 'flex';
    else {
        const pass = prompt("Enter Supervisor Password:");
        if (pass === SUP_PASSWORD) window.location.replace('supervisor.html');
    }
};

window.submitAdminPass = function() {
    const pass = document.getElementById('admin-pass-input').value;
    if (pass === SUP_PASSWORD) {
        window.location.replace('supervisor.html');
    } else {
        alert("❌ Access Denied");
        document.getElementById('admin-pass-input').value = "";
    }
};

window.closeAdminModal = function() {
    document.getElementById('admin-modal').style.display = 'none';
};

/* ===== 3. DATA LOADING & UI ===== */

window.loadStockData = async function(mode) {
    if (!checkAuth()) return; // เช็คสิทธิ์ก่อนโหลดข้อมูล
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const stock0243 = Number(item['0243'] || 0);
        const stockUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && stockUser <= 0) return;

        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 8px;">
                    <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                    <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                </td>
                <td align="center"><b>${(mode === 'withdraw' || mode === 'all') ? stock0243 : stockUser}</b></td>
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

/* ===== 4. TRANSACTIONS ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Success!"); loadStockData(type); }
    } catch (e) { alert("❌ Error"); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    const qty = document.getElementById('qty_' + mat).value;
    if(!wo) return alert("❌ Please enter WO#");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Recorded"); loadStockData('deduct'); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 5. SEARCH & UTILS ===== */

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(item => {
        return String(item.Material || "").toLowerCase().includes(q) || 
               String(item['Product Name'] || "").toLowerCase().includes(q);
    });
    renderTable(filtered, mode);
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
window.executeDeduct = window.handleDeductClick;
