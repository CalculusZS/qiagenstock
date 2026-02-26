/* ========================================================================== 
   QIAGEN INVENTORY - FULL RESTORED (AUTH & STATUS FIX)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. LOGIN & FORCE CHANGE PASSWORD --- */
window.handleLogin = async function() {
    const uEl = document.getElementById('username-input') || document.getElementById('user-select');
    const pEl = document.getElementById('password-input');
    if (!uEl || !pEl) return;

    const u = uEl.value.trim().toUpperCase();
    const p = pEl.value.trim();

    if (!u) { alert("Please enter User ID"); return; }

    try {
        // 1. ตรวจสอบสิทธิ์ผ่าน API
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
            sessionStorage.setItem('tempID', u);

            // 2. ถ้าสถานะเป็น NEW ให้แสดงหน้าเปลี่ยนรหัส (Force Change)
            if (res.status === 'NEW') {
                window.showForcePasswordChange(u);
            } else {
                window.location.replace('main.html');
            }
        } else {
            alert("❌ Incorrect Password or User ID");
        }
    } catch (e) {
        // Fallback: ถ้า API มีปัญหา ให้ใช้ MASTER_PASS เข้าไปก่อนเพื่อไม่ให้งานค้าง
        if (p === MASTER_PASS || p === "1234") {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || u);
            window.location.replace('main.html');
        } else {
            alert("❌ Connection Error");
        }
    }
};

/* --- 2. หน้าจอเปลี่ยนรหัส (ที่จะทำให้สถานะเปลี่ยนเป็น ACTIVE) --- */
window.showForcePasswordChange = function(u) {
    const div = document.createElement('div');
    div.id = "force-pw-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.98);display:flex;justify-content:center;align-items:center;z-index:99999;padding:20px;";
    div.innerHTML = `
        <div style="background:white;padding:30px;border-radius:24px;text-align:center;width:100%;max-width:340px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
            <div style="font-size:40px; margin-bottom:10px;">🔐</div>
            <h3 style="color:#1e293b; margin-bottom:5px;">Set New Password</h3>
            <p style="color:#64748b; font-size:13px; margin-bottom:20px;">Please set your personal password to activate account.</p>
            
            <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:14px;margin-bottom:10px;border:1px solid #e2e8f0;border-radius:12px;font-size:16px;">
            <input type="password" id="p2" placeholder="Confirm New Password" style="width:100%;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0;border-radius:12px;font-size:16px;">
            
            <button onclick="window.processReset('${u}')" style="width:100%;padding:16px;background:#f97316;color:white;border:none;border-radius:12px;font-weight:bold;font-size:16px;cursor:pointer;">Update & Activate</button>
        </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(u) {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;

    if (!p1 || p1 !== p2) {
        alert("❌ Passwords do not match!");
        return;
    }

    try {
        // ส่ง action setpassword ไปที่ Google Script เพื่อเปลี่ยนสถานะเป็น ACTIVE ในฐานข้อมูล
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        
        if (res.success) {
            alert("✅ Account Activated!");
            window.location.replace('main.html');
        } else {
            alert("❌ Failed to update password");
        }
    } catch (e) {
        alert("❌ Update Failed (Network Error)");
    }
};

/* --- 3. LOGOUT & UI --- */
window.logout = () => {
    sessionStorage.clear();
    localStorage.removeItem('qiagen_cart');
    window.location.replace('index.html');
};

window.displayUserInfo = function() {
    const name = sessionStorage.getItem('selectedUser');
    if (!name) return;
    ['user-display', 'user_display', 'display-user', 'current-user'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = (id === 'user_display') ? name : `User: ${name}`;
    });
};

/* --- 4. TEAM STOCK & RENDERING --- */
window.renderTeamTable = function(data) {
    const container = document.getElementById('team-list') || document.getElementById('team-data-container');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser');
    const members = Object.values(USER_MAP);
    let html = '';
    data.forEach((item, idx) => {
        members.forEach(m => {
            const q = Number(item[m] || 0);
            if (m !== currentUser && q > 0) {
                html += `<div class="card" style="background:white; margin:10px; padding:15px; border-radius:15px; border-left:6px solid #f97316; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>${item.Material}</b><br><small>User: ${m}</small></div>
                    <div style="text-align:right;"><b>${q}</b><br>
                    <input type="number" id="t_qty_${idx}_${m}" value="1" style="width:40px; text-align:center;">
                    <button onclick="window.addToCart('transfer','${item.Material}',${idx},'${m}','${currentUser}')" style="background:#f97316; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button></div>
                </div>`;
            }
        });
    });
    container.innerHTML = html || '<p align="center">No Team Stock</p>';
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if (!path.includes('showall') && displayQty <= 0) return '';
        let actionUI = "";
        if (path.includes('showall')) {
            actionUI = `<b style="color:${displayQty > 0 ? "#16a34a" : "#dc2626"};">${displayQty > 0 ? "In stock" : "Out of stock"}</b>`;
        } else {
            const isW = path.includes('withdraw');
            actionUI = `<input type="number" id="qty_${index}" value="1" style="width:40px; text-align:center;">
                        <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:8px; border-radius:5px;">Add</button>`;
        }
        return `<tr><td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${displayQty}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

/* --- 5. CART & OUTLOOK (BETA) --- */
window.addToCart = function(type, mat, idx, from, target) {
    const qID = type === 'transfer' ? `t_qty_${idx}_${from}` : `qty_${idx}`;
    const q = document.getElementById(qID).value;
    const itm = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: itm ? itm['Product Name'] : '', qty: q, from, target });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed;bottom:25px;right:25px;z-index:9999;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9;color:white;padding:15px 25px;border-radius:50px;border:none;font-weight:bold;">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `
        <div style="padding:10px 0; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <div><b>${i.mat}</b> (x${i.qty})<br><small>${i.from} → ${i.target}</small></div>
            <button onclick="window.removeFromCart(${idx})" style="color:red; background:none; border:none; font-weight:bold;">X</button>
        </div>`).join('');
    
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;padding:15px;";
    div.innerHTML = `<div style="background:white;width:100%;max-width:400px;border-radius:20px;padding:20px;">
        <h3>🛒 Selected Items</h3>
        <div style="max-height:300px; overflow-y:auto;">${html || 'Empty'}</div>
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%;padding:15px;background:#0ea5e9;color:white;border:none;border-radius:12px;margin-top:15px;font-weight:bold;">Sync & Open Outlook</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%;margin-top:10px;border:none;background:none;color:gray;">Cancel</button>
    </div>`;
    document.body.appendChild(div);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    btn.innerText = "Processing..."; btn.disabled = true;
    let bodyText = `Hi BO,\n\nPlease transfer stock for: ${user}\n\n`;
    try {
        for (const item of window.cart) {
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
            bodyText += `• ${item.mat} | Qty: ${item.qty} (${item.from} -> ${item.target})\n`;
        }
        window.location.href = `ms-outlook://compose?to=AsiaPacBackOfficeFieldService@qiagen.com&subject=Transfer_${user}&body=${encodeURIComponent(bodyText)}`;
        window.cart = []; localStorage.removeItem('qiagen_cart');
        setTimeout(() => window.location.reload(), 2000);
    } catch (e) { alert("Error"); btn.disabled = false; }
};

window.removeFromCart = (idx) => { window.cart.splice(idx, 1); localStorage.setItem('qiagen_cart', JSON.stringify(window.cart)); document.getElementById('review-modal').remove(); if (window.cart.length > 0) window.showReviewModal(); window.updateCartUI(); };

/* --- 6. INITIALIZE --- */
window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { window.allRows = res.data; window.renderTable(res.data); window.renderTeamTable(res.data); }
};

window.searchStock = function(val) {
    const q = val.toUpperCase();
    const filtered = window.allRows.filter(i => String(i.Material).toUpperCase().includes(q) || String(i['Product Name']).toUpperCase().includes(q));
    window.renderTable(filtered);
};

document.addEventListener('DOMContentLoaded', () => {
    window.displayUserInfo();
    if (!window.location.pathname.includes('index.html')) {
        if (!sessionStorage.getItem('selectedUser')) window.location.replace('index.html');
        else window.loadStockData();
    }
    window.updateCartUI();
});
