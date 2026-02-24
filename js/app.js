/* ========================================================================== 
   QIAGEN INVENTORY - V41 (FULL RESTORED & UI ALIGNED)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* ===== 1. AUTH & FORCE PASSWORD ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('selectedUser', sheetName);
            sessionStorage.setItem('userKey', userKey);
            if (res.status === 'NEW') { window.showForcePasswordChange(userKey); } 
            else { window.location.replace('main.html'); }
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ API Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:10000;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:320px;">
        <h3 style="color:#003366">Set New Password</h3>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
        <button onclick="window.processReset('${userKey}')" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:8px;font-weight:bold;width:100%;">Update & Login</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success!"); window.location.reload(); }
};

/* ===== 2. RENDER TABLE (DEDUCT: WO BEFORE QTY) ===== */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;

        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        if (displayQty <= 0 && !path.includes('showall')) return '';

        let actionUI = "";
        if (path.includes('deduct')) {
            // ตามที่สั่ง: [Work Order#] -> [Qty] -> [ปุ่มแดง]
            actionUI = `<div style="display:flex; gap:5px; align-items:center; justify-content:flex-end;">
                <input type="text" id="wo_${index}" placeholder="Work Order#" style="width:110px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:40px; padding:8px; border:1px solid #ddd; border-radius:6px; text-align:center;">
                <button onclick="window.doDeduct('${item.Material}',${index})" style="background:#dc2626; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Deduct</button>
            </div>`;
        } else if (path.includes('withdraw') || path.includes('return')) {
            const color = path.includes('withdraw') ? '#003366' : '#16a34a';
            const from = path.includes('withdraw') ? '0243' : user;
            actionUI = `<div style="display:flex; gap:5px; align-items:center; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:45px; padding:8px; border:1px solid #ddd; border-radius:6px; text-align:center;">
                <button onclick="window.addToCart('${path.includes('withdraw')?'withdraw':'return'}','${item.Material}',${index},'${from}')" style="background:${color}; color:white; border:none; padding:10px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">Add</button>
            </div>`;
        }

        return `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:15px;">
                <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                <div style="font-size:11px; color:#666;">${item['Product Name']}</div>
            </td>
            <td align="center" style="font-size:18px; font-weight:bold;">${displayQty}</td>
            <td align="right" style="padding-right:10px;">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* ===== 3. CORE FUNCTIONS (DEDUCT, SYNC, BASKET) ===== */
window.loadStockData = async function() {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { 
            window.allRows = res.data; 
            if(window.renderTable) window.renderTable(res.data);
            if(window.renderTeamTable) window.renderTeamTable(res.data);
        }
    } catch (e) {}
};

window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ Please enter Work Order#");
    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(sessionStorage.getItem('selectedUser'))}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Deducted!"); window.loadStockData(); }
    } catch (e) { alert("❌ Error"); }
};

window.addToCart = function(type, mat, idx, fromUser) {
    let qtyInput = document.getElementById('qty_' + idx) || document.getElementById(`t_qty_${idx}_${fromUser}`);
    if (!qtyInput) return;
    const user = sessionStorage.getItem('selectedUser');
    window.cart.push({ type, mat, qty: qtyInput.value, from: fromUser, target: (type==='return'?'0243':user) });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#f59e0b; color:white; padding:16px 24px; border-radius:50px; border:none; font-weight:bold; box-shadow:0 8px 20px rgba(0,0,0,0.2);">🛒 Basket (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = `<div style="max-height:250px; overflow-y:auto; margin:15px 0;"><table style="width:100%; font-size:11px; border-collapse:collapse;">
        <tr style="background:#eee; text-align:left;"><th style="padding:8px;">Mat</th><th style="padding:8px;">Qty</th><th style="padding:8px;">From → To</th><th style="padding:8px;"></th></tr>`;
    window.cart.forEach((i, idx) => {
        html += `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">${i.mat}</td><td style="padding:8px;">${i.qty}</td><td style="padding:8px;">${i.from} → ${i.target}</td>
        <td style="padding:8px;"><button onclick="window.removeFromCart(${idx})" style="color:red; border:none; background:none; font-size:16px;">✕</button></td></tr>`;
    });
    html += `</table></div>`;
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    div.innerHTML = `<div style="background:white; width:100%; max-width:400px; border-radius:15px; padding:20px; box-sizing:border-box;">
        <h3 style="margin:0;">Confirm Transactions</h3>${html}
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:14px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; width:100%;">Sync & Send Email</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; background:none; border:none; color:#666; width:100%;">Close</button>
    </div>`;
    document.body.appendChild(div);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn'); btn.innerText = "Processing..."; btn.disabled = true;
    const user = sessionStorage.getItem('selectedUser'), dateStr = new Date().toLocaleDateString('en-GB');
    let emailBody = `Inventory Update:\n\n`;
    try {
        for (const item of window.cart) {
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`, { mode: 'no-cors' });
            emailBody += `- ${item.mat} | Qty: ${item.qty} | ${item.from} -> ${item.target}\n`;
        }
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer ${user} ${dateStr}&body=${encodeURIComponent(emailBody)}`;
        window.cart = []; localStorage.removeItem('qiagen_cart');
        alert("✅ Sync Success!"); window.location.reload();
    } catch (e) { alert("❌ Failed"); btn.disabled = false; }
};

window.removeFromCart = (idx) => {
    window.cart.splice(idx, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    document.getElementById('review-modal').remove();
    if (window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    window.updateCartUI(); return true;
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };
window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
