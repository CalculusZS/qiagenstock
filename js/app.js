/* ==========================================================================
   QIAGEN INVENTORY - FRONTEND (UNIVERSAL RESTORE V7.0)
   - เชื่อมต่อกับ Backend V7.0 ที่คุณส่งมาล่าสุด 100%
   - ฟังก์ชันครบ: ค้นหา, ประวัติ, เพิ่มสต็อก, ใช้ของ (WO#), เบิก-คืน
   ========================================================================== */

// แก้ไข URL ให้ถูกต้อง (ลบ h เกินออก)
const API = "https://script.google.com/macros/s/AKfycbyH9BtHHVez1dRnW4N2lpvNT-vo-e5UlFg-jbLK0XDgPYmTVsYfQhzWh6LUl3tPmo5C/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN ===== */
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
            // ถ้าเป็น NEW ให้เปลี่ยนรหัสผ่าน (Backend จะแก้เป็น ACTIVE ให้เอง)
            if (res.status === 'NEW') {
                showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else { 
            alert("❌ Login Failed: " + (res.msg || "Invalid User/Pass")); 
        }
    } catch (e) { alert("❌ Connection Error"); }
};

function showChangePasswordModal(username) {
    const backdrop = document.createElement('div');
    backdrop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999;";
    backdrop.innerHTML = `
        <div style="background:white; padding:30px; border-radius:15px; width:300px; text-align:center;">
            <h3>Set New Password</h3>
            <input type="password" id="n_p1" placeholder="New Password" style="width:100%; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc;">
            <input type="password" id="n_p2" placeholder="Confirm Password" style="width:100%; padding:10px; margin-bottom:20px; border-radius:5px; border:1px solid #ccc;">
            <button id="btn_save_p" style="width:100%; background:#003366; color:white; border:none; padding:12px; border-radius:5px; cursor:pointer;">Save & Activate</button>
        </div>`;
    document.body.appendChild(backdrop);

    document.getElementById('btn_save_p').onclick = async function() {
        const p1 = document.getElementById('n_p1').value;
        const p2 = document.getElementById('n_p2').value;
        if (p1 !== p2 || p1.length < 4) { alert("❌ Password mismatch or too short"); return; }
        
        try {
            const url = `${API}?action=setpassword&user=${encodeURIComponent(username)}&newPass=${encodeURIComponent(p1)}&pass=${SUP_PASSWORD}`;
            const res = await fetch(url).then(r => r.json());
            if (res.success) { alert("✅ Activated! Please login again."); location.reload(); }
        } catch (e) { alert("❌ Error"); }
    };
}

/* ===== 2. CORE DATA FUNCTIONS (PRESERVED) ===== */
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

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => 
        String(i.Material).toLowerCase().includes(q) || 
        String(i['Product Name']).toLowerCase().includes(q)
    );
    if (mode === 'supervisor') renderStaffAudit(filtered);
    else renderTable(filtered, mode);
};

/* ===== 3. TRANSACTION FUNCTIONS (Withdraw, Return, Use, Add) ===== */
window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Success"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (typeof p1 === 'string') ? p1 : sessionStorage.getItem('selectedUser');
    const woInput = document.getElementById('wo_' + mat);
    const wo = (typeof p1 === 'string') ? "ADMIN_FORCE" : (woInput ? woInput.value.trim() : "");
    if(!wo) { alert("❌ Please enter WO#"); return; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Recorded!"); loadStockData(p1 ? 'supervisor' : 'deduct'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ Please fill all fields"); return; }
    
    // ใช้ action 'add' ตาม Backend V7.0
    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ Stock Added!"); 
            document.getElementById('s_mat').value = '';
            document.getElementById('s_qty').value = '';
            loadStockData('supervisor'); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. HISTORY & RENDERING ===== */
window.loadHistory = async function() {
    try {
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
    } catch (e) { console.error("History Error", e); }
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
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw', '${item.Material}', 1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex; gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:55px;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return', '${item.Material}', 1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No Data</td></tr>';
};

window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            if (Number(item[staff] || 0) > 0) {
                html += `<tr>
                    <td><b>${item.Material}</b></td>
                    <td align="center">${staff}</td>
                    <td align="center"><b>${item[staff]}</b></td>
                    <td align="right"><button onclick="handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory</td></tr>';
};

/* ===== 5. UTILS ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) window.location.replace('index.html');
    const display = document.getElementById('user_display');
    if (display) display.innerText = user;
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };

// เรียกตรวจสอบสิทธิ์ทุกหน้า
window.checkAuth();
