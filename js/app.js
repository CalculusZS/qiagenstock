/* ==========================================================================
   QIAGEN INVENTORY - THE MASTER VERSION
   - FIXED: Password change sends status=ACTIVE to stop loop
   - PRESERVED: Search, Add Stock, Withdraw, Return, Use (WO#), Audit
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbw9mdy0I2EZoQFjMvZupZbBB4L-9rY5kGTJy_uYHo_DLfiC2McRznm6wwfIGqbylNKR/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTH & LOGIN (FIXED STATUS) ===== */
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
            if (res.fullName === 'Supervisor' || passVal === SUP_PASSWORD) {
                sessionStorage.setItem('selectedUser', 'Supervisor');
                window.location.replace('main.html');
                return;
            }
            if (res.status === 'NEW') {
                showChangePasswordModal(userVal, passVal);
                return; 
            }
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Connection Error"); }
};

function showChangePasswordModal(username, oldPass) {
    if (document.getElementById('pass-modal-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'pass-modal-backdrop';
    backdrop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:9999;";
    backdrop.innerHTML = `
        <div style="background:white; padding:30px; border-radius:15px; width:320px; text-align:center;">
            <h3>Set New Password</h3>
            <input type="password" id="new_p1" placeholder="New Password" style="width:100%; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc;">
            <input type="password" id="new_p2" placeholder="Confirm Password" style="width:100%; padding:10px; margin-bottom:20px; border-radius:5px; border:1px solid #ccc;">
            <button id="btn_save_pass" style="width:100%; background:#003366; color:white; border:none; padding:12px; border-radius:5px; cursor:pointer;">Save & Activate</button>
        </div>`;
    document.body.appendChild(backdrop);

    document.getElementById('btn_save_pass').onclick = async function() {
        const p1 = document.getElementById('new_p1').value;
        const p2 = document.getElementById('new_p2').value;
        if (p1.length < 4 || p1 !== p2) { alert("❌ Invalid Data"); return; }
        this.innerText = "Saving..."; this.disabled = true;
        try {
            // ส่ง status=ACTIVE เพื่อให้ Google Sheet อัปเดต Column D
            const url = `${API}?action=setpassword&user=${encodeURIComponent(username)}&newPass=${encodeURIComponent(p1)}&pass=${SUP_PASSWORD}&status=ACTIVE`;
            const res = await fetch(url).then(r => r.json());
            if (res.success) { alert("✅ Status: ACTIVE. Please login."); location.reload(); }
            else { alert("❌ " + res.msg); this.disabled = false; }
        } catch (e) { alert("❌ Error"); this.disabled = false; }
    };
}

/* ===== 2. DATA & SEARCH (PRESERVED) ===== */
window.loadStockData = async function(mode) {
    try {
        const r = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(res => res.json());
        if (r.success) {
            window.allRows = r.data;
            if (mode === 'supervisor') renderStaffAudit(r.data);
            else renderTable(r.data, mode);
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

/* ===== 3. TRANSACTIONS (PRESERVED) ===== */
window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("❌ Fill all fields"); return; }
    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Stock added!"); loadStockData('supervisor'); }
    } catch (e) { alert("❌ Error"); }
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (typeof p1 === 'string') ? p1 : sessionStorage.getItem('selectedUser');
    const wo = (typeof p1 === 'string') ? "ADMIN_FORCE" : (document.getElementById('wo_' + mat)?.value || "");
    if(!wo) { alert("❌ Please enter WO#"); return; }
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(p1 ? 'supervisor' : 'deduct'); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Success"); loadStockData(type); }
};

/* ===== 4. UI RENDERING (PRESERVED) ===== */
window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0), sUser = Number(item[user] || 0);
        if ((mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        html += `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${(mode==='withdraw'||mode==='all') ? s0243 : sUser}</b></td>
            <td align="right">
                ${mode === 'withdraw' ? `<button onclick="executeTransaction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 12px;border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex;gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:55px;"><button onclick="handleDeductClick('${item.Material}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="executeTransaction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 12px;border-radius:8px;">Return</button>` : '●'}
            </td></tr>`;
    });
    tbody.innerHTML = html;
};

window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data'); if (!tbody) return;
    let html = '';
    data.forEach(item => {
        STAFF_LIST.forEach(staff => {
            if (Number(item[staff] || 0) > 0) {
                html += `<tr><td><b>${item.Material}</b></td><td align="center">${staff}</td><td align="center"><b>${item[staff]}</b></td>
                <td align="right"><button onclick="handleDeductClick('${item.Material}','${staff}')" style="background:#ef4444;color:white;padding:8px 12px;border-radius:8px;">Deduct</button></td></tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4">No staff inventory</td></tr>';
};

window.setupAdminLookup = function() {
    const matCode = document.getElementById('s_mat').value.trim().toUpperCase();
    const item = window.allRows.find(r => String(r.Material).toUpperCase() === matCode);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = item ? `📦 ${item['Product Name']}` : "❌ Not found";
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
