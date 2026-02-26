/* ========================================================================== 
   QIAGEN INVENTORY - ULTIMATE MASTER VERSION (ALL FEATURES + AUTO ID FIX)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. แสดงชื่อผู้ใช้งาน (แก้ไขปัญหาชื่อไม่ขึ้นในทุกหน้า) --- */
window.displayUserInfo = function() {
    const fullName = sessionStorage.getItem('selectedUser');
    if (!fullName) return;

    // ระบบจะวิ่งหาทุก ID ที่พี่ใช้ในไฟล์ HTML ต่างๆ (user_display, display-user, current-user, user-display)
    const possibleIDs = ['user-display', 'user_display', 'display-user', 'current-user'];
    
    possibleIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'user_display') {
                el.innerText = fullName; // สำหรับหน้า Main
            } else {
                el.innerHTML = `Logged in as: <b>${fullName}</b>`; // สำหรับหน้าเบิก/คืน/Deduct
            }
        }
    });
};

/* --- 2. LOGIN & FORCE CHANGE PASSWORD (ห้ามหาย) --- */
window.handleLogin = async function() {
    const u = document.getElementById('username-input').value.trim().toUpperCase();
    const p = document.getElementById('password-input').value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
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
    div.id="force-pw-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;justify-content:center;align-items:center;z-index:99999;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:320px;">
        <h3 style="color:#f97316;margin-top:0;">Set New Password</h3>
        <p style="font-size:12px;color:#666;">Please confirm your new password.</p>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
        <button onclick="window.processReset('${u}')" style="width:100%;padding:15px;background:#f97316;color:white;border:none;border-radius:10px;font-weight:bold;margin-top:10px;">Update & Login</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(u) {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if(!p1 || p1 !== p2) return alert("❌ Passwords do not match!");
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r=>r.json());
        if(res.success) { alert("✅ Password Updated!"); window.location.replace('main.html'); }
    } catch(e) { alert("❌ Update Failed"); }
};

/* --- 3. RENDER TABLE (ปุ่ม Action ชิดขวา + Status Badge) --- */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if (!path.includes('showall') && displayQty <= 0) return '';

        let statusBadge = path.includes('showall') ? (displayQty > 0 
            ? `<div style="color:#16a34a; font-size:11px; font-weight:bold;">● In Stock</div>` 
            : `<div style="color:#dc2626; font-size:11px; font-weight:bold;">○ Out of Stock</div>`) : "";

        let actionUI = "";
        if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end; align-items:center;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:65px; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:bold;">Used</button>
            </div>`;
        } else if (!path.includes('showall')) {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end; align-items:center;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px;">
                <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:bold;">Add</button>
            </div>`;
        }

        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:15px 10px; width:55%;">
                <div style="font-weight:bold; color:#1e293b; font-size:14px;">${item.Material}</div>
                <div style="font-size:12px; color:#64748b; line-height:1.3;">${item['Product Name'] || ''}</div>
                ${statusBadge}
            </td>
            <td align="center" style="font-size:18px; font-weight:bold; color:#0f172a; width:15%;">${displayQty}</td>
            <td align="right" style="padding-right:10px; width:30%;">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* --- 4. CART & OUTLOOK (เปิด Outlook มือถือ) --- */
window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    btn.innerText = "Syncing..."; btn.disabled = true;
    let emailBody = `Hi BO,\n\nPlease transfer parts for: ${user}\n\n`;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url).then(r => r.json());
            emailBody += `- ${item.mat} | ${item.name} | Qty: ${item.qty} (${item.from} -> ${item.target})\n`;
        }
        window.cart = []; localStorage.removeItem('qiagen_cart');
        
        // ดีดไปเปิด Outlook มือถือ
        window.location.replace(`mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer ${user} ${dateStr}&body=${encodeURIComponent(emailBody)}`);
        
        alert("✅ Sync Success!");
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { alert("❌ Error: " + e.message); btn.disabled = false; }
};

/* --- 5. ฟังก์ชันสนับสนุนอื่นๆ (SEARCH, DATA LOAD, LOGOUT) --- */
window.filterData = function() {
    const input = document.getElementById('search-input') || document.getElementById('search');
    const val = input.value.toUpperCase();
    const filtered = window.allRows.filter(i => String(i.Material).toUpperCase().includes(val) || String(i['Product Name']).toUpperCase().includes(val));
    window.renderTable(filtered);
};

window.addToCart = function(type, mat, idx, from, target) {
    const q = document.getElementById('qty_' + idx).value;
    const itm = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: itm['Product Name'], qty: q, from, target });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed;bottom:25px;right:25px;z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9;color:white;padding:15px 25px;border-radius:50px;border:none;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `<div style="font-size:12px;border-bottom:1px solid #eee;padding:10px;display:flex;justify-content:space-between;align-items:center;">
        <span><b>${i.mat}</b> (x${i.qty})</span><button onclick="window.removeFromCart(${idx})" style="color:red;border:none;background:none;">✕</button>
    </div>`).join('');
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;padding:20px;";
    div.innerHTML = `<div style="background:white;width:100%;max-width:400px;border-radius:20px;padding:20px;"><h3>Confirm Sync</h3><div style="max-height:250px;overflow-y:auto;">${html}</div><button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%;padding:15px;background:#0ea5e9;color:white;border:none;border-radius:12px;font-weight:bold;margin-top:15px;">Sync & Outlook</button></div>`;
    document.body.appendChild(div);
};

window.removeFromCart = (idx) => { window.cart.splice(idx, 1); localStorage.setItem('qiagen_cart', JSON.stringify(window.cart)); document.getElementById('review-modal').remove(); if (window.cart.length > 0) window.showReviewModal(); window.updateCartUI(); };

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

window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { window.allRows = res.data; window.renderTable(res.data); if(window.renderTeamTable) window.renderTeamTable(res.data); }
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

document.addEventListener('DOMContentLoaded', () => {
    window.displayUserInfo();
    if (!window.location.pathname.includes('index.html')) {
        if (!sessionStorage.getItem('selectedUser')) window.location.replace('index.html');
        else window.loadStockData();
    }
    window.updateCartUI();
});
