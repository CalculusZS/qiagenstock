/* ========================================================================== 
   QIAGEN INVENTORY - RESTORED FULL OPTION (FIXED LOGIN & TEAM STOCK)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. ระบบ LOGIN (กู้คืน MASTER_PASS เพื่อให้เข้าใช้งานได้ทันที) --- */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input') || document.getElementById('user-select');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const u = uInput.value.trim().toUpperCase();
    const p = pInput.value;

    if (!u) { alert("Please enter User ID"); return; }

    // กลับไปใช้ระบบเช็ค PASS เดิมที่พี่ใช้งานได้
    if (p === MASTER_PASS || p === "1234") { 
        const fullName = USER_MAP[u] || u;
        sessionStorage.setItem('selectedUser', fullName);
        window.location.replace('main.html');
    } else {
        alert("❌ Incorrect Password");
    }
};

/* --- 2. RENDER TABLE (กู้คืนสีสถานะหน้า Show All) --- */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if (!path.includes('showall') && displayQty <= 0) return '';

        let actionUI = "";
        if (path.includes('showall')) {
            const statusText = displayQty > 0 ? "In stock" : "Out of stock";
            const statusColor = displayQty > 0 ? "#16a34a" : "#dc2626";
            actionUI = `<b style="color:${statusColor}; font-size:14px;">${statusText}</b>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:65px; padding:6px; border:1px solid #ddd; border-radius:6px;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; text-align:center;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626; color:white; border:none; padding:8px 12px; border-radius:8px;">Used</button>
            </div>`;
        } else {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; text-align:center;">
                <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>
            </div>`;
        }
        return `<tr style="border-bottom:1px solid #eee;"><td style="padding:15px 10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${displayQty}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

/* --- 3. TEAM STOCK (แก้ปัญหาค้างหน้า Loading) --- */
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
                    <input type="number" id="t_qty_${idx}_${m}" value="1" style="width:40px; text-align:center; margin-right:5px;">
                    <button onclick="window.addToCart('transfer','${item.Material}',${idx},'${m}','${currentUser}')" style="background:#f97316; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button></div>
                </div>`;
            }
        });
    });
    container.innerHTML = html || '<p align="center">No Team Stock</p>';
};

/* --- 4. SEARCH & INITIALIZE --- */
window.searchStock = function(val) {
    const query = val.toUpperCase();
    const filtered = window.allRows.filter(i => String(i.Material).toUpperCase().includes(query) || String(i['Product Name']).toUpperCase().includes(query));
    window.renderTable(filtered);
};

window.loadStockData = async function() {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { 
            window.allRows = res.data; 
            window.renderTable(res.data); 
            window.renderTeamTable(res.data);
        }
    } catch(e) { console.error("Load Error"); }
};

/* --- 5. CART & SYNC (คงออปชันเดิมไว้ครบ) --- */
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
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:9999;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; font-weight:bold;">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `<div style="padding:10px 0; border-bottom:1px solid #eee;"><b>${i.mat} (x${i.qty})</b><br><small>${i.from} → ${i.target}</small></div>`).join('');
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `<div style="background:white; width:90%; max-width:400px; border-radius:20px; padding:20px;">
        <h3>🛒 Review Order</h3>
        <div style="max-height:300px; overflow-y:auto;">${html}</div>
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:15px; background:#0078d4; color:white; border:none; border-radius:12px; margin-top:15px; font-weight:bold;">Sync & Open Outlook</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; border:none; background:none; color:gray;">Cancel</button>
    </div>`;
    document.body.appendChild(div);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    btn.innerText = "Processing..."; btn.disabled = true;
    let body = `Hi BO,\n\nPlease transfer items for: ${user}\n\n`;
    try {
        for (const item of window.cart) {
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
            body += `- ${item.mat} (x${item.qty})\n`;
        }
        window.location.href = `ms-outlook://compose?to=AsiaPacBackOfficeFieldService@qiagen.com&subject=Transfer_${user}&body=${encodeURIComponent(body)}`;
        window.cart = []; localStorage.removeItem('qiagen_cart');
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { alert("Sync Error"); btn.disabled = false; }
};

window.displayUserInfo = function() {
    const name = sessionStorage.getItem('selectedUser');
    if (!name) return;
    ['user-display', 'user_display', 'display-user', 'current-user'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = (id === 'user_display') ? name : `User: ${name}`;
    });
};

document.addEventListener('DOMContentLoaded', () => {
    window.displayUserInfo();
    if (!window.location.pathname.includes('index.html')) {
        if (!sessionStorage.getItem('selectedUser')) window.location.replace('index.html');
        else window.loadStockData();
    }
    window.updateCartUI();
});
