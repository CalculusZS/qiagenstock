/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (MATCH WITH BACKEND V3.0)
========================================================================== */

const API = "ใส่_URL_APPS_SCRIPT_ของคุณตรงนี้";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen"; 

window.allRows = []; 

// --- 1. ระบบ LOGIN & FORCE PASSWORD CHANGE ---
window.handleLogin = async function() {
    const userInput = document.getElementById('username-input').value.trim().toUpperCase();
    const password = document.getElementById('password-input').value.trim();

    if (!userInput || !password) {
        alert("กรุณากรอก Username และ Password");
        return;
    }

    try {
        // เรียกใช้ action: 'checkauth' ตาม Backend V3.0
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userInput)}&pass=${encodeURIComponent(password)}`;
        const res = await fetch(url).then(r => r.json());

        if (res.success) {
            // กรณีใช้งานครั้งแรก (สถานะ FIRST_TIME จาก Backend)
            if (res.status === 'FIRST_TIME') {
                const newPass = prompt(`ยินดีต้อนรับคุณ ${res.fullName}\nกรุณาตั้งรหัสผ่านใหม่ (4 ตัวขึ้นไป):`);
                if (newPass && newPass.length >= 4) {
                    // เรียกใช้ action: 'setpassword' ตาม Backend V3.0
                    await setPasswordAPI(res.fullName, newPass);
                } else {
                    alert("การตั้งรหัสผ่านไม่สำเร็จ");
                }
                return;
            }
            
            // กรณีล็อกอินปกติ
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
        alert("✅ ตั้งรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบอีกครั้งด้วยรหัสใหม่");
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

/* ===== 2. AUTH & STOCK FUNCTIONS ===== */
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
    } catch (e) { console.error(e); }
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
        const s0 = Number(item['0243'] || 0);
        const sU = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sU <= 0) return;

        html += `<tr>
            <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center">${(mode === 'all' || mode === 'withdraw') ? s0 : sU}</td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)">เบิก</button>` : 
                  mode === 'deduct' ? `<input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px"> <button onclick="handleDeductClick('${item.Material}')">USE</button>` : 
                  '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("สำเร็จ!"); loadStockData(type); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    if(!wo) return alert("กรุณาใส่ WO");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("ตัดสต็อกสำเร็จ"); loadStockData('deduct'); }
};
