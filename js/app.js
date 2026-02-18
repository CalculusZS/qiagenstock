/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (FINAL COMPLETED V5.0)
   - รวมทุกฟังก์ชัน: Login KM/TK/PK, Password Reset, Search, Qty Input
   - ปรับปรุง UI: ช่อง WO กว้างขึ้น, ปุ่มกดง่ายขึ้น, รองรับทุกหน้าจอ
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
let currentUserData = null; 

/* ===== 1. AUTH & SESSION (แสดงชื่อผู้ใช้) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) {
        location.href = 'index.html';
        return false;
    }
    const displayElem = document.getElementById('user_display');
    if (displayElem) {
        displayElem.innerText = user;
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

    if (newPass.length < 4) { alert("Password must be at least 4 characters."); return; }
    if (newPass !== confirmPass) { alert("Passwords do not match!"); return; }

    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(currentUserData.fullName)}&newPass=${encodeURIComponent(newPass)}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ Password updated!");
            sessionStorage.setItem('selectedUser', currentUserData.fullName);
            location.href = 'main.html';
        }
    } catch (e) { alert("❌ Error."); }
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

/* ===== 2. DATA LOADING & SEARCH (ฟังก์ชันค้นหาที่หายไป) ===== */

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
        return String(item.Material || "").toLowerCase().includes(q) || 
               String(item['Product Name'] || "").toLowerCase().includes(q);
    });
    renderTable(filtered, mode);
};

/* ===== 3. UI RENDERING (ปรับปรุงช่องใส่จำนวน และ WO ให้กว้างขึ้น) ===== */

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
                <td style="padding: 10px;">
                    <div style="font-weight:bold; color:#1e293b;">${item.Material}</div>
                    <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                </td>
                <td align="center" style="font-size:16px;">
                    <b>${(mode === 'withdraw' || mode === 'all') ? stock0243 : stockUser}</b>
                </td>
                <td align="right" style="padding: 10px;">
                    <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
                        
                        ${mode === 'withdraw' ? `
                            <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:45px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                            <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                    style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">เบิก</button>
                        ` : mode === 'return' ? `
                            <input type="number" id="qty_${item.Material}" value="1" min="1" max="${stockUser}" style="width:45px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                            <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                    style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">คืน</button>
                        ` : mode === 'deduct' ? `
                            <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:90px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                            <input type="number" id="qty_${item.Material}" value="1" min="1" max="${stockUser}" style="width:45px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                            <button onclick="handleDeductClick('${item.Material}')" 
                                    style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">USE</button>
                        ` : `<span>● ${stock0243 > 0 ? 'In Stock' : 'Empty'}</span>`}

                    </div>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px;">No items found.</td></tr>';
};

/* ===== 4. TRANSACTION LOGIC ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ ทำรายการสำเร็จ!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Network Error"); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    const qty = document.getElementById('qty_' + mat).value;
    if(!wo) { alert("❌ กรุณาใส่เลข Work Order (WO#)"); return; }
    
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ ตัดสต็อกสำเร็จ"); loadStockData('deduct'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};
