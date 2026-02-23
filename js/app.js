/* ========================================================================== 
   QIAGEN INVENTORY SYSTEM - TOTAL FIX VERSION
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
window.allRows = [];

/* ===== 1. LOGIN SYSTEM (แก้ปัญหา handleLogin is not defined) ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return alert("System Error: Login inputs not found.");

    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    if (!userVal || !passVal) return alert("กรุณากรอก Username และ Password");

    // Supervisor Login
    if (passVal === SUP_PASSWORD) {
        sessionStorage.setItem('userKey', 'Supervisor');
        sessionStorage.setItem('selectedUser', 'Supervisor');
        location.href = 'supervisor.html';
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res && res.success) {
            sessionStorage.setItem('userKey', userVal);
            sessionStorage.setItem('selectedUser', res.fullName || USER_MAP[userVal] || userVal);
            location.href = 'main.html';
        } else {
            // Fallback: ใช้รหัสกลาง Service
            if (passVal === MASTER_PASS && USER_MAP[userVal]) {
                sessionStorage.setItem('userKey', userVal);
                sessionStorage.setItem('selectedUser', USER_MAP[userVal]);
                location.href = 'main.html';
            } else {
                alert("❌ Login Failed: รหัสผ่านไม่ถูกต้อง");
            }
        }
    } catch (e) {
        alert("❌ Connection Error: ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
    }
};

/* ===== 2. AUTH & NAME DISPLAY (บังคับชื่อโชว์ทุกหน้า) ===== */
window.checkAuth = function() {
    const userKey = sessionStorage.getItem('userKey');
    const selectedUser = sessionStorage.getItem('selectedUser');

    if (!userKey && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    const renderName = () => {
        // รายชื่อ ID ทั้งหมดที่คุณใช้ใน HTML แต่ละหน้า
        const ids = ['user_display', 'current-user', 'userName', 'display_user'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el && selectedUser) el.innerText = selectedUser;
        });
    };
    renderName();
    setTimeout(renderName, 500); // กันพลาด
};

/* ===== 3. LOAD & RENDER DATA (แก้หน้า Showall/Withdraw ไม่ขึ้นของ) ===== */
window.loadStockData = async function(passedMode) {
    let mode = passedMode;
    const path = window.location.pathname.toLowerCase();
    
    // บังคับโหมดอัตโนมัติตามหน้าเว็บ
    if (path.includes('showall')) mode = 'all';
    else if (path.includes('withdraw')) mode = 'withdraw';
    else if (path.includes('return')) mode = 'return';
    else if (path.includes('supervisor')) mode = 'supervisor';

    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') {
                renderStaffAudit(res.data);
            } else {
                renderTable(res.data, mode);
            }
        }
    } catch (e) { console.error("Load Error:", e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;

    const selectedUser = sessionStorage.getItem('selectedUser');
    const userKey = sessionStorage.getItem('userKey');

    tbody.innerHTML = data.map(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[selectedUser] || item[userKey] || 0);

        // Logic: หน้า All/Withdraw ดูคลัง 0243 | หน้า Return ดูของในมือ
        let displayQty = (mode === 'all' || mode === 'withdraw') ? s0243 : sUser;

        if (mode === 'return' && sUser <= 0) return '';

        return `
        <tr>
            <td style="padding:12px;">
                <div style="font-weight:bold;">${item.Material}</div>
                <div style="font-size:12px; color:#666;">${item['Product Name']}</div>
            </td>
            <td align="center" style="font-weight:bold; color:#003366;">${displayQty}</td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;border:none;padding:8px;border-radius:5px;">Withdraw</button>` :
                  mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#22c55e;color:white;border:none;padding:8px;border-radius:5px;">Return</button>` : '●'}
            </td>
        </tr>`;
    }).join('');
};

/* ===== 4. CORE ACTIONS ===== */
window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(); }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase();
    const filtered = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(q) || 
        String(r['Product Name']).toLowerCase().includes(q)
    );
    renderTable(filtered, mode);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.goBack = () => { window.history.back(); };

// เริ่มการทำงาน
window.checkAuth();
