/* ==========================================================================
   QIAGEN STOCK MANAGEMENT SYSTEM - app.js (FINAL V4.1)
   - Support: KM, TK, PK Login & Display Full Name
   - Feature: Modern Password Reset Modal, Confirm Password, English UI
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = [];
let currentUserData = null; 

/* ===== 1. LOGIN & AUTHENTICATION ===== */

window.handleLogin = async function() {
    const userInput = document.getElementById('username-input').value.trim().toUpperCase();
    const password = document.getElementById('password-input').value.trim();

    if (!userInput || !password) {
        alert("Please enter both Username and Password.");
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userInput)}&pass=${encodeURIComponent(password)}`;
        const res = await fetch(url).then(r => r.json());

        if (res.success) {
            if (res.status === 'FIRST_TIME') {
                // แสดง Modal เปลี่ยนรหัสผ่าน
                currentUserData = res;
                document.getElementById('welcome-msg').innerText = `Welcome, ${res.fullName}!`;
                document.getElementById('reset-modal').style.display = 'flex';
            } else {
                // บันทึกชื่อเต็มเข้า Session เพื่อไปโชว์ในหน้า Main
                sessionStorage.setItem('selectedUser', res.fullName);
                location.href = 'main.html';
            }
        } else {
            alert("❌ " + (res.msg || "Incorrect Username or Password"));
        }
    } catch (e) {
        alert("❌ Connection Error. Please try again.");
    }
};

/* ===== 2. PASSWORD RESET MODAL LOGIC ===== */

window.submitNewPassword = async function() {
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (newPass.length < 4) {
        alert("Password must be at least 4 characters long.");
        return;
    }

    if (newPass !== confirmPass) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(currentUserData.fullName)}&newPass=${encodeURIComponent(newPass)}`;
        const res = await fetch(url).then(r => r.json());

        if (res.success) {
            alert("✅ Password updated successfully!");
            sessionStorage.setItem('selectedUser', currentUserData.fullName);
            location.href = 'main.html';
        } else {
            alert("❌ Failed to update password.");
        }
    } catch (e) {
        alert("❌ Network Error.");
    }
};

window.closeModal = function() {
    document.getElementById('reset-modal').style.display = 'none';
};

/* ===== 3. SESSION & DISPLAY USER (แก้ปัญหาชื่อไม่ขึ้น) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) {
        location.href = 'index.html';
        return false;
    }
    
    // แสดงชื่อในหน้า main.html (ต้องมี id="user-display" ใน HTML)
    const displayElem = document.getElementById('user-display');
    if (displayElem) {
        displayElem.innerText = user; 
    }
    return true;
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

window.goToAdmin = function() {
    const adminPass = prompt("Enter Supervisor Password:");
    if (adminPass === SUP_PASSWORD) {
        location.href = 'supervisor.html';
    } else {
        alert("Access Denied");
    }
};

/* ===== 4. STOCK DATA & RENDERING ===== */

window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) { console.error("Fetch Error:", e); }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(item => {
        return String(item.Material).toLowerCase().includes(q) || 
               String(item['Product Name']).toLowerCase().includes(q);
    });
    renderTable(filtered, mode);
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

        html += `<tr>
            <td>
                <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b>${(mode === 'all' || mode === 'withdraw') ? stock0243 : stockUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex; gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px; padding:5px; border-radius:4px; border:1px solid #ddd;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px;">No Data Found</td></tr>';
};

/* ===== 5. TRANSACTIONS ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Success!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    if(!wo) { alert("❌ Please enter Work Order (WO#)"); return; }
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Usage Recorded"); loadStockData('deduct'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};
