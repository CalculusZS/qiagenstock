/* ==========================================================================
   QIAGEN STOCK MANAGEMENT SYSTEM - app.js (FINAL VERSION)
   - Support: KM, TK, PK Login
   - Feature: Modern Password Reset Modal & English UI
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = [];
let currentUserData = null; 

// --- 1. LOGIN SYSTEM ---
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
                // เด้งหน้าต่าง Modal ให้ตั้งรหัสผ่านใหม่
                currentUserData = res;
                document.getElementById('welcome-msg').innerText = `Welcome, ${res.fullName}!`;
                document.getElementById('reset-modal').style.display = 'flex';
            } else {
                // บันทึกชื่อพนักงาน (เช่น Kitti, Phurilap) เข้า Session
                sessionStorage.setItem('selectedUser', res.fullName);
                location.href = 'main.html';
            }
        } else {
            alert("❌ " + (res.msg || "Incorrect Username or Password"));
        }
    } catch (e) {
        alert("❌ Connection Error. Please try again later.");
    }
};

// --- 2. PASSWORD RESET LOGIC ---
window.submitNewPassword = async function() {
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (newPass.length < 4) {
        alert("Password must be at least 4 characters long.");
        return;
    }

    if (newPass !== confirmPass) {
        alert("Passwords do not match. Please try again.");
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

window.goToAdmin = function() {
    const adminPass = prompt("Enter Supervisor Password:");
    if (adminPass === SUP_PASSWORD) {
        location.href = 'supervisor.html';
    } else {
        alert("Access Denied");
    }
};

/* ===== 3. STOCK FUNCTIONS (Withdraw/Return/Deduct) ===== */
window.checkAuth = function() {
    if (!sessionStorage.getItem('selectedUser')) location.href = 'index.html';
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

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

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const stockCentral = Number(item['0243'] || 0);
        const stockUser = Number(item[user] || 0);
        
        if ((mode === 'deduct' || mode === 'return') && stockUser <= 0) return;

        html += `<tr>
            <td>
                <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b>${(mode === 'all' || mode === 'withdraw') ? stockCentral : stockUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" class="btn">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex; gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px; border-radius:4px; border:1px solid #ddd;"><button onclick="handleDeductClick('${item.Material}')" class="btn btn-red">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" class="btn btn-green">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No items found.</td></tr>';
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("Success!"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    if(!wo) return alert("Please enter WO#");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("Usage Recorded"); loadStockData('deduct'); }
};
