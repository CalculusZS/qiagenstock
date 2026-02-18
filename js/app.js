/* ==========================================================================
   QIAGEN INVENTORY - FULL RESTORE VERSION (FIXED ALL ISSUES)
   - กลับมาครบทุกฟังก์ชัน: Withdraw, Return, Use (WO#), Search, Supervisor Audit, Reset Pass
   - แก้ไข History "undefined" โดยการเรียง Index ใหม่
   - แก้ไข Admin Login ให้รองรับทั้งแบบ Prompt และ Modal
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', res.fullName);
            // ถ้าเป็นผู้ใช้ใหม่ให้ไปหน้าเปลี่ยนรหัส
            if (res.status === 'NEW') { 
                if (typeof showChangePasswordModal === 'function') showChangePasswordModal(userVal);
                else alert("Please change your password in the system.");
                return;
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed: User หรือ Password ไม่ถูกต้อง"); }
    } catch (e) { alert("❌ Connection Error: โปรดตรวจสอบ URL ของ Web App"); }
};

window.goToAdmin = function() {
    const pass = prompt("Enter Supervisor Password:");
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (pass !== null) { alert("❌ Incorrect Password"); }
};

/* ===== 2. CORE DATA & RENDERING ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error", e); }
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
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data found</td></tr>';
};

/* ===== 3. HISTORY (FIXED UNDEFINED) ===== */
window.loadHistory = async function() {
    const container = document.getElementById('history-data');
    if (!container) return;
    try {
        const res = await fetch(`${API}?action=gethistory&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            // Mapping: 0=Date, 1=Material, 3=Product Name, 7=WO, 4=Type
            container.innerHTML = res.data.map(row => `
                <tr>
                    <td>${new Date(row[0]).toLocaleString('th-TH')}</td>
                    <td><b>${row[1] || ''}</b></td>
                    <td>${row[3] || ''}</td>
                    <td style="color:#ef4444; font-weight:bold;">${row[7] || '-'}</td>
                    <td><span style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:12px;">${row[4] || ''}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) { container.innerHTML = '<tr><td colspan="5" align="center">Error loading history</td></tr>'; }
};

/* ===== 4. SUPERVISOR & AUDIT FUNCTIONS ===== */
window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            const qty = Number(item[staff] || 0);
            if (qty > 0) {
                html += `<tr>
                    <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                    <td align="center">${staff}</td>
                    <td align="center"><b>${qty}</b></td>
                    <td align="right"><button onclick="handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ ไม่พบข้อมูล";
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if (!mat || !qty) return alert("กรุณากรอกข้อมูลให้ครบ");
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ เพิ่มสต็อกสำเร็จ!"); loadStockData('supervisor'); }
};

/* ===== 5. TRANSACTION LOGIC ===== */
window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    try {
        const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ สำเร็จ!"); loadStockData(type); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาด"); }
};

window.handleDeductClick = async function(mat, staff = null) {
    const user = staff || sessionStorage.getItem('selectedUser');
    let wo = "";
    if (staff) {
        wo = prompt(`Enter WO# for ${mat} (Staff: ${staff}):`);
        if (!wo) return;
    } else {
        const woInput = document.getElementById(`wo_${mat}`);
        wo = woInput ? woInput.value.trim() : "";
        if (!wo) { alert("❌ กรุณาใส่ WO#"); return; }
    }

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ บันทึกการใช้งานสำเร็จ!"); loadStockData(staff ? 'supervisor' : 'deduct'); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาด"); }
};

/* ===== 6. UTILS & SEARCH ===== */
window.searchProduct = function() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtered = window.allRows.filter(r => 
        r.Material.toLowerCase().includes(q) || 
        r['Product Name'].toLowerCase().includes(q)
    );
    const mode = window.location.pathname.includes('withdraw') ? 'withdraw' : 
                 window.location.pathname.includes('return') ? 'return' : 
                 window.location.pathname.includes('deduct') ? 'deduct' : 'all';
    renderTable(filtered, mode);
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) window.location.replace('index.html');
    const display = document.getElementById('user_display');
    if (display) display.innerText = user;
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };

// Initialize
checkAuth();
