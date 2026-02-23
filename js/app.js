/* ========================================================================== 
   QIAGEN INVENTORY - ABSOLUTE FULL VERSION (CART + AUTO-CUT + ALL OPTIONS)
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

/* ===== 1. AUTH & LOGIN (ครบถ้วน) ===== */
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
            if (res.status === 'NEW') window.showForcePasswordChange(userKey);
            else window.location.replace('main.html');
        } else { alert("❌ Login Failed: " + (res.msg || "Invalid User/Pass")); }
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

/* ===== 2. DATA LOADING & RENDER (ครบถ้วน) ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center" style="padding:20px;">⌛ Updating Stock...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data);
        }
    } catch (e) { console.error("Load Error", e); }
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();

    tbody.innerHTML = data.map((item, index) => {
        const q0 = Number(item['0243'] || 0);
        const qU = Number(item[user] || 0);
        const dispQty = path.includes('withdraw') ? q0 : qU;

        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';

        let actionUI = "";
        if (path.includes('withdraw')) {
            actionUI = q0 > 0 ? `<button onclick="window.addToCart('withdraw','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>` : '<b style="color:red">OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<button onclick="window.addToCart('return','${item.Material}',${index})" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:70px; padding:4px; border-radius:4px; border:1px solid #ccc;">
                <button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:8px;">Deduct</button>
            </div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center"><b>${dispQty}</b></td><td align="right" style="white-space:nowrap;"><input type="number" id="qty_${index}" value="1" min="1" max="${dispQty}" style="width:35px; text-align:center; margin-right:5px;">${actionUI}</td></tr>`;
    }).join('');
};

/* ===== 3. CART SYSTEM & AUTO-CUT (ระบบตัดสต็อกอัตโนมัติ) ===== */
window.addToCart = function(type, mat, idx, fromUser = null) {
    const qtyInput = document.getElementById('qty_' + idx) || document.getElementById('t_qty_' + idx + '_' + fromUser);
    const qty = qtyInput ? qtyInput.value : 1;
    const prod = (idx !== null && window.allRows[idx]) ? window.allRows[idx]['Product Name'] : "Spare Part";
    const currentUser = sessionStorage.getItem('selectedUser');

    let finalFrom = fromUser || (type === 'withdraw' ? '0243' : currentUser);
    let finalTo = (type === 'withdraw' || type === 'transfer') ? currentUser : '0243';

    if (finalFrom === finalTo) return alert("❌ Source and Target are the same");

    window.cart.push({ type, mat, prod, qty, from: finalFrom, target: finalTo });
    window.updateCartUI();
    
    const btn = event.target;
    const oldT = btn.innerText;
    btn.innerText = "Added!"; btn.disabled = true;
    setTimeout(() => { btn.innerText = oldT; btn.disabled = false; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showEmailPreview()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; font-size:16px;">📧 Confirm & Send (${window.cart.length})</button>` : '';
};

window.showEmailPreview = function() {
    const user = sessionStorage.getItem('selectedUser'), today = new Date().toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
    const type = window.cart[0].type;
    let sub = `Spare parts ${type} ${today} (${user})`;
    let intro = `Hi BO,\n\nPlease process below spare parts:`;
    let table = `Catalog | Name | Qty | From | To\n` + "-".repeat(45) + "\n";
    window.cart.forEach(i => { table += `${i.mat} | ${i.prod} | ${i.qty} | ${i.from} | ${i.target}\n`; });

    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `
        <div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px; box-sizing:border-box;">
            <h3 style="margin:0 0 5px 0;">Preview & Auto-Cut</h3>
            <p style="font-size:11px; color:red;">*เมื่อกด Confirm ระบบจะหักสต็อกใน Sheet ทันที</p>
            <input id="edit-sub" value="${sub}" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">
            <textarea id="edit-body" style="width:100%; height:180px; padding:10px; border:1px solid #ddd; border-radius:8px; font-family:monospace; font-size:12px;">${intro}\n\n${table}\n\nBest Regards,\n${user}</textarea>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button onclick="document.getElementById('email-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none; border-radius:10px;">Cancel</button>
                <button id="btn-final-send" onclick="window.confirmSendAndCut()" style="flex:1; padding:12px; background:#0078d4; color:white; border:none; border-radius:10px; font-weight:bold;">Confirm & Send</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.confirmSendAndCut = async function() {
    const btn = document.getElementById('btn-final-send');
    btn.innerText = "Syncing Sheet..."; btn.disabled = true;

    try {
        for (const item of window.cart) {
            // ส่งไปตัดสต็อกใน Google Sheet ทีละรายการ
            await fetch(`${API}?action=${item.type}&user=${encodeURIComponent(item.target)}&from=${encodeURIComponent(item.from)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
        }
        alert("✅ Stock Cut Success!");
    } catch (e) { alert("⚠️ Sync to Sheet failed, but opening Outlook..."); }

    const sub = document.getElementById('edit-sub').value, body = document.getElementById('edit-body').value;
    const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com", mailCc = "gthfss@qiagen.com";
    
    // ดีดเข้า Outlook
    window.location.href = `ms-outlook://compose?to=${mailTo}&cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => { if (document.visibilityState === 'visible') window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`; }, 800);
    
    document.getElementById('email-modal').remove();
    window.cart = []; window.updateCartUI(); window.loadStockData(); 
};

/* ===== 4. DEDUCT & HISTORY (ครบถ้วน) ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value, qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Please enter WO#");
    if (!confirm(`Confirm Deduct ${qty} for WO# ${wo}?`)) return;

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Deducted Successfully"); window.loadStockData(); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Request Error"); }
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    listDiv.innerHTML = '<p align="center">⌛ Loading History...</p>';
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.reverse().map(r => `
                <div style="background:white; margin-bottom:8px; padding:10px; border-radius:10px; font-size:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                    <b>${new Date(r[0]).toLocaleString()}</b><br>
                    ${r[1]} | <span style="color:#0078d4;">${r[5].toUpperCase()}</span> | Qty: <b>${r[6]}</b><br>
                    <small>User: ${r[4]} | WO: ${r[8]||'-'}</small>
                </div>`).join('');
        }
    } catch (e) { listDiv.innerHTML = '❌ History Load Error'; }
};

/* ===== 5. PASSWORD RESET & UTILS (ครบถ้วน) ===== */
window.showForcePasswordChange = function(userKey) {
    const newPass = prompt("First login! Please set a new password (min 4 chars):");
    if (newPass && newPass.length >= 4) window.processReset(userKey, newPass);
    else { alert("Password too short! Logging out."); window.logout(); }
};

window.processReset = async function(u, p) {
    try {
        const res = await fetch(`${API}?action=resetpass&user=${u}&newpass=${p}&pass=${MASTER_PASS}`).then(r=>r.json());
        if(res.success) { alert("✅ Password updated! Please login again."); window.logout(); }
    } catch(e) { alert("❌ Reset Error"); }
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(q.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(q.toLowerCase())
    );
    window.renderTable(filtered);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// Start Init
window.checkAuth();
if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('team-stock')) window.loadStockData();
