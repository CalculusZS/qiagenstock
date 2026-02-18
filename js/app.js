/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (FULL OPTIMIZED V3.0)
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; // ที่เก็บข้อมูลสต็อกทั้งหมดเพื่อใช้ในการค้นหา

// --- 1. ระบบ LOGIN & FORCE PASSWORD CHANGE ---
window.handleLogin = async function() {
    const userInput = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();

    if (!userInput || !password) {
        alert("กรุณากรอก Username และ Password");
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userInput)}&pass=${encodeURIComponent(password)}`;
        const res = await fetch(url).then(r => r.json());

        if (res.success) {
            if (res.status === 'FIRST_TIME') {
                const newPass = prompt(`ยินดีต้อนรับคุณ ${res.fullName}\nกรุณาตั้งรหัสผ่านใหม่ (4 ตัวขึ้นไป):`);
                if (newPass && newPass.length >= 4) {
                    await setPasswordAPI(res.fullName, newPass);
                } else {
                    alert("การตั้งรหัสผ่านไม่สำเร็จ");
                }
                return;
            }
            sessionStorage.setItem('selectedUser', res.fullName);
            location.href = 'main.html';
        } else {
            alert("❌ " + res.msg);
        }
    } catch (e) {
        alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    }
};

async function setPasswordAPI(fullName, newPass) {
    const url = `${API}?action=setpassword&user=${encodeURIComponent(fullName)}&newPass=${encodeURIComponent(newPass)}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) {
        alert("✅ ตั้งรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบอีกครั้ง");
        location.reload();
    }
}

window.goToAdmin = function() {
    const adminPass = prompt("กรุณากรอกรหัสผ่าน Supervisor:");
    if (adminPass === SUP_PASSWORD) {
        location.href = 'supervisor.html';
    } else {
        alert("รหัสผ่านไม่ถูกต้อง");
    }
};

/* ===== 2. AUTH & SESSION ===== */
window.checkAuth = function() {
    if (!sessionStorage.getItem('selectedUser')) {
        location.href = 'index.html';
        return false;
    }
    return true;
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

window.goBack = function() {
    location.href = 'main.html';
};

/* ===== 3. DATA LOADING & SEARCH ===== */
window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res.success) {
            window.allRows = res.data; // เก็บข้อมูลไว้ที่ตัวแปร global เพื่อให้ค้นหาได้
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

/* ===== 4. UI RENDERING (จัดการการแสดงผลทุกหน้า) ===== */
window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const stock0243 = Number(item['0243'] || 0);
        const stockUser = Number(item[user] || 0);
        
        // กรองหน้า Deduct/Return: โชว์เฉพาะของที่ตัวเองมีในมือ
        if ((mode === 'deduct' || mode === 'return') && stockUser <= 0) return;

        if (mode === 'all') {
            const statusColor = stock0243 > 5 ? '#16a34a' : (stock0243 > 0 ? '#f59e0b' : '#ef4444');
            html += `<tr>
                <td style="padding:12px;">
                    <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                    <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                </td>
                <td align="center" style="font-size:16px;"><b>${stock0243}</b></td>
                <td align="right"><span style="color:${statusColor}; font-weight:bold;">● ${stock0243 > 0 ? 'INSTOCK' : 'EMPTY'}</span></td>
            </tr>`;
        } else if (mode === 'withdraw') {
            html += `<tr>
                <td><div style="font-weight:bold; font-size:14px;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                <td align="center"><b>${stock0243}</b></td>
                <td align="right">
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${item.Material}" value="1" min="1" style="width:50px; text-align:center; border-radius:4px; border:1px solid #ddd;">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">เบิก</button>
                    </div>
                </td>
            </tr>`;
        } else if (mode === 'deduct') {
            html += `<tr>
                <td><div style="font-weight:bold; font-size:14px;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                <td align="center"><b style="color:#ef4444;">${stockUser}</b></td>
                <td align="right">
                    <div style="display:flex; gap:4px; align-items:center;">
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:45px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        <button onclick="handleDeductClick('${item.Material}')" 
                                style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">USE</button>
                    </div>
                </td>
            </tr>`;
        } else if (mode === 'return') {
            html += `<tr>
                <td><div style="font-weight:bold; font-size:14px;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                <td align="center"><b style="color:#16a34a;">${stockUser}</b></td>
                <td align="right">
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${item.Material}" value="1" style="width:50px; text-align:center; border-radius:4px; border:1px solid #ddd;">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">คืน</button>
                    </div>
                </td>
            </tr>`;
        }
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px; color:#94a3b8;">ไม่พบข้อมูล</td></tr>';
};

/* ===== 5. TRANSACTION LOGIC (เชื่อมต่อ API) ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ ทำรายการสำเร็จ!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ"); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    const qty = document.getElementById('qty_' + mat).value;
    if(!wo) { alert("❌ กรุณาใส่เลข Work Order"); return; }
    
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ บันทึกการใช้งานสำเร็จ"); loadStockData('deduct'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาดในการส่งข้อมูล"); }
};
