/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (FULL VERSION V6.0)
   - ระบบ Login แบบพิมพ์ Username/Password (KM, TK, PSO, PK, PST, PA)
   - ระบบ Force Change Password ครั้งแรกที่เข้าใช้งาน
   - ฟังก์ชัน Admin Reset Password
   - รวมระบบเบิก (Withdraw), คืน (Return), ตัดใช้งาน (Deduct + WO)
========================================================================== */

// 1. CONFIGURATION
const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service"; // รหัสผ่านสำหรับคุยกับ API

window.allRows = []; // ที่เก็บข้อมูลสต็อกทั้งหมด

/* ===== 2. AUTHENTICATION (LOGIN & PASSWORD SYSTEM) ===== */

window.handleLogin = async function() {
    const userKeyEl = document.getElementById('username-input');
    const passEl = document.getElementById('password-input');
    
    if (!userKeyEl || !passEl) {
        console.error("❌ หา ID 'username-input' หรือ 'password-input' ไม่พบ");
        return;
    }

    const userKey = userKeyEl.value.trim().toUpperCase();
    const password = passEl.value.trim();

    if (!userKey || !password) {
        alert("❌ กรุณากรอกทั้ง Username และ Password");
        return;
    }

    try {
        // ส่งไปที่ API เพื่อเช็คสิทธิ์ (รองรับ KM, TK, PSO, PK, PST, PA)
        const url = `${API}?action=login&userKey=${userKey}&pass=${password}`;
        const res = await fetch(url).then(r => r.json());

        if (res.success) {
            // กรณี Status เป็น FirstTime (ครั้งแรกหรือถูกรีเซ็ต)
            if (res.isFirstTime) {
                const newPass = prompt("ยินดีต้อนรับ! นี่คือการเข้าใช้ครั้งแรกหรือรหัสถูกรีเซ็ต\nกรุณาตั้งรหัสผ่านใหม่ (อย่างน้อย 4 ตัว):");
                if (newPass && newPass.trim().length >= 4) {
                    await updatePassword(userKey, newPass.trim());
                    return; 
                } else {
                    alert("❌ การตั้งรหัสผ่านไม่สำเร็จ รหัสสั้นเกินไปหรือถูกยกเลิก");
                    return;
                }
            }
            
            // บันทึก Session และไปที่หน้าหลัก
            sessionStorage.setItem('selectedUser', res.userName);
            location.href = 'main.html';
        } else {
            alert("❌ Username หรือ Password ไม่ถูกต้อง");
        }
    } catch (e) {
        alert("❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาเช็คการตั้งค่า API");
        console.error(e);
    }
};

// ฟังก์ชันอัปเดตรหัสผ่านใหม่ลง Google Sheets
async function updatePassword(userKey, newPass) {
    const url = `${API}?action=updatePass&userKey=${userKey}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ ตั้งรหัสผ่านใหม่สำเร็จ! กรุณาเข้าสู่ระบบอีกครั้งด้วยรหัสใหม่");
            location.reload();
        } else {
            alert("❌ ไม่สามารถตั้งรหัสผ่านได้: " + res.msg);
        }
    } catch (e) {
        alert("❌ เกิดข้อผิดพลาดในการบันทึกรหัสผ่าน");
    }
}

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) {
        location.href = 'index.html';
        return false;
    }
    return true;
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

/* ===== 3. DATA LOADING & FILTERING ===== */

window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(item => {
        return String(item.Material).toLowerCase().includes(q) || 
               String(item['Product Name']).toLowerCase().includes(q);
    });
    renderTable(filtered, mode);
};

/* ===== 4. UI RENDERING ===== */

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const stockCentral = Number(item['0243'] || 0);
        const stockPersonal = Number(item[user] || 0);
        
        // กรองเฉพาะของที่ตนเองมี สำหรับหน้า Deduct/Return
        if ((mode === 'deduct' || mode === 'return') && stockPersonal <= 0) return;

        if (mode === 'all') {
            const statusColor = stockCentral > 5 ? '#16a34a' : (stockCentral > 0 ? '#f59e0b' : '#ef4444');
            html += `
                <tr>
                    <td style="padding:12px;">
                        <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                        <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                    </td>
                    <td align="center" style="font-size:16px;"><b>${stockCentral}</b></td>
                    <td align="right">
                        <span style="color:${statusColor}; font-weight:bold;">● ${stockCentral > 0 ? 'INSTOCK' : 'EMPTY'}</span>
                    </td>
                </tr>`;
        } else if (mode === 'withdraw') {
            html += `
                <tr>
                    <td><div style="font-weight:bold;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                    <td align="center"><b>${stockCentral}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="number" id="qty_${item.Material}" value="1" min="1" class="qty-input-sm">
                            <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">เบิก</button>
                        </div>
                    </td>
                </tr>`;
        } else if (mode === 'deduct') {
            html += `
                <tr>
                    <td><div style="font-weight:bold;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                    <td align="center"><b style="color:#ef4444; font-size:16px;">${stockPersonal}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:4px; justify-content:flex-end; align-items:center;">
                            <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                            <input type="number" id="qty_${item.Material}" value="1" class="qty-input-sm">
                            <button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">USE</button>
                        </div>
                    </td>
                </tr>`;
        } else if (mode === 'return') {
            html += `
                <tr>
                    <td><div style="font-weight:bold;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                    <td align="center"><b style="color:#16a34a; font-size:16px;">${stockPersonal}</b></td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="number" id="qty_${item.Material}" value="1" class="qty-input-sm">
                            <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">คืน</button>
                        </div>
                    </td>
                </tr>`;
        }
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:30px; color:#94a3b8;">ไม่พบข้อมูล</td></tr>';
};

/* ===== 5. TRANSACTION LOGIC (API CALLS) ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert(`✅ ${type === 'withdraw' ? 'เบิก' : 'คืน'}สำเร็จ!`);
            loadStockData(type);
        } else {
            alert("❌ " + res.msg);
        }
    } catch (e) {
        alert("❌ การเชื่อมต่อล้มเหลว");
    }
};

window.handleDeductClick = async function(mat) {
    const woEl = document.getElementById('wo_' + mat);
    const qtyEl = document.getElementById('qty_' + mat);
    const wo = woEl.value.trim();
    const qty = qtyEl.value;
    
    if(!wo) {
        alert("❌ กรุณาใส่เลข Work Order");
        return;
    }
    
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ ตัดสต็อกสำเร็จ");
            loadStockData('deduct');
        } else {
            alert("❌ " + res.msg);
        }
    } catch (e) {
        alert("❌ การเชื่อมต่อล้มเหลว");
    }
};

window.goBack = function() {
    location.href = 'main.html';
};
