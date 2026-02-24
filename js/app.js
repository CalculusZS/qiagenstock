/* ========================================================================== 
   QIAGEN INVENTORY - V38 (ALL-IN-ONE RECOVERED & STABLE)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* ===== 1. AUTH & FORCE PASSWORD (LOGIN FIRST TIME) ===== */
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

            if (res.status === 'NEW') {
                window.showForcePasswordChange(userKey);
            } else {
                window.location.replace('main.html');
            }
        } else { alert("❌ Login Failed: Credentials incorrect"); }
    } catch (e) { alert("❌ API Connection Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pw-overlay";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:99999;";
    div.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;text-align:center;width:320px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <h3 style="color:#003366;margin:0 0 10px 0;">Set New Password</h3>
            <p style="font-size:12px; color:#666; margin-bottom:20px;">First time login, please update your password.</p>
            <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:16px;">
            <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:16px;">
            <button onclick="window.processReset('${userKey}')" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:15px;font-size:16px;">Update & Login</button>
        </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Success! Please login again."); window.location.reload(); }
    } catch (e) { alert("❌ Server Error"); }
};

/* ===== 2. RENDER TABLE (SUPPORT ALL PAGES + TEAM STOCK) ===== */
window.renderTable = function(data) {
    const tbody = document.getElementById('data') || document.getElementById('team-data-body');
    if (!tbody) return;

    const userInSheet = sessionStorage.getItem('selectedUser'); 
    const path = window.location.pathname.toLowerCase();
    const members = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

    tbody.innerHTML = data.map((item, index) => {
        // --- CASE: Team Stock Page ---
        if (path.includes('team-stock')) {
            let memberRows = "";
            members.forEach(m => {
                const qM = Number(item[m] || 0);
                if (m !== userInSheet && qM > 0) {
                    memberRows += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:15px;">
                            <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                            <div style="font-size:11px; color:#666;">${item['Product Name'] || ''}</div>
                            <div style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold; margin-top:4px;">👤 Owner: ${m}</div>
                        </td>
                        <td align="center" style="font-size:18px; font-weight:bold; border-bottom: 1px solid #eee;">${qM}</td>
                        <td align="right" style="padding-right:10px;">
                            <div style="display:flex; gap:5px; align-items:center; justify-content:flex-end;">
                                <input type="number" id="t_qty_${index}_${m}" value="1" min="1" max="${qM}" style="width:40px; padding:8px; border-radius:6px; border:1px solid #ddd; text-align:center;">
                                <button onclick="window.addToCart('transfer', '${item.Material}', ${index}, '${m}')" style="background:#f59e0b; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Transfer</button>
                            </div>
                        </td>
                    </tr>`;
                }
            });
            return memberRows;
        }

        // --- CASE: Regular Pages (Withdraw, Return, Deduct) ---
        const qty0243 = Number(item['0243'] || 0);
        const qtyUser = Number(item[userInSheet] || 0); 
        const displayQty = (path.includes('withdraw') || path.includes('showall')) ? qty0243 : qtyUser;

        if ((path.includes('return') || path.includes('deduct')) && qtyUser <= 0) return '';
        if (displayQty <= 0 && !path.includes('showall')) return '';

        let actionUI = "";
        if (path.includes('withdraw')) {
            actionUI = `<div style="display:flex; align-items:center; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:45px; padding:8px; border-radius:8px; border:1px solid #ddd; text-align:center;">
                <button onclick="window.addToCart('withdraw','${item.Material}',${index},'0243')" style="background:#003366; color:white; border:none; padding:10px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">Add</button>
            </div>`;
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex; align-items:center; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:45px; padding:8px; border-radius:8px; border:1px solid #ddd; text-align:center;">
                <button onclick="window.addToCart('return','${item.Material}',${index},'${userInSheet}')" style="background:#16a34a; color:white; border:none; padding:10px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">Add</button>
            </div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; gap:5px; align-items:center; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:40px; padding:8px; border-radius:6px; border:1px solid #ddd; text-align:center;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:70px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#ef4444; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Deduct</button>
            </div>`;
        }

        return `<tr>
            <td style="padding:15px; border-bottom:1px solid #eee;">
                <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                <div style="font-size:11px; color:#666;">${item['Product Name'] || ''}</div>
            </td>
            <td align="center" style="font-size:18px; font-weight:bold; border-bottom:1px solid #eee;">${displayQty}</td>
            <td align="right" style="padding-right:10px; border-bottom:1px solid #eee;">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* ===== 3. OPERATIONS (DEDUCT & BASKET LOGIC) ===== */
window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ Please enter WO#");
    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(sessionStorage.getItem('selectedUser'))}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deducted!"); window.loadStockData(); }
    } catch (e) { alert("❌ Error"); }
};

window.addToCart = function(type, mat, idx, fromUser) {
    let qtyInput = document.getElementById('qty_' + idx) || document.getElementById(`t_qty_${idx}_${fromUser}`);
    if (!qtyInput) return alert("❌ Qty error");
    
    window.cart.push({ 
        type, mat, qty: qtyInput.value, from: fromUser, 
        target: (type === 'return' ? '0243' : sessionStorage.getItem('selectedUser')) 
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
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#f59e0b; color:white; padding:16px 24px; border-radius:50px; border:none; box-shadow:0 8px 20px rgba(0,0,0,0.2); font-weight:bold; cursor:pointer;">🛒 Basket (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = `<div style="max-height:250px; overflow-y:auto; margin:15px 0;"><table style="width:100%; font-size:12px; border-collapse:collapse;">
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
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:14px; background:#003366; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; width:100%;">Sync & Send Email</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; background:none; border:none; color:#666; width:100%;">Close</button>
    </div>`;
    document.body.appendChild(div);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn'); btn.innerText = "Syncing..."; btn.disabled = true;
    const user = sessionStorage.getItem('selectedUser'), dateStr = new Date().toLocaleDateString('en-GB');
    let emailBody = `Inventory Update Request (${dateStr}):\n\n`;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' });
            emailBody += `- ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.target}\n`;
        }
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer ${user} ${dateStr}&body=${encodeURIComponent(emailBody)}`;
        window.cart = []; localStorage.removeItem('qiagen_cart');
        alert("✅ Sync Success!"); window.location.reload();
    } catch (e) { alert("❌ Sync Failed"); btn.disabled = false; }
};

window.removeFromCart = (idx) => {
    window.cart.splice(idx, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    document.getElementById('review-modal').remove();
    if (window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
};

/* ===== 4. CORE LOAD & AUTH ===== */
window.loadStockData = async function() {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) { console.error("Load error", e); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    const ids = ['current-user', 'display-user', 'user_display', 'userName'];
    ids.forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = user; });
    window.updateCartUI(); return true;
};

window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
