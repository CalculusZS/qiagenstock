/* ========================================================================== 
   QIAGEN INVENTORY - CUSTOMIZED V13 (FIXED LOGIN, UI & DEDUCT)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzejA7IBIMHmeEvDUoaghhvrh4Mz2ZJD6t4OPEyJliaq73adxajPxNH9vGbRHXUuobt/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = [];

/* ===== 1. AUTH & LOGIN (FIXED REFERENCE ERROR) ===== */
window.handleSetPassword = function() { window.processReset(); };

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input'), pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userKey = uInput.value.trim().toUpperCase(), passVal = pInput.value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', sheetColumnName);
            if (res.status === 'NEW') window.showForcePasswordChange(userKey); 
            else window.location.replace('main.html');
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Connection Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pass-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:320px;box-sizing:border-box;">
        <h3 style="color:#003366;margin-top:0;">Set New Password</h3>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <button id="save-btn" onclick="window.handleSetPassword()" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Update & Activate</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function() {
    const u = sessionStorage.getItem('userKey'), p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2 || p1.length < 4) return alert("❌ Password mismatch or too short");
    const btn = document.getElementById('save-btn');
    btn.innerText = "Processing..."; btn.disabled = true;
    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Activated!"); sessionStorage.clear(); window.location.reload(); }
        else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Error"); }
};

/* ===== 2. STOCK OPERATIONS (RE-ENGINEERED) ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Updating Data...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        // Logic สำหรับการโอนจากเพื่อน (Team Stock)
        let owner = "0243";
        if (path.includes('team-stock')) {
            // ค้นหาคนที่มีของ (ที่ไม่ใช่เรา และไม่ใช่ส่วนกลาง 0243)
            owner = Object.keys(item).find(k => !['Material','Product Name','Instrument','0243',user].includes(k) && Number(item[k]) > 0) || "Others";
        }

        const q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0), qOwner = Number(item[owner] || 0);
        
        // กรองการแสดงผล
        if (path.includes('return') && qU <= 0) return '';
        if (path.includes('deduct') && qU <= 0) return '';
        if (path.includes('team-stock') && qOwner <= 0) return '';

        let btn = "";
        let displayQty = q0; // Default

        if (path.includes('withdraw')) {
            btn = q0 > 0 ? `<button onclick="window.addToCart('withdraw','${item.Material}',${index},'0243')" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Add</button>` : '<b style="color:red">OUT</b>';
        } else if (path.includes('return')) {
            displayQty = qU;
            btn = `<button onclick="window.addToCart('return','${item.Material}',${index},'${user}')" style="background:#16a34a;color:white;border:none;padding:8px;border-radius:8px;">Add</button>`;
        } else if (path.includes('team-stock')) {
            displayQty = qOwner;
            btn = `<button onclick="window.addToCart('transfer','${item.Material}',${index},'${owner}')" style="background:#f59e0b;color:white;border:none;padding:8px;border-radius:8px;">Add</button>`;
        } else if (path.includes('deduct')) {
            displayQty = qU;
            btn = `<div style="display:flex;flex-direction:column;gap:4px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:70px;padding:4px;border:1px solid #ddd;border-radius:4px;"><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444;color:white;border:none;padding:6px;border-radius:5px;">Deduct</button></div>`;
        } else if (path.includes('showall')) {
            displayQty = q0; // หน้า ShowAll ไม่มีปุ่ม Add ตามที่สั่ง
            btn = `<small style="color:#666;">View Only</small>`;
        }

        return `<tr>
            <td style="padding:10px;">
                <b>${item.Material}</b><br><small>${item['Product Name']}</small>
                ${path.includes('team-stock') ? `<br><small style="color:#0078d4;">Owner: ${owner}</small>` : ''}
            </td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">
                ${!path.includes('showall') ? `<input type="number" id="qty_${index}" value="1" style="width:35px;text-align:center;margin-right:5px;">` : ''} 
                ${btn}
            </td>
        </tr>`;
    }).join('');
};

/* ===== 3. CART SYSTEM (GLOBAL) ===== */
window.addToCart = function(type, mat, idx, fromUser) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const user = sessionStorage.getItem('selectedUser');
    
    // กำหนดปลายทาง (To)
    let fTo = (type === 'withdraw' || type === 'transfer') ? user : '0243';
    
    window.cart.push({ type, mat, qty, from: fromUser, target: fTo });
    window.updateCartUI();
    
    const btn = event.target;
    btn.innerText = "Added!"; btn.disabled = true;
    setTimeout(() => { btn.innerText = "Add"; btn.disabled = false; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer;">📧 Basket (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    const user = sessionStorage.getItem('selectedUser');
    let tableHtml = `<div style="max-height:200px;overflow-y:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr style="background:#eee;"><th>Material</th><th>Qty</th><th>From</th><th>To</th></tr>`;
    window.cart.forEach(i => { tableHtml += `<tr style="border-bottom:1px solid #ddd;"><td>${i.mat}</td><td align="center">${i.qty}</td><td>${i.from}</td><td>${i.target}</td></tr>`; });
    tableHtml += `</table></div>`;

    const modal = document.createElement('div');
    modal.id = "review-modal";
    modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;padding:15px;";
    modal.innerHTML = `<div style="background:white;width:100%;max-width:450px;border-radius:15px;padding:20px;">
        <h3 style="margin-top:0;">Confirm Transactions</h3>
        ${tableHtml}
        <div style="display:flex;gap:10px;margin-top:15px;">
            <button onclick="document.getElementById('review-modal').remove()" style="flex:1;padding:12px;background:#eee;border:none;border-radius:10px;">Close</button>
            <button id="sync-btn" onclick="window.confirmSendAndSync()" style="flex:2;padding:12px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;">Sync & Send Email</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    btn.innerText = "Syncing..."; btn.disabled = true;
    const user = sessionStorage.getItem('selectedUser');
    let emailBody = `Hi BO,\nPlease process the following inventory update:\n\n`;
    
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
            emailBody += `- Mat: ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.target}\n`;
        }
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Inventory Update - ${user}&body=${encodeURIComponent(emailBody)}`;
        alert("✅ Sync Success!");
        window.cart = []; window.updateCartUI(); window.loadStockData();
        document.getElementById('review-modal').remove();
    } catch (e) { alert("❌ Sync Failed"); btn.disabled = false; }
};

/* ===== 4. DEDUCT & HISTORY ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value;
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Please enter Work Order (WO#)");
    
    if(!confirm(`Deduct ${mat} (Qty: ${qty}) for WO: ${wo}?`)) return;

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Deducted Successfully"); window.loadStockData(); }
        else alert("❌ Error: " + res.msg);
    } catch (e) { alert("❌ Server Error"); }
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            // ดึง Column G (Index 6) เป็น From และ Column H (Index 7) เป็น User/To
            listDiv.innerHTML = res.data.reverse().map(r => `
                <div style="padding:12px; border-bottom:1px solid #eee; font-size:12px; background:white; margin-bottom:5px; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between;">
                        <b>${new Date(r[0]).toLocaleDateString()}</b>
                        <span style="color:#0078d4; font-weight:bold;">${r[4]}</span>
                    </div>
                    <div style="margin-top:5px;"><b>Part:</b> ${r[1]} | <b>Qty:</b> ${r[5]}</div>
                    <div style="color:#666; font-size:11px; margin-top:3px;">
                        <b>From:</b> ${r[6] || '-'} | <b>To/User:</b> ${r[7] || '-'}
                    </div>
                </div>`).join('');
        }
    } catch(e) {}
};

/* ===== 5. UI UTILS ===== */
window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    ['current-user', 'display-user', 'user_display', 'userName'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = user; });
    return true;
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

// Start Logic
window.checkAuth();
if (!window.location.pathname.includes('index.html')) {
    window.loadStockData();
    if (window.location.pathname.includes('history')) window.loadHistory();
}
