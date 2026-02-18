/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (FINAL COMPLETED)
   - รวมระบบ Login KM/TK/PK และระบบ Password Reset
   - รวมระบบจัดการหน้าตารางทุกโหมด (Withdraw/Return/Deduct/All)
   - แก้ไขการแสดงผลชื่อผู้ใช้ให้ตรงกับ main.html
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
let currentUserData = null; 

/* ===== 1. AUTHENTICATION & SESSION ===== */

// ฟังก์ชันเช็คสิทธิ์และแสดงชื่อผู้ใช้ (แก้ไขให้ตรงกับ id="user_display")
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) {
        location.href = 'index.html';
        return false;
    }
    const displayElem = document.getElementById('user_display');
    if (displayElem) {
        displayElem.innerText = user; // แสดงชื่อเต็ม เช่น Kitti
    }
    return true;
};

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
                // ส่วนที่เคยขาด: เรียกหน้าต่างตั้งรหัสผ่านใหม่
                currentUserData = res;
                document.getElementById('welcome-msg').innerText = `Welcome, ${res.fullName}!`;
                document.getElementById('reset-modal').style.display = 'flex';
            } else {
                sessionStorage.setItem('selectedUser', res.fullName);
                location.href = 'main.html';
            }
        } else {
            alert("❌ " + (res.msg || "Incorrect Username or Password"));
        }
    } catch (e) {
        alert("❌ Connection Error.");
    }
};

window.submitNewPassword = async function() {
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (newPass.length < 4) {
        alert("Password must be at least 4 characters.");
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
            alert("✅ Password updated!");
            sessionStorage.setItem('selectedUser', currentUserData.fullName);
            location.href = 'main.html';
        }
    } catch (e) { alert("❌ Error updating password."); }
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

/* ===== 2. DATA LOADING & RENDERING ===== */

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
        const stock0243 = Number(item['0243'] || 0);
        const stockUser = Number(item[user] || 0);
        
        if ((mode === 'deduct' || mode === 'return') && stockUser <= 0) return;

        html += `<tr>
            <td>
                <div style="font-weight:bold;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
            </td>
            <td align="center"><b>${(mode === 'all' || mode === 'withdraw') ? stock0243 : stockUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:40px;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)">Withdraw</button>
                    </div>` : 
                  mode === 'deduct' ? `
                    <div style="display:flex; gap:4px;">
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px;">
                        <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white;">USE</button>
                    </div>` : 
                  mode === 'return' ? `
                    <button onclick="executeTransaction('return', '${item.Material}', 1)" style="background:#16a34a; color:white;">Return</button>` : 
                  mode === 'all' ? `<span>● ${stock0243 > 0 ? 'In Stock' : 'Empty'}</span>` : ''}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No Data</td></tr>';
};

/* ===== 3. TRANSACTIONS ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Success!"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    if(!wo) return alert("Please enter WO#");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Recorded"); loadStockData('deduct'); }
};
/* ===== ฟังก์ชันค้นหา (Search Stock) - เพิ่มเติมเพื่อให้ปุ่มค้นหาทำงานได้ ===== */
window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    
    // กรองข้อมูลจาก window.allRows ที่โหลดมาแล้ว
    const filtered = window.allRows.filter(item => {
        const materialMatch = String(item.Material || "").toLowerCase().includes(q);
        const nameMatch = String(item['Product Name'] || "").toLowerCase().includes(q);
        return materialMatch || nameMatch;
    });

    // ส่งข้อมูลที่กรองแล้วไปแสดงผลใหม่ในตาราง
    renderTable(filtered, mode);
};
