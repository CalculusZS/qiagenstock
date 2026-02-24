/* ========================================================================== 
   QIAGEN INVENTORY - V46 (FULL OPTION + PRODUCT NAME IN BASKET)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* 1. AUTH & PASSWORD RESET */
window.handleLogin = async function() {
    const u = document.getElementById('username-input').value.trim().toUpperCase();
    const p = document.getElementById('password-input').value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
            if (res.status === 'NEW') { window.showForcePasswordChange(u); } 
            else { window.location.replace('main.html'); }
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Connection Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:10000;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:320px;">
        <h3 style="color:#f97316">Set New Password</h3>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;">
        <button onclick="window.processReset('${userKey}')" style="width:100%;padding:14px;background:#f97316;color:white;border:none;border-radius:8px;font-weight:bold;">Update & Login</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (p1 !== p2) return alert("❌ Passwords do not match");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) window.location.reload();
};

/* 2. RENDER (DEDUCT: WO -> QTY -> BTN) */
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
            actionUI = `<div style="display:flex; gap:5px; align-items:center; justify-content:flex-end;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:90px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:40px; padding:8px; border:1px solid #ddd; border-radius:6px; text-align:center;">
                <button onclick="window.doDeduct('${item.Material}',${index})" style="background:#dc2626; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">Deduct</button>
            </div>`;
        } else {
            const isWithdraw = path.includes('withdraw');
            const color = isWithdraw ? '#003366' : '#16a34a';
            const from = isWithdraw ? '0243' : user;
            actionUI = `<div style="display:flex; gap:5px; align-items:center; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:45px; padding:8px; border:1px solid #ddd; border-radius:8px; text-align:center;">
                <button onclick="window.addToCart('${isWithdraw?'withdraw':'return'}','${item.Material}',${index},'${from}')" style="background:${color}; color:white; border:none; padding:10px 14px; border-radius:8px; font-weight:bold;">Add</button>
            </div>`;
        }

        return `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:15px;"><div style="font-weight:bold; color:#003366;">${item.Material}</div><div style="font-size:11px; color:#666;">${item['Product Name']}</div></td>
            <td align="center" style="font-size:18px; font-weight:bold;">${displayQty}</td>
            <td align="right" style="padding-right:10px;">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* 3. CORE LOGIC & BASKET (ADDED PRODUCT NAME) */
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

window.addToCart = function(type, mat, idx, fromUser) {
    let qInput = document.getElementById('qty_' + idx) || document.getElementById(`t_qty_${idx}_${fromUser}`);
    const itemData = window.allRows.find(i => String(i.Material) === String(mat)) || {};
    const user = sessionStorage.getItem('selectedUser');
    
    window.cart.push({ 
        type, 
        mat, 
        name: itemData['Product Name'] || 'N/A', // เพิ่ม Product Name เข้าไปในตะกร้า
        qty: qInput.value, 
        from: fromUser, 
        target: (type==='return'?'0243':user) 
    });
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
    // เพิ่มคอลัมน์ Product Name ในหน้าสรุปตะกร้า
    let html = `<div style="max-height:280px; overflow-y:auto; margin:15px 0;"><table style="width:100%; font-size:11px; border-collapse:collapse;">
        <tr style="background:#eee;"><th style="padding:8px;text-align:left;">Material / Product Name</th><th style="padding:8px;">Qty</th><th style="padding:8px;">From→To</th><th style="padding:8px;"></th></tr>`;
    
    window.cart.forEach((i, idx) => {
        html += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px;">
                <div style="font-weight:bold;">${i.mat}</div>
                <div style="font-size:10px; color:#666;">${i.name}</div>
            </td>
            <td style="padding:8px; text-align:center;">${i.qty}</td>
            <td style="padding:8px; text-align:center;">${i.from}→${i.target}</td>
            <td style="padding:8px;"><button onclick="window.removeFromCart(${idx})" style="color:red; border:none; background:none; font-weight:bold;">✕</button></td>
        </tr>`;
    });
    html += `</table></div>`;
    
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    div.innerHTML = `<div style="background:white; width:100%; max-width:450px; border-radius:20px; padding:20px;">
        <h3 style="margin:0; color:#003366;">Confirm Transactions</h3>${html}
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:14px; background:#003366; color:white; border:none; border-radius:12px; font-weight:bold;">Sync & Send Email</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; background:none; border:none; color:#666;">Close</button>
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
            emailBody += `- ${item.mat} (${item.name}) | Qty: ${item.qty} | ${item.from} -> ${item.target}\n`;
        }
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer ${user} ${dateStr}&body=${encodeURIComponent(emailBody)}`;
        window.cart = []; localStorage.removeItem('qiagen_cart');
        alert("✅ Sync Success!"); window.location.reload();
    } catch (e) { alert("❌ Failed"); btn.disabled = false; }
};

window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ Work Order# Required");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(sessionStorage.getItem('selectedUser'))}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Deducted!"); window.loadStockData(); }
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
