/* ========================================================================== 
   QIAGEN INVENTORY - FULL STABLE + FORCED OUTLOOK MOBILE VERSION
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.allRows = [];

/* ===== 1. AUTH & LOGIN (With Force Reset) ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', sheetColumnName);
            if (res.status === 'NEW') { window.showForcePasswordChange(userKey); } 
            else { window.location.replace('main.html'); }
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Server Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    const ids = ['current-user', 'display-user', 'user_display', 'userName'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerText = user; });
    return true;
};

/* ===== 2. DATA LOADING ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" align="center">⌛ Loading Inventory...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data, mode);
        }
    } catch (e) { console.error(e); }
};

/* ===== 3. OPERATIONS + FIXED OUTLOOK TRIGGER ===== */
window.doAction = async function(type, mat, idx) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const userInSheet = sessionStorage.getItem('selectedUser'); 
    
    if (!confirm(`Confirm ${type} ${qty} unit(s)?`)) return;

    try {
        const url = `${API}?action=${type}&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res.success) { 
            alert("✅ Transaction Success");

            if (type === 'withdraw') {
                const prod = window.allRows[idx]['Product Name'] || 'N/A';
                const today = "9 Feb 2026";
                const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
                const mailCc = "gthfss@qiagen.com";
                const subject = `Spare parts transfer ${today}`;
                
                let body = `Hi BO,\n\nPlease transfer the below spare parts.\n\n`;
                body += `Catalog: ${mat}\n`;
                body += `Product Name: ${prod}\n`;
                body += `Amount: ${qty}\n`;
                body += `From: 0243\n`;
                body += `To: ${userInSheet}\n\n`;
                body += `Best Regards,\nPhurilap\nphurilap.khonthong@qiagen.com`;

                // --- FORCED OUTLOOK LINK ---
                const outlookLink = `ms-outlook://compose?to=${mailTo}&cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                const mailtoLink = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                // สั่งเปิด Outlook Deep Link
                window.location.href = outlookLink;

                // ตัวสำรอง: ถ้าเครื่องไม่มี Outlook หรือ Deep Link ไม่ทำงานใน 0.8 วินาที ให้ใช้ mailto
                setTimeout(() => {
                    if (document.visibilityState === 'visible') {
                        window.location.href = mailtoLink;
                    }
                }, 800);
            }
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Request Error"); }
};

/* ===== 4. SUPERVISOR & ADMIN FUNCTIONS ===== */
window.doDeduct = async function(mat, idx) {
    const woInput = document.getElementById('wo_' + idx);
    const wo = woInput ? woInput.value.trim() : "";
    const qty = document.getElementById('qty_' + idx).value;
    const userInSheet = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Please enter WO#");
    
    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Success"); window.loadStockData(); }
    } catch (e) { alert("❌ Error"); }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim();
    const qty = document.getElementById('s_qty').value;
    if (!mat) return alert("Enter Material");
    try {
        const res = await fetch(`${API}?action=addstock&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Added"); window.loadStockData('supervisor'); }
    } catch (e) { alert("❌ Error"); }
};

window.setupAdminLookup = function() {
    const matVal = document.getElementById('s_mat').value.toUpperCase();
    const found = window.allRows.find(r => String(r.Material) === matVal);
    const display = document.getElementById('s_name_display');
    if (display) display.innerText = found ? found['Product Name'] : "Not found";
};

window.resetStaffPassword = async function(staffName) {
    if (!confirm(`Reset password for ${staffName}?`)) return;
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(staffName)}&newPass=1234&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) alert(`✅ Reset to: 1234`);
    } catch (e) { alert("❌ Reset Failed"); }
};

/* ===== 5. TABLE RENDER (Staff & Supervisor) ===== */
window.renderTable = function(data, mode) {
    const tbody = document.getElementById(mode === 'supervisor' ? 'staff-data' : 'data');
    if (!tbody) return;
    const userInSheet = sessionStorage.getItem('selectedUser'); 
    const path = window.location.pathname.toLowerCase();
    const isCentral = path.includes('withdraw') || path.includes('showall');

    tbody.innerHTML = data.map((item, index) => {
        const qty0243 = Number(item['0243'] || 0);
        const qtyUser = Number(item[userInSheet] || 0); 
        const displayQty = isCentral ? qty0243 : qtyUser;

        if (mode === 'supervisor') {
            return `<tr><td><b>${item.Material}</b><br><small>${item['Product Name'] || ''}</small></td><td>${item.Holder || 'Central'}</td><td align="center"><b>${item.Qty || 0}</b></td>
            <td align="right"><button onclick="window.doAction('deduct','${item.Material}',${index})" style="background:#ef4444; color:white; border:none; padding:8px; border-radius:6px; cursor:pointer;">Deduct</button></td></tr>`;
        }

        if ((path.includes('return') || path.includes('deduct')) && qtyUser <= 0) return '';

        let actionUI = "";
        if (path.includes('withdraw')) {
            actionUI = qty0243 > 0 ? `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" min="1" max="${qty0243}" style="width:40px; text-align:center;"><button onclick="window.doAction('withdraw','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer;">Withdraw</button></div>` : '<b style="color:red;">OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" min="1" max="${qtyUser}" style="width:40px; text-align:center;"><button onclick="window.doAction('return','${item.Material}',${index})" style="background:#16a34a; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer;">Return</button></div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;"><div style="display:flex; gap:5px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:70px; padding:5px;"><input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center;"></div><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444; color:white; border:none; padding:8px; border-radius:8px; width:120px; cursor:pointer;">Deduct</button></div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${displayQty}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

/* ===== 6. UTILS & UI ===== */
window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:9999;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:300px;">
        <h3>Set Password</h3><input type="password" id="p1" placeholder="New Password" style="width:100%;padding:10px;margin:5px 0;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:10px;margin:5px 0;">
        <button onclick="window.processReset('${userKey}')" style="width:100%;padding:12px;background:#003366;color:white;border:none;border-radius:10px;">Update</button></div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) return alert("❌ No match");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()) || (r.Holder && String(r.Holder).toLowerCase().includes(q.toLowerCase())));
    window.renderTable(filtered, mode);
};

window.goToAdmin = () => {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'flex';
};

window.submitAdminPass = () => {
    const pass = document.getElementById('admin-pass-input').value;
    if (pass === SUP_PASSWORD) {
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'admin.html';
    } else { alert("❌ Incorrect Admin Password"); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
