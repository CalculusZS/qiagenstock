/* ==========================================================================
   QIAGEN INVENTORY - FRONTEND (FULL VERSION - FIXED ADMIN & USER DISPLAY)
   - FIXED: goToAdmin (หน้า index.html กดเข้า Admin ได้แล้ว)
   - FIXED: User Display (ชื่อพนักงานจะโชว์แทน Loading... ทันที)
   - NO FEATURES REMOVED: เก็บฟังก์ชันจาก V7.0 ไว้ครบถ้วน
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN (คืนค่า goToAdmin) ===== */

// ฟังก์ชันสำหรับหน้า index.html ที่กดรูป/ปุ่ม Admin
window.goToAdmin = function() {
    const pass = prompt("Enter Supervisor Password:");
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (pass !== null) { 
        alert("❌ Incorrect Password"); 
    }
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            if (res.status === 'NEW') {
                showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 2. CORE DATA & SEARCH ===== */

window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error(e); }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => 
        String(i.Material).toLowerCase().includes(q) || 
        String(i['Product Name']).toLowerCase().includes(q)
    );
    if (mode === 'supervisor') renderStaffAudit(filtered);
    else renderTable(filtered, mode);
};

/* ===== 3. TRANSACTIONS (Withdraw, Return, Deduct, Add) ===== */

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (typeof p1 === 'string') ? p1 : sessionStorage.getItem('selectedUser');
    const woInput = document.getElementById('wo_' + mat);
    const wo = (typeof p1 === 'string') ? "ADMIN_FORCE" : (woInput ? woInput.value.trim() : "");
    if(!wo) { alert("❌ Please enter WO#"); return; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Recorded!"); loadStockData(p1 ? 'supervisor' : 'deduct'); }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Stock Added!"); loadStockData('supervisor'); }
};

/* ===== 4. HISTORY & RENDERING (ห้ามตัด) ===== */

window.loadHistory = async function() {
    const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
    const container = document.getElementById('history-data');
    if (res.success && container) {
        container.innerHTML = res.data.map(row => `
            <tr>
                <td>${new Date(row[0]).toLocaleString()}</td>
                <td>${row[1]}</td>
                <td>${row[3]}</td>
                <td>${row[7] || '-'}</td>
                <td>${row[4]}</td>
            </tr>
        `).join('');
    }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        const sUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        html += `<tr>
            <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)">Withdraw</button>` : 
                  mode === 'deduct' ? `<input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px;"><button onclick="handleDeductClick('${item.Material}')">USE</button>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            if (Number(item[staff] || 0) > 0) {
                html += `<tr><td>${item.Material}</td><td>${staff}</td><td>${item[staff]}</td>
                <td><button onclick="handleDeductClick('${item.Material}','${staff}')">Deduct</button></td></tr>`;
            }
        });
    });
    tbody.innerHTML = html;
};

/* ===== 5. UTILS (แก้ปัญหาชื่อ Loading ไม่หาย) ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
    }
    const display = document.getElementById('user_display');
    if (display && user) {
        display.innerText = user; // เปลี่ยน Loading... เป็นชื่อคนล็อกอิน
    }
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };

// รันฟังก์ชันตรวจสอบสิทธิ์และโชว์ชื่อทันทีที่โหลดไฟล์
window.checkAuth();
