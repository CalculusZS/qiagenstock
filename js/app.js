/* ========================================================================== 
   QIAGEN INVENTORY - SUPER FULL VERSION (LOCKED & LOADED)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. LOGIN & AUTH (รวมหน้าเปลี่ยนรหัส) --- */
window.handleLogin = async function() {
    const u = document.getElementById('username-input').value.trim().toUpperCase();
    const p = document.getElementById('password-input').value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        if (res && res.success) {
            const fullName = USER_MAP[u] || res.fullName;
            sessionStorage.setItem('selectedUser', fullName);
            sessionStorage.setItem('userKey', u);
            if (res.status === 'NEW') { 
                window.showForcePasswordChange(u); 
            } else { 
                window.location.replace('main.html'); 
            }
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Connection Error"); }
};

window.showForcePasswordChange = function(u) {
    const div = document.createElement('div');
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:99999;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:320px;">
        <h3 style="color:#f97316;">Set New Password</h3>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
        <button onclick="window.processReset('${u}')" style="width:100%;padding:15px;background:#f97316;color:white;border:none;border-radius:10px;font-weight:bold;margin-top:10px;">Update & Login</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(u) {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if(!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r=>r.json());
    if(res.success) { alert("✅ Success!"); window.location.replace('main.html'); }
};

/* --- 2. DISPLAY & UI (Logged in as & Stock Status) --- */
window.displayUserInfo = function() {
    const el = document.getElementById('user-display');
    const name = sessionStorage.getItem('selectedUser');
    if (el && name) el.innerHTML = `<i class="fas fa-user-circle"></i> Logged in as: <b>${name}</b>`;
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if (!path.includes('showall') && displayQty <= 0) return '';

        // [ข้อ 5] แสดงสถานะ In Stock / Out of Stock
        let statusBadge = "";
        if (path.includes('showall')) {
            statusBadge = displayQty > 0 
                ? `<div style="color:#16a34a; font-size:11px; font-weight:bold; margin-top:4px;">● In Stock</div>` 
                : `<div style="color:#dc2626; font-size:11px; font-weight:bold; margin-top:4px;">○ Out of Stock</div>`;
        }

        let actionUI = "";
        if (path.includes('deduct')) {
            actionUI = `<div style="display:flex;gap:4px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:60px;padding:4px;border-radius:4px;border:1px solid #ccc;"><input type="number" id="qty_${index}" value="1" style="width:35px;padding:4px;"><button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626;color:white;border:none;padding:5px 8px;border-radius:4px;font-size:12px;">Used</button></div>`;
        } else if (!path.includes('showall')) {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex;gap:4px;"><input type="number" id="qty_${index}" value="1" style="width:35px;padding:4px;"><button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'};color:white;border:none;padding:5px 10px;border-radius:4px;font-size:12px;">Add</button></div>`;
        }

        return `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 8px;">
                <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                <div style="font-size:12px; color:#64748b;">${item['Product Name'] || ''}</div>
                ${statusBadge}
            </td>
            <td align="center" style="font-size:16px; font-weight:bold;">${displayQty}</td>
            <td align="right" style="padding-right:8px;">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* --- 3. CORE LOGIC (Cart, Deduct, Search, Outlook) --- */
window.filterData = function() {
    const input = document.getElementById('search-input') || document.getElementById('search');
    if (!input) return;
    const val = input.value.toUpperCase();
    const filtered = window.allRows.filter(i => 
        String(i.Material).toUpperCase().includes(val) || 
        String(i['Product Name']).toUpperCase().includes(val)
    );
    window.renderTable(filtered);
};

window.addToCart = function(type, mat, idx, from, target) {
    const qInput = document.getElementById('qty_' + idx);
    const item = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: item['Product Name'], qty: qInput.value, from, target });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed;bottom:25px;right:25px;z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9;color:white;padding:15px 25px;border-radius:50px;border:none;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.2);">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `<div style="font-size:12px;border-bottom:1px solid #eee;padding:8px;display:flex;justify-content:space-between;align-items:center;"><span><b>${i.mat}</b> (x${i.qty})<br><small>${i.from} → ${i.target}</small></span><button onclick="window.removeFromCart(${idx})" style="color:red;border:none;background:none;font-size:16px;">✕</button></div>`).join('');
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;";
    div.innerHTML = `<div style="background:white;width:85%;max-width:400px;border-radius:20px;padding:20px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
        <h3 style="margin-top:0;">Confirm Sync</h3>
        <div style="max-height:250px;overflow-y:auto;">${html}</div>
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%;padding:15px;background:#0ea5e9;color:white;border:none;border-radius:12px;font-weight:bold;margin-top:15px;">Sync & Open Outlook</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%;margin-top:10px;color:gray;border:none;background:none;">Cancel</button>
    </div>`;
    document.body.appendChild(div);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    btn.innerText = "Syncing..."; btn.disabled = true;
    let emailBody = `Hi BO,\n\nPlease transfer parts for: ${user}\n\n`;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url).then(r => r.json());
            emailBody += `- ${item.mat} | Qty: ${item.qty} (${item.from} -> ${item.target})\n`;
        }
        window.cart = []; localStorage.removeItem('qiagen_cart');
        window.location.replace(`mailto:AsiaPacBackOfficeFieldService@qiagen.com?subject=Spare parts transfer ${user}&body=${encodeURIComponent(emailBody)}`);
        alert("✅ Sync Success!");
        setTimeout(() => window.location.reload(), 1000);
    } catch (e) { alert("❌ Error: " + e.message); btn.disabled = false; }
};

window.removeFromCart = (idx) => {
    window.cart.splice(idx, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    document.getElementById('review-modal').remove();
    if (window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
};

window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deducted"); window.loadStockData(); }
    } catch(e) { alert("❌ Error"); }
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { 
        window.allRows = res.data; 
        window.renderTable(res.data); 
        if(window.renderTeamTable) window.renderTeamTable(res.data); 
    }
};

/* --- INITIALIZE --- */
document.addEventListener('DOMContentLoaded', () => {
    window.displayUserInfo();
    if (!window.location.pathname.includes('index.html')) {
        if (!sessionStorage.getItem('selectedUser')) {
            window.location.replace('index.html');
        } else {
            window.loadStockData();
        }
    }
    window.updateCartUI();
});;
