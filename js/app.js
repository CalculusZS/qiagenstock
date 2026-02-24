/* ========================================================================== 
   QIAGEN INVENTORY - COMPLETE STABLE VERSION (V17)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzejA7IBIMHmeEvDUoaghhvrh4Mz2ZJD6t4OPEyJliaq73adxajPxNH9vGbRHXUuobt/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* ===== 1. AUTH & LOGIN SYSTEM (เสถียรที่สุด) ===== */
window.handleSetPassword = function() { window.processReset(); };

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
            if (res.status === 'NEW') window.showForcePasswordChange(userKey); 
            else window.location.replace('main.html');
        } else {
            alert("❌ Login Failed: Invalid ID or Password");
        }
    } catch (e) { alert("❌ Connection Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pass-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:320px;">
        <h3>Set New Password</h3>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:10px 0;border-radius:10px;border:1px solid #ddd;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:10px 0;border-radius:10px;border:1px solid #ddd;">
        <button onclick="window.handleSetPassword()" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:10px;cursor:pointer;">Update</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function() {
    const u = sessionStorage.getItem('userKey'), p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2 || p1.length < 4) return alert("❌ Password mismatch");
    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Activated!"); sessionStorage.clear(); window.location.reload(); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 2. RENDER TABLE (UI ปรับตามแต่ละหน้า) ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Updating Data...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) {}
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let owner = "0243", type = "withdraw";
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);

        if (path.includes('team-stock')) {
            owner = Object.keys(item).find(k => !['Material','Product Name','Instrument','0243',user].includes(k) && Number(item[k]) > 0) || "Others";
            type = "transfer";
        }

        let currentQty = q0;
        if (path.includes('return') || path.includes('deduct')) currentQty = qU;
        if (path.includes('team-stock')) currentQty = Number(item[owner] || 0);

        // หน้าโชว์ทั้งหมด (แสดงตัวแดงเมื่อไม่มีของ)
        if (path.includes('showall')) {
            return `<tr><td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center">${currentQty > 0 ? `<b>${currentQty}</b>` : '<b style="color:red">ไม่มีอะไหล่</b>'}</td>
            <td align="right"><small>View Only</small></td></tr>`;
        }

        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        if (path.includes('team-stock') && currentQty <= 0) return '';

        let actionArea = "";
        if (path.includes('deduct')) {
            // ช่อง WO กว้างขึ้น 2 เท่า
            actionArea = `<input type="text" id="wo_${index}" placeholder="Work Order#" style="width:140px; padding:8px; border:1px solid #ddd; border-radius:5px; margin-bottom:5px;"><br>
            <button onclick="window.doDeduct('${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px 15px; border-radius:8px; width:100%; cursor:pointer;">Deduct</button>`;
        } else {
            let statusBtn = currentQty > 0 
                ? `<button onclick="window.addToCart('${type}','${item.Material}',${index},'${owner}')" style="background:#003366; color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer;">Add</button>`
                : '<b style="color:red">OUT</b>';
            actionArea = `<input type="number" id="qty_${index}" value="1" style="width:40px; text-align:center; margin-right:5px; padding:5px; border:1px solid #ddd; border-radius:5px;"> ${statusBtn}`;
        }

        return `<tr><td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small>${path.includes('team-stock') ? `<br><small style="color:blue">Owner: ${owner}</small>` : ''}</td>
        <td align="center"><b>${currentQty}</b></td><td align="right">${actionArea}</td></tr>`;
    }).join('');
};

/* ===== 3. BASKET SYSTEM (ตะกร้าสะสมไม่หาย) ===== */
window.addToCart = function(type, mat, idx, fromUser) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const user = sessionStorage.getItem('selectedUser');
    let fTo = (type === 'withdraw' || type === 'transfer') ? user : '0243';
    let fFrom = (type === 'return') ? user : fromUser;
    
    window.cart.push({ type, mat, qty, from: fFrom, target: fTo });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
    const btn = event.target; btn.innerText = "Added!";
    setTimeout(() => { btn.innerText = "Add"; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#d97706; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer;">🛒 Basket (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let tableHtml = `<div style="max-height:200px;overflow-y:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;"><tr style="background:#eee;"><th>Mat</th><th>Qty</th><th>From</th><th>To</th><th></th></tr>`;
    window.cart.forEach((i, idx) => { 
        tableHtml += `<tr style="border-bottom:1px solid #ddd;"><td style="padding:5px;">${i.mat}</td><td align="center">${i.qty}</td><td>${i.from}</td><td>${i.target}</td>
        <td align="center"><button onclick="window.removeFromCart(${idx})" style="border:none;background:none;color:red;cursor:pointer;">✕</button></td></tr>`; 
    });
    tableHtml += `</table></div>`;
    const modal = document.createElement('div');
    modal.id = "review-modal";
    modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;padding:15px;";
    modal.innerHTML = `<div style="background:white;width:100%;max-width:450px;border-radius:15px;padding:20px;"><h3 style="margin-top:0;">Confirm Transactions</h3>${tableHtml}
        <div style="display:flex;gap:10px;margin-top:15px;"><button onclick="document.getElementById('review-modal').remove()" style="flex:1;padding:12px;background:#eee;border:none;border-radius:10px;cursor:pointer;">Close</button>
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="flex:2;padding:12px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Sync & Email</button></div></div>`;
    document.body.appendChild(modal);
};

window.removeFromCart = function(idx) {
    window.cart.splice(idx, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    document.getElementById('review-modal').remove();
    if (window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    btn.innerText = "Syncing..."; btn.disabled = true;
    const user = sessionStorage.getItem('selectedUser'), dateStr = new Date().toLocaleDateString('en-GB');
    let emailBody = `Hi BO,\nPlease process the following inventory update:\n\n`;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
            emailBody += `- Mat: ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.target}\n`;
        }
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer ${user} ${dateStr}&body=${encodeURIComponent(emailBody)}`;
        window.cart = []; localStorage.removeItem('qiagen_cart');
        alert("✅ Sync Success!");
        window.updateCartUI(); window.loadStockData();
        document.getElementById('review-modal').remove();
    } catch (e) { alert("❌ Sync Failed"); btn.disabled = false; }
};

/* ===== 4. DEDUCT & HISTORY (ประวัติ 9 คอลัมน์) ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value;
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Please enter Work Order#");
    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deducted Successfully"); window.loadStockData(); }
    } catch (e) { alert("❌ Server Error"); }
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.reverse().map(r => `
                <div style="padding:15px; border-bottom:1px solid #eee; font-size:12px; background:white; margin-bottom:10px; border-radius:10px; line-height:1.6;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #ccc; padding-bottom:5px;">
                        <b>📅 ${new Date(r[0]).toLocaleString('th-TH')}</b><b style="color:#0078d4;">Action: ${r[4]}</b>
                    </div><div style="margin-top:8px;"><b>Material:</b> ${r[1]}<br><b>Instrument:</b> ${r[2] || '-'}<br>
                    <b>Product Name:</b> ${r[3]}<br><b>WO#:</b> <span style="color:#ef4444; font-weight:bold;">${r[8] || '-'}</span><br>
                    <b>Qty:</b> ${r[5]}<br><b>From:</b> ${r[6]} | <b>User/To:</b> ${r[7]}</div></div>`).join('');
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
    window.updateCartUI(); 
    return true;
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) {
    window.loadStockData();
    if (window.location.pathname.includes('history')) window.loadHistory();
}
