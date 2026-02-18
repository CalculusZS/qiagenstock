/* ==========================================================================
   QIAGEN INVENTORY - FRONTEND (FULL VERSION - ENGLISH)
   - FIXED: Password change sends status=ACTIVE to stop loop
   - PRESERVED: Withdraw, Return, Use (WO#), Supervisor Audit, Search
   ========================================================================== */

const API = "hhttps://script.google.com/macros/s/AKfycbznTLa6_IDVZatkiRp48Ta8zchms6JfVsNxvb9z533w97TvRKxVgKfpw3xlLNFX_7gy/exec"; 
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

            // Supervisor/Admin Bypass
            if (res.fullName === 'Supervisor' || passVal === SUP_PASSWORD) {
                sessionStorage.setItem('selectedUser', 'Supervisor');
                window.location.replace('main.html');
                return;
            }

            // Forced Password Reset (if Status is NEW)
            if (res.status === 'NEW') {
                showChangePasswordModal(userVal, passVal);
                return; 
            }

            window.location.replace('main.html');
        } else { 
            alert("❌ Login Failed: Incorrect Username or Password"); 
        }
    } catch (e) { alert("❌ Connection Error"); }
};

function showChangePasswordModal(username, oldPass) {
    if (document.getElementById('pass-modal-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'pass-modal-backdrop';
    backdrop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.9); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(8px);";
    backdrop.innerHTML = `
        <div style="background:white; padding:35px; border-radius:24px; width:90%; max-width:400px; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
            <h2 style="margin:0; color:#0f172a; font-size:20px;">Set New Password</h2>
            <p style="color:#64748b; font-size:13px; margin:10px 0 20px;">Account will become 'Active' immediately after saving.</p>
            <input type="password" id="new_p1" placeholder="New Password" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; margin-bottom:12px;">
            <input type="password" id="new_p2" placeholder="Confirm Password" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; margin-bottom:20px;">
            <button id="btn_save_pass" style="width:100%; background:#003366; color:white; border:none; padding:15px; border-radius:12px; font-weight:bold; cursor:pointer;">Save & Activate Account</button>
        </div>`;
    document.body.appendChild(backdrop);

    document.getElementById('btn_save_pass').onclick = async function() {
        const p1 = document.getElementById('new_p1').value;
        const p2 = document.getElementById('new_p2').value;
        if (p1.length < 4) { alert("❌ Password must be at least 4 characters"); return; }
        if (p1 !== p2) { alert("❌ Passwords do not match"); return; }

        this.innerText = "Updating Status..."; this.disabled = true;

        try {
            // CRITICAL: Send status=ACTIVE to update column D in Google Sheets
            const url = `${API}?action=setpassword&user=${encodeURIComponent(username)}&newPass=${encodeURIComponent(p1)}&pass=${SUP_PASSWORD}&status=ACTIVE`;
            const res = await fetch(url).then(r => r.json());
            if (res.success) {
                alert("✅ Success! Your account is now ACTIVE. Please login again.");
                location.reload(); 
            } else {
                alert("❌ " + res.msg);
                this.disabled = false;
            }
        } catch (e) { alert("❌ Connection Error"); this.disabled = false; }
    };
}

/* ===== 2. PRESERVED ALL FEATURES (Withdraw, Return, Use/Deduct, Audit) ===== */
window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error", e); }
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (p1 && typeof p1 === 'string') ? p1 : sessionStorage.getItem('selectedUser');
    const woInput = document.getElementById('wo_' + mat);
    const wo = (p1 && typeof p1 === 'string') ? "ADMIN_FORCE" : (woInput ? woInput.value.trim() : "");
    if(!wo) { alert("❌ Please enter WO#"); return; }
    
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Recorded Successfully!"); loadStockData(p1 ? 'supervisor' : 'deduct'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Connection Error"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Completed!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Connection Error"); }
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
                ${mode === 'withdraw' ? `<button onclick="window.executeTransaction('withdraw', '${item.Material}', 1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Withdraw</button>` : 
                  mode === 'deduct' ? `<div style="display:flex; gap:4px;"><input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px; padding:5px;"><button onclick="window.handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">USE</button></div>` : 
                  mode === 'return' ? `<button onclick="window.executeTransaction('return', '${item.Material}', 1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No items found</td></tr>';
};

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
                    <td align="right"><button onclick="window.handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.goToAdmin = () => {
    const pass = prompt("Enter Supervisor Password:");
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (pass !== null) { alert("❌ Incorrect Password"); }
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
if (!sessionStorage.getItem('selectedUser') && !window.location.pathname.includes('index.html')) {
    window.location.replace('index.html');
}
