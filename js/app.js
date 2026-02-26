/* ========================================================================== 
   QIAGEN INVENTORY - RESTORED FULL (PASSWORD CHANGE & REMOVE BUTTON)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. LOGIN & CONFIRM PASSWORD (กู้คืนหน้ายืนยันรหัส) --- */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input') || document.getElementById('user-select');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const u = uInput.value.trim().toUpperCase();
    const p = pInput.value;

    if (!u) { alert("Please enter User ID"); return; }

    // ถ้าใช้รหัส Service ให้ไปหน้าเปลี่ยนรหัส (Confirm Password)
    if (p === MASTER_PASS) {
        sessionStorage.setItem('selectedUser', USER_MAP[u] || u);
        sessionStorage.setItem('tempID', u); 
        window.location.href = 'change-password.html'; 
    } else if (p === "1234") { // รหัสทดสอบเข้าหน้าหลักเลย
        sessionStorage.setItem('selectedUser', USER_MAP[u] || u);
        window.location.href = 'main.html';
    } else {
        alert("❌ Incorrect Password");
    }
};

window.logout = () => {
    sessionStorage.clear();
    localStorage.removeItem('qiagen_cart');
    window.location.replace('index.html');
};

/* --- 2. CART SYSTEM (กู้คืนปุ่มลบอะไหล่) --- */
window.addToCart = function(type, mat, idx, from, target) {
    const qID = type === 'transfer' ? `t_qty_${idx}_${from}` : `qty_${idx}`;
    const q = document.getElementById(qID).value;
    const itemData = window.allRows.find(i => String(i.Material) === String(mat));
    
    window.cart.push({ 
        type, mat, 
        name: itemData ? itemData['Product Name'] : '', 
        qty: q, from, target 
    });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.removeFromCart = function(index) {
    window.cart.splice(index, 1); // ลบเฉพาะรายการที่เลือก
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
    if (window.cart.length > 0) window.showReviewModal();
    else if (document.getElementById('review-modal')) document.getElementById('review-modal').remove();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:9999;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; font-weight:bold; box-shadow:0 4px 15px rgba(0,0,0,0.3);">Cart (${window.cart.length})</button>` : '';
};

/* --- 3. REVIEW MODAL (โชว์ข้อมูลครบ & ปุ่มลบ X) --- */
window.showReviewModal = function() {
    let html = window.cart.map((i, index) => `
        <div style="padding:12px 0; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1;">
                <b style="color:#003366;">${i.mat}</b><br>
                <small>${i.name}</small><br>
                <small style="color:#f97316;">Qty: ${i.qty} | ${i.from} → ${i.target}</small>
            </div>
            <button onclick="window.removeFromCart(${index})" style="background:#fee2e2; color:#dc2626; border:none; padding:5px 12px; border-radius:8px; font-weight:bold;">X</button>
        </div>`).join('');

    let modal = document.getElementById('review-modal');
    if (!modal) {
        modal = document.createElement('div'); modal.id = "review-modal";
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:white; width:100%; max-width:420px; border-radius:20px; padding:20px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <h3 style="margin-top:0; border-bottom:2px solid #f1f5f9; padding-bottom:10px;">📋 Review Order</h3>
            <div style="max-height:350px; overflow-y:auto;">${html}</div>
            <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:16px; background:#0078d4; color:white; border:none; border-radius:12px; margin-top:15px; font-weight:bold; font-size:16px;">Sync & Open Outlook</button>
            <button onclick="document.getElementById('review-modal').remove()" style="width:100%; padding:10px; background:none; border:none; color:gray; font-weight:bold; margin-top:5px;">CLOSE</button>
        </div>`;
};

/* --- 4. SYNC & FORCE NEW EMAIL (เด้งไป Outlook) --- */
window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    btn.innerText = "Processing..."; btn.disabled = true;
    
    let bodyText = `Hi BO,\n\nPlease transfer stock for: ${user}\n\n`;
    
    try {
        for (const item of window.cart) {
            // 1. ส่งข้อมูลตัดสต็อกไปที่ Google Sheet
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
            
            // 2. เตรียมข้อความอีเมล
            bodyText += `• ${item.mat} | ${item.name}\n  Qty: ${item.qty} (${item.from} -> ${item.target})\n\n`;
        }
        
        // 3. บังคับเปิดแอป Outlook (Deep Link)
        window.location.href = `ms-outlook://compose?to=AsiaPacBackOfficeFieldService@qiagen.com&subject=Transfer_${user}&body=${encodeURIComponent(bodyText)}`;
        
        // ล้างตะกร้า
        window.cart = []; localStorage.removeItem('qiagen_cart');
        setTimeout(() => window.location.reload(), 2000);
    } catch (e) { alert("Sync Error"); btn.disabled = false; }
};

/* --- 5. TEAM STOCK RENDER --- */
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
                html += `
                <div class="card" style="background:white; margin:10px; padding:15px; border-radius:15px; border-left:6px solid #f97316; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <b>${item.Material}</b><br><small>${item['Product Name'] || ''}</small><br>
                        <span style="color:#f97316; font-size:11px; font-weight:bold;">Owner: ${m}</span>
                    </div>
                    <div style="text-align:right;">
                        <b style="font-size:20px; color:#f97316;">${q}</b><br>
                        <input type="number" id="t_qty_${idx}_${m}" value="1" style="width:40px; text-align:center; border-radius:5px; border:1px solid #ddd;">
                        <button onclick="window.addToCart('transfer','${item.Material}',${idx},'${m}','${currentUser}')" style="background:#f97316; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>
                    </div>
                </div>`;
            }
        });
    });
    container.innerHTML = html || '<p align="center">No Team Stock</p>';
};

/* --- 6. RENDER & SEARCH --- */
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

window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { 
        window.allRows = res.data; 
        window.renderTable(res.data); 
        window.renderTeamTable(res.data);
    }
};

window.searchStock = function(val) {
    const q = val.toUpperCase();
    const filtered = window.allRows.filter(i => String(i.Material).toUpperCase().includes(q) || String(i['Product Name']).toUpperCase().includes(q));
    window.renderTable(filtered);
};

document.addEventListener('DOMContentLoaded', () => {
    const name = sessionStorage.getItem('selectedUser');
    ['user-display', 'user_display', 'display-user', 'current-user'].forEach(id => {
        const el = document.getElementById(id); if (el && name) el.innerText = (id === 'user_display') ? name : `User: ${name}`;
    });
    if (!window.location.pathname.includes('index.html')) {
        if (!name) window.location.replace('index.html'); else window.loadStockData();
    }
    window.updateCartUI();
});
