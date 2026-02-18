/* ==========================================================================
   QIAGEN INVENTORY - LOOP FIX & FULL OPTION PRESERVED
   - FIXED: Password change updates status to ACTIVE to stop loop
   - PRESERVED: Withdraw, Return, Use (WO#), Supervisor Audit, Search, Admin
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzDwLIahmJn4yMt_NqrRr2diHGo6BQ1TsdXBLqsDRuanUvUU2sPCBZsfWQkdMBQaY4S/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; 
const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 1. AUTHENTICATION & LOGIN (STOP LOOP) ===== */
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

            // 1. ถ้าเป็น Supervisor หรือใช้รหัส Admin ให้เข้าได้ทันที
            if (res.fullName === 'Supervisor' || passVal === SUP_PASSWORD) {
                sessionStorage.setItem('selectedUser', 'Supervisor');
                window.location.replace('main.html');
                return;
            }

            // 2. ถ้าสถานะเป็น NEW (ต้องเปลี่ยนรหัส)
            if (res.status === 'NEW') {
                showChangePasswordModal(userVal, passVal);
                return; 
            }

            // 3. ปกติ (Active) เข้าหน้าหลัก
            window.location.replace('main.html');
        } else { 
            alert("❌ Login Failed: User หรือ Password ไม่ถูกต้อง"); 
        }
    } catch (e) { alert("❌ Connection Error"); }
};

// ฟังก์ชันเปลี่ยนรหัสผ่านและเปลี่ยนสถานะเป็น ACTIVE
function showChangePasswordModal(username, oldPass) {
    if (document.getElementById('pass-modal-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'pass-modal-backdrop';
    backdrop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.9); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(8px);";
    backdrop.innerHTML = `
        <div style="background:white; padding:35px; border-radius:24px; width:90%; max-width:400px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); font-family:sans-serif; text-align:center;">
            <div style="background:#dcfce7; color:#166534; width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px; font-size:32px;">🔑</div>
            <h2 style="margin:0; color:#0f172a; font-size:20px;">ตั้งรหัสผ่านใหม่</h2>
            <p style="color:#64748b; font-size:13px; margin:8px 0 20px;">เปลี่ยนรหัสผ่านเพื่อเปลี่ยนสถานะบัญชีเป็น Active</p>
            <input type="password" id="new_p1" placeholder="รหัสผ่านใหม่" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; margin-bottom:12px;">
            <input type="password" id="new_p2" placeholder="ยืนยันรหัสผ่านใหม่" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:10px; box-sizing:border-box; margin-bottom:20px;">
            <button id="btn_save_pass" style="width:100%; background:#003366; color:white; border:none; padding:15px; border-radius:12px; font-weight:bold; cursor:pointer;">บันทึกและเปลี่ยนสถานะเป็น Active</button>
        </div>`;
    document.body.appendChild(backdrop);

    document.getElementById('btn_save_pass').onclick = async function() {
        const p1 = document.getElementById('new_p1').value;
        const p2 = document.getElementById('new_p2').value;
        if (p1.length < 4) { alert("❌ รหัสผ่านต้องมี 4 ตัวขึ้นไป"); return; }
        if (p1 !== p2) { alert("❌ รหัสผ่านไม่ตรงกัน"); return; }

        this.innerText = "กำลังอัปเดตสถานะ..."; 
        this.disabled = true;

        try {
            // ส่งคำสั่งไปที่ Backend เพื่อเปลี่ยน Pass และเปลี่ยนสถานะใน Sheet เป็น ACTIVE
            const url = `${API}?action=setpassword&user=${encodeURIComponent(username)}&newPass=${encodeURIComponent(p1)}&pass=${SUP_PASSWORD}`;
            const res = await fetch(url).then(r => r.json());
            if (res.success) {
                alert("✅ บัญชีของคุณเป็น Active แล้ว! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
                location.reload(); 
            } else {
                alert("❌ " + res.msg);
                this.disabled = false;
                this.innerText = "บันทึกและเปลี่ยนสถานะเป็น Active";
            }
        } catch (e) { alert("❌ Connection Error"); this.disabled = false; }
    };
}

/* ===== 2. PRESERVED ALL OPTIONS (ฟังก์ชันเดิมทั้งหมด) ===== */
window.goToAdmin = () => {
    const pass = prompt("กรุณาใส่รหัสผ่าน Supervisor:");
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (pass !== null) {
        alert("❌ รหัสผ่านไม่ถูกต้อง");
    }
};

window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res && res.success) {
            window.allRows = res.data;
            if (mode === 'supervisor') renderStaffAudit(res.data);
            else renderTable(res.data, mode);
        }
    } catch (e) { console.error("Load Error"); }
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
                    <td align="right"><button onclick="window.handleDeductClick('${item.Material}', '${staff}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.handleDeductClick = async function(mat, p1 = null) {
    const user = (p1 && typeof p1 === 'string') ? p1 : sessionStorage.getItem('selectedUser');
    const wo = (p1 && typeof p1 === 'string') ? "ADMIN_FORCE" : (document.getElementById('wo_' + mat)?.value || "");
    if(!wo) { alert("❌ กรุณาระบุ WO#"); return; }
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ บันทึกสำเร็จ!"); loadStockData(p1 ? 'supervisor' : 'deduct'); }
    } catch (e) { alert("❌ Error"); }
};

window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ สำเร็จ!"); loadStockData(type); }
    } catch (e) { alert("❌ Error"); }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(i => String(i.Material).toLowerCase().includes(q) || String(i['Product Name']).toLowerCase().includes(q));
    if (mode === 'supervisor') renderStaffAudit(filtered);
    else renderTable(filtered, mode);
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
                ${mode === 'withdraw' ? `<button onclick="window.executeTransaction('withdraw', '${item.Material}', 1)" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">เบิก</button>` : 
                  mode === 'deduct' ? `<input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px; padding:5px;"><button onclick="window.handleDeductClick('${item.Material}')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px;">USE</button>` : 
                  mode === 'return' ? `<button onclick="window.executeTransaction('return', '${item.Material}', 1)" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px;">Return</button>` : '●'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.logout = function() { sessionStorage.clear(); window.location.replace('index.html'); };
if (!sessionStorage.getItem('selectedUser') && !window.location.pathname.includes('index.html')) {
    window.location.replace('index.html');
}
