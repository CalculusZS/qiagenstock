/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (V7.0 FINAL)
========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";

/* ===== 1. AUTHENTICATION & PASSWORD LOGIC ===== */

window.handleLogin = async function() {
    // ดึงค่าจากหน้าจอ Index.html
    const userKeyEl = document.getElementById('username-input');
    const passEl = document.getElementById('password-input');

    if (!userKeyEl || !passEl) {
        alert("❌ Error: ไม่พบช่องกรอกข้อมูลในหน้า HTML");
        return;
    }

    const userKey = userKeyEl.value.trim().toUpperCase();
    const password = passEl.value.trim();

    if (!userKey || !password) {
        alert("❌ กรุณากรอก Username และ Password");
        return;
    }

    try {
        // ส่งไปเช็คที่ Google Sheets (รองรับ KM, TK, PSO, PK, PST, PA)
        const url = `${API}?action=login&userKey=${userKey}&pass=${password}`;
        const res = await fetch(url).then(r => r.json());

        if (res.success) {
            // กรณีเข้าครั้งแรก หรือ Admin Reset มา (ต้องตั้งรหัสใหม่)
            if (res.isFirstTime) {
                const newPass = prompt("ตั้งรหัสผ่านใหม่ของคุณ (อย่างน้อย 4 ตัว):");
                if (newPass && newPass.trim().length >= 4) {
                    await updatePassword(userKey, newPass.trim());
                    return; 
                } else {
                    alert("❌ การตั้งรหัสผ่านไม่สำเร็จ");
                    return;
                }
            }
            
            // เก็บชื่อจริง (เช่น Kitti) ลง Session เพื่อใช้เบิกของ
            sessionStorage.setItem('selectedUser', res.userName);
            location.href = 'main.html';
        } else {
            alert("❌ Username หรือ Password ไม่ถูกต้อง");
        }
    } catch (e) {
        alert("❌ เชื่อมต่อฐานข้อมูลไม่ได้");
    }
};

async function updatePassword(userKey, newPass) {
    const url = `${API}?action=updatePass&userKey=${userKey}&newPass=${encodeURIComponent(newPass)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) {
        alert("✅ ตั้งรหัสผ่านใหม่สำเร็จ! กรุณา Login อีกครั้ง");
        location.reload();
    }
}

/* ===== 2. CORE FUNCTIONS (STOCK MGMT) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) { location.href = 'index.html'; return false; }
    return true;
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
        const stockPersonal = Number(item[user] || 0);
        
        if ((mode === 'deduct' || mode === 'return') && stockPersonal <= 0) return;

        if (mode === 'all') {
            const statusColor = stockCentral > 5 ? '#16a34a' : (stockCentral > 0 ? '#f59e0b' : '#ef4444');
            html += `<tr>
                <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                <td align="center"><b>${stockCentral}</b></td>
                <td align="right" style="color:${statusColor}; font-weight:bold;">● ${stockCentral > 0 ? 'INSTOCK' : 'EMPTY'}</td>
            </tr>`;
        } else if (mode === 'withdraw') {
            html += `<tr>
                <td><b>${item.Material}</b></td>
                <td align="center">${stockCentral}</td>
                <td align="right">
                    <input type="number" id="qty_${item.Material}" value="1" style="width:40px;">
                    <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" style="background:#003366; color:white; border-radius:4px; border:none; padding:5px 10px;">เบิก</button>
                </td>
            </tr>`;
        } else if (mode === 'deduct') {
            html += `<tr>
                <td><b>${item.Material}</b></td>
                <td align="center"><b style="color:red;">${stockPersonal}</b></td>
                <td align="right">
                    <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px;">
                    <input type="number" id="qty_${item.Material}" value="1" style="width:30px;">
                    <button onclick="handleDeductClick('${item.Material}')" style="background:red; color:white; border-radius:4px; border:none; padding:5px 10px;">USE</button>
                </td>
            </tr>`;
        }
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">ไม่พบข้อมูล</td></tr>';
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("สำเร็จ!"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    const qty = document.getElementById('qty_' + mat).value;
    if(!wo) { alert("ใส่เลข WO ด้วยครับ"); return; }
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("ตัดสต็อกสำเร็จ"); loadStockData('deduct'); }
};

window.goBack = function() { location.href = 'main.html'; };
window.logout = function() { sessionStorage.clear(); location.href = 'index.html'; };
