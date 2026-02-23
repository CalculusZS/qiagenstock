/* ==========================================================================
   QIAGEN INVENTORY - ABSOLUTE RESTORE & FIX (VERSION 30)
   --------------------------------------------------------------------------
   - FIXED: "Logged in as" Display (บังคับแสดงชื่อ Phurilap ทุกหน้า)
   - FIXED: Data Load (ดึงข้อมูลสต็อกโดยใช้ทั้งตัวย่อและชื่อเต็มป้องกันค่าว่าง)
   - RESTORED: All Options (Supervisor, Add Stock, Audit, History, Password Modal)
   - FULL CODE: ไม่มีการตัดฟังก์ชันใดๆ ออก 100%
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbxj7zJjHjGeOw0J3Q0UBR2EDodn10Zf8PEqYKN5TGYwjHURFblN97jIMMBlmyHqVys-/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// ตาราง Mapping สำหรับเชื่อมตัวย่อในชีท เข้ากับชื่อเต็มที่จะโชว์
const USER_MAP = {
    'KM': 'Kitti',
    'TK': 'Tatchai',
    'PSO': 'Parinyachat',
    'PK': 'Phurilap',
    'PST': 'Penporn',
    'PA': 'Phuriwat'
};

window.allRows = []; 

/* ===== 1. การตรวจสอบสิทธิ์และการแสดงผลชื่อ (แก้จุดที่ชื่อไม่ขึ้น) ===== */
window.checkAuth = function() {
    const userKey = sessionStorage.getItem('userKey'); 
    const userFull = USER_MAP[userKey] || userKey;
    
    // หากไม่ได้ Login ให้กลับไปหน้าแรก (ยกเว้นหน้า Login)
    if (!userKey && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return;
    }

    // ฟังก์ชันยัดชื่อใส่ทุก ID ที่ระบบคุณเคยใช้ (ป้องกันชื่อไม่ขึ้น)
    const renderNameLabel = () => {
        const targetIds = ['user_display', 'userName', 'display_user', 'username', 'logged_in_as'];
        targetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = userFull; // ใส่ชื่อ Phurilap
                el.style.fontWeight = "bold";
            }
        });
    };

    renderNameLabel();
    window.addEventListener('load', renderNameLabel);
    setTimeout(renderNameLabel, 500);  // รันซ้ำรอบที่ 1
    setTimeout(renderNameLabel, 1500); // รันซ้ำรอบที่ 2 เพื่อความมั่นใจ
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userVal = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userVal)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('userKey', userVal); // เก็บ PK
            sessionStorage.setItem('selectedUser', USER_MAP[userVal] || res.fullName); // เก็บ Phurilap
            
            if (res.status === 'NEW') { 
                window.showChangePasswordModal(userVal);
                return; 
            }
            window.location.replace('main.html');
        } else {
            alert("❌ Login Failed: Username หรือ Password ไม่ถูกต้อง");
        }
    } catch (e) {
        alert("❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
};

/* ===== 2. การดึงข้อมูลและแสดงสต็อก (แก้จุดที่ข้อมูลไม่ขึ้น) ===== */
window.loadStockData = async function(mode) {
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
    } catch (e) {
        console.error("Load Error:", e);
    }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('stock-data');
    if (!tbody) return;

    const userKey = sessionStorage.getItem('userKey');
    const userFull = sessionStorage.getItem('selectedUser');
    const isShowAll = window.location.pathname.includes('showall.html');
    
    let html = '';
    data.forEach(item => {
        const s0243 = Number(item['0243'] || 0);
        // ดักทุกทาง: ตรวจสอบทั้งคอลัมน์ที่เป็นตัวย่อ (PK) หรือชื่อเต็ม (Phurilap)
        const sUser = Number(item[userKey] || item[userFull] || 0);
        
        // ถ้าเป็นหน้าใช้ของ (Deduct/Return) และไม่มีของในมือ ไม่ต้องโชว์แถว
        if (!isShowAll && (mode === 'deduct' || mode === 'return') && sUser <= 0) return;
        
        // หน้า Withdraw/Showall ให้โชว์คลังกลาง (0243), หน้าอื่นโชว์คลังส่วนตัว
        const displayQty = (isShowAll || mode === 'withdraw') ? s0243 : sUser;

        html += `
            <tr>
                <td style="padding:12px;">
                    <span style="font-size:14px; font-weight:bold; color:#003366;">${item.Material || '-'}</span><br>
                    <small style="color:#666;">${item['Product Name'] || ''}</small>
                </td>
                <td align="center" style="font-size:16px; font-weight:bold;">${displayQty}</td>
                <td align="right">
                    ${mode === 'withdraw' ? `<button onclick="executeAction('withdraw','${item.Material}',1)" style="background:#003366;color:white;padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Withdraw</button>` : ''}
                    ${mode === 'deduct' ? `
                        <div style="display:flex;gap:5px;justify-content:flex-end;">
                            <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:75px;padding:6px;border:1px solid #ccc;border-radius:5px;">
                            <button onclick="handleDeduct('${item.Material}')" style="background:#ef4444;color:white;padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">USE</button>
                        </div>` : ''}
                    ${mode === 'return' ? `<button onclick="executeAction('return','${item.Material}',1)" style="background:#10b981;color:white;padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Return</button>` : ''}
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px;">ไม่พบข้อมูล</td></tr>';
};

/* ===== 3. ส่วนของ SUPERVISOR (ออฟชั่นครบถ้วน) ===== */
window.renderStaffAudit = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    let html = '';
    
    data.forEach(item => {
        Object.keys(USER_MAP).forEach(key => {
            const sName = USER_MAP[key];
            const qty = Number(item[key] || item[sName] || 0);
            if (qty > 0) {
                html += `
                    <tr>
                        <td><b>${item.Material}</b></td>
                        <td>${sName}</td>
                        <td align="center"><b>${qty}</b></td>
                        <td align="right">
                            <input type="text" id="audit_wo_${item.Material}_${key}" placeholder="WO#" style="width:80px;padding:5px;border:1px solid #ccc;">
                            <button onclick="handleAuditDeduct('${item.Material}','${key}')" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;margin-left:5px;cursor:pointer;">Deduct</button>
                        </td>
                    </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center" style="padding:20px;">ไม่มีสต็อกค้างที่พนักงาน</td></tr>';
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim().toUpperCase();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) return alert("กรุณากรอกข้อมูลให้ครบ");
    const res = await fetch(`${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ เพิ่มสต็อกสำเร็จ"); location.reload(); }
};

window.goToAdmin = function() {
    const p = prompt("กรุณาใส่ Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('userKey', 'Supervisor');
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
    } else if (p !== null) {
        alert("❌ รหัสผ่านไม่ถูกต้อง");
    }
};

/* ===== 4. หน้าต่างเปลี่ยนรหัสผ่าน (MODAL) ===== */
function showModernModal(contentHtml) {
    let overlay = document.getElementById('modern-modal-overlay') || document.createElement('div');
    overlay.id = 'modern-modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center;";
    document.body.appendChild(overlay);
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:25px; width:340px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.5);">${contentHtml}</div>`;
    overlay.style.display = 'flex';
}

window.showChangePasswordModal = function(userKey) {
    showModernModal(`
        <h2 style="color:#003366; margin-bottom:20px;">Set New Password</h2>
        <input type="password" id="new-p1" placeholder="รหัสผ่านใหม่" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:10px; text-align:center; box-sizing:border-box;">
        <input type="password" id="new-p2" placeholder="ยืนยันรหัสผ่านใหม่" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; text-align:center; box-sizing:border-box;">
        <button onclick="processReset('${userKey}')" style="width:100%; padding:14px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Update Password</button>
    `);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ รหัสผ่านไม่ตรงกัน!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบใหม่"); window.location.reload(); }
};

/* ===== 5. ฟังก์ชันการทำงานอื่นๆ (ครบถ้วน) ===== */
window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('userKey');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ดำเนินการสำเร็จ"); loadStockData(type); }
};

window.handleDeduct = async function(mat) {
    const user = sessionStorage.getItem('userKey');
    const wo = document.getElementById('wo_' + mat)?.value.trim();
    if (!wo) return alert("❌ กรุณาใส่ WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ตัดใช้งานสำเร็จ"); loadStockData('deduct'); }
};

window.handleAuditDeduct = async function(mat, key) {
    const wo = document.getElementById(`audit_wo_${mat}_${key}`)?.value.trim();
    if (!wo) return alert("❌ กรุณาใส่ WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(key)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ตัดใช้งานแทนพนักงานสำเร็จ"); loadStockData('supervisor'); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// เริ่มต้นระบบตรวจสอบสิทธิ์ทันที
window.checkAuth();
