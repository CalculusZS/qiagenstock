/* ========================================================================== 
   QIAGEN INVENTORY - FULL STABLE VERSION (WITH CART, PREVIEW & OUTLOOK)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const USER_MAP = {
  'KM': 'Kitti',
  'TK': 'Tatchai',
  'PSO': 'Parinyachat',
  'PK': 'Phurilap',
  'PST': 'Penporn',
  'PA': 'Phuriwat'
};

window.allRows = [];
window.cart = []; // ระบบตะกร้าสินค้า

/* ===== 1. AUTH & LOGIN ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());

        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || "User";
            sessionStorage.setItem('selectedUser', sheetColumnName);
            sessionStorage.setItem('userKey', userKey);

            if (res.status === 'NEW') {
                window.showForcePasswordChange(userKey);
            } else {
                window.location.replace('main.html');
            }
        } else {
            alert("❌ Login Failed: " + (res.msg || "Invalid User/Pass"));
        }
    } catch (e) { alert("❌ Login Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    const displayId = ['current-user', 'display-user', 'user_display', 'userName'];
    displayId.forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).innerText = user;
    });
    return true;
};

/* ===== 2. DATA LOADING & RENDER ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" align="center" style="padding:20px;">⌛ Loading Inventory...</td></tr>';

    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data, mode);
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" align="center" style="color:red;">❌ Error loading data</td></tr>';
    }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;

    const userInSheet = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();

    let html = '';
    data.forEach((item, index) => {
        const qty0243 = Number(item['0243'] || 0);
        const qtyUser = Number(item[userInSheet] || 0);

        let displayQty = path.includes('withdraw') ? qty0243 : qtyUser;

        // เงื่อนไขการแสดงผล: Return/Deduct จะโชว์เฉพาะตัวที่เรามีของ
        if ((path.includes('return') || path.includes('deduct')) && qtyUser <= 0) return;

        let actionUI = '';
        if (path.includes('withdraw')) {
            actionUI = qty0243 > 0 
                ? `<div style="display:flex; gap:5px; align-items:center;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${qty0243}" style="width:40px; padding:5px; text-align:center;">
                    <button onclick="window.addToCart('withdraw','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>
                   </div>`
                : '<b style="color:red">OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex; gap:5px; align-items:center;">
                        <input type="number" id="qty_${index}" value="1" min="1" max="${qtyUser}" style="width:40px; padding:5px; text-align:center;">
                        <button onclick="window.addToCart('return','${item.Material}',${index})" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>
                       </div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; flex-direction:column; gap:5px;">
                        <input type="text" id="wo_${index}" placeholder="WO#" style="width:80px; padding:5px; border:1px solid #ccc; border-radius:4px;">
                        <div style="display:flex; gap:5px;">
                            <input type="number" id="qty_${index}" value="1" min="1" max="${qtyUser}" style="width:35px; padding:5px; text-align:center;">
                            <button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444; color:white; border:none; padding:8px; border-radius:8px;">Deduct</button>
                        </div>
                       </div>`;
        }

        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;">
                    <div style="font-weight:bold; color:#1e293b;">${item.Material}</div>
                    <div style="font-size:12px; color:#64748b;">${item['Product Name'] || ''}</div>
                </td>
                <td align="center" style="font-size:16px; font-weight:bold;">${displayQty}</td>
                <td align="right" style="padding:10px;">${actionUI}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px;">No items found.</td></tr>';
};

/* ===== 3. CART & EMAIL SYSTEM ===== */
window.addToCart = function(type, mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const prod = window.allRows[idx]['Product Name'] || 'N/A';
    const fromUser = type === 'withdraw' ? '0243' : sessionStorage.getItem('selectedUser');
    const targetUser = type === 'withdraw' ? sessionStorage.getItem('selectedUser') : '0243';

    window.cart.push({ type, mat, prod, qty, from: fromUser, target: targetUser });
    window.updateCartUI();
    
    // สร้าง Effect เล็กน้อย
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "OK!";
    btn.disabled = true;
    setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 800);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 
        ? `<button onclick="window.showEmailPreview()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer;">📧 Preview & Send (${window.cart.length})</button>`
        : '';
};

window.showEmailPreview = function() {
    const user = sessionStorage.getItem('selectedUser');
    const today = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    const type = window.cart[0].type;

    let subject = type === 'transfer' ? `Spare parts transfer ${today} (User to User)` : 
                  (type === 'return' ? `Spare parts return ${today} (${user})` : `Spare parts transfer ${today} (${user})`);
    
    let intro = type === 'return' ? "Hi BO,\n\nPlease return the spare part as below spare parts." : "Hi BO,\n\nPlease transfer the below spare parts:";
    
    let table = `Catalog | Product Name | Amt | From | To\n` + "-".repeat(45) + "\n";
    window.cart.forEach(i => {
        table += `${i.mat} | ${i.prod} | ${i.qty} | ${i.from} | ${i.target}\n`;
    });

    const fullBody = `${intro}\n\n${table}\n\nBest Regards,\n${user}`;

    // สร้าง Modal แก้ไขข้อมูล
    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px; box-sizing:border-box;";
    modal.innerHTML = `
        <div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px; display:flex; flex-direction:column; gap:10px; max-height:90vh; overflow-y:auto;">
            <h3 style="margin:0; color:#003366;">Confirm & Edit Email</h3>
            <label style="font-weight:bold; font-size:13px;">Subject:</label>
            <input id="edit-sub" value="${subject}" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
            <label style="font-weight:bold; font-size:13px;">Body:</label>
            <textarea id="edit-body" style="width:100%; height:280px; padding:10px; border:1px solid #ddd; border-radius:8px; font-family:monospace; font-size:12px;">${fullBody}</textarea>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button onclick="document.getElementById('email-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none; border-radius:10px; cursor:pointer;">Cancel</button>
                <button onclick="window.confirmSendOutlook()" style="flex:1; padding:12px; background:#0078d4; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Send to Outlook</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.confirmSendOutlook = function() {
    const sub = document.getElementById('edit-sub').value;
    const body = document.getElementById('edit-body').value;
    const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
    const mailCc = "gthfss@qiagen.com";

    const outlookUrl = `ms-outlook://compose?to=${mailTo}&cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    const standardUrl = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = outlookUrl;
    setTimeout(() => { if (document.visibilityState === 'visible') window.location.href = standardUrl; }, 800);

    document.getElementById('email-modal').remove();
    if (confirm("Outlook Opened? Clear the list?")) {
        window.cart = [];
        window.updateCartUI();
        window.loadStockData();
    }
};

/* ===== 4. DEDUCT & HISTORY ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value;
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');

    if (!wo) { alert("❌ Please enter WO#"); return; }
    if (!confirm(`Deduct ${qty} units for WO# ${wo}?`)) return;

    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ Deducted Successfully");
            window.loadStockData();
        } else {
            alert("❌ Error: " + res.msg);
        }
    } catch (e) { alert("❌ Request Error"); }
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    listDiv.innerHTML = '<p align="center">⌛ Loading History...</p>';

    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            const html = res.data.reverse().map(r => `
                <div style="background:white; margin-bottom:10px; padding:12px; border-radius:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05); font-size:13px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span style="color:#64748b;">${new Date(r[0]).toLocaleString()}</span>
                        <b style="color:#003366;">${r[5].toUpperCase()}</b>
                    </div>
                    <b>${r[1]}</b> | ${r[2]}<br>
                    <div style="margin-top:5px; color:#1e293b;">
                        Amount: <b>${r[6]}</b> | WO: <b>${r[8] || '-'}</b> | User: <b>${r[4]}</b>
                    </div>
                </div>
            `).join('');
            listDiv.innerHTML = html || '<p align="center">No history found.</p>';
        }
    } catch (e) { listDiv.innerHTML = '<p align="center">❌ Error loading history</p>'; }
};

/* ===== 5. PASSWORD CHANGE & UTILS ===== */
window.showForcePasswordChange = function(userKey) {
    const newPass = prompt("This is your first login. Please set a new password:");
    if (newPass && newPass.length >= 4) {
        window.processReset(userKey, newPass);
    } else {
        alert("Password too short! Logging out.");
        window.logout();
    }
};

window.processReset = async function(u, p) {
    try {
        const res = await fetch(`${API}?action=resetpass&user=${u}&newpass=${p}&pass=${MASTER_PASS}`).then(r=>r.json());
        if(res.success) {
            alert("✅ Password updated! Please login again.");
            window.logout();
        }
    } catch(e) { alert("❌ Error resetting password"); }
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(q.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(q.toLowerCase())
    );
    window.renderTable(filtered, mode);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// Initialize
window.checkAuth();
if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('team-stock')) {
    window.loadStockData();
}
