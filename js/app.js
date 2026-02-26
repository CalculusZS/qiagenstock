/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (English)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* 1. AUTH & LOGIN */
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

/* 2. STOCK LOGIC */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;

        if (path.includes('showall')) {
            let color = displayQty <= 0 ? 'red' : 'black';
            return `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:15px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                <td align="center" style="font-size:18px; font-weight:bold; color:${color};">${displayQty}</td>
                <td align="right"><span style="color:${displayQty <= 0 ? 'red' : '#94a3b8'}; font-weight:bold;">Availability</span></td>
            </tr>`;
        }

        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        if (displayQty <= 0 && !path.includes('showall')) return '';

        let actionUI = "";
        if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:80px; padding:8px; border:1px solid #ddd; border-radius:5px;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; text-align:center;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626; color:white; border:none; padding:8px; border-radius:5px;">DEDUCT</button>
            </div>`;
        } else {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" style="width:45px; text-align:center;">
                <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:8px 14px; border-radius:5px;">ADD</button>
            </div>`;
        }

        return `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:15px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center" style="font-size:18px; font-weight:bold;">${displayQty}</td>
            <td align="right">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* 3. CORE ACTIONS */
window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("Please enter Work Order number");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("Deducted Successfully"); window.loadStockData(); }
    } catch(e) { alert("Connection Error"); }
};

window.addToCart = function(type, mat, idx, fromUser, targetUser) {
    let qId = type === 'transfer' ? `t_qty_${idx}_${fromUser}` : `qty_${idx}`;
    let qty = document.getElementById(qId).value;
    const item = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: item['Product Name'], qty, from: fromUser, target: targetUser });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn'); btn.innerText = "Syncing..."; btn.disabled = true;
    let emailBody = `Hi BO,\n\nPlease transfer the below spare parts.\n\n`;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url).then(r => r.json());
            emailBody += `- ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.target}\n`;
        }
        window.location.replace(`mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer&body=${encodeURIComponent(emailBody)}`);
        window.cart = []; localStorage.removeItem('qiagen_cart');
        alert("Sync Completed!"); window.location.reload();
    } catch (e) { alert("Sync Error"); btn.disabled = false; }
};

/* 4. UTILS & INIT */
window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { window.allRows = res.data; window.renderTable(res.data); }
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9; color:white; padding:15px 25px; border-radius:50px; border:none; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.2);">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = `<div style="max-height:250px; overflow-y:auto; margin:15px 0;">`;
    window.cart.forEach((i, idx) => { html += `<div style="font-size:12px; border-bottom:1px solid #ddd; padding:8px;"><b>${i.mat}</b> (Qty: ${i.qty})<br><small>${i.from} -> ${i.target}</small></div>`; });
    html += `</div>`;
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    div.innerHTML = `<div style="background:white; width:100%; max-width:400px; border-radius:15px; padding:20px;">
        <h3 style="margin:0;">Review Items</h3>${html}
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:15px; background:#0ea5e9; color:white; border:none; border-radius:10px; font-weight:bold;">Confirm & Sync</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; border:none; background:none; color:gray;">Cancel</button>
    </div>`;
    document.body.appendChild(div);
};

window.checkAuth = () => {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) window.location.replace('index.html');
    window.updateCartUI(); return true;
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
