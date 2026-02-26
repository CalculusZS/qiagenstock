/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (FINAL FIX FOR BACKEND V9)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* 1. AUTH & LOGIN (ดึงหน้าเปลี่ยน Password กลับมา) */
window.handleLogin = async function() {
    const u = document.getElementById('username-input').value.trim().toUpperCase();
    const p = document.getElementById('password-input').value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
            // ตรวจสอบถ้าสถานะเป็น NEW ให้เด้งหน้าเปลี่ยนรหัส
            if (res.status === 'NEW') { 
                window.showForcePasswordChange(u); 
            } else { 
                window.location.replace('main.html'); 
            }
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Connection Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pw-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:20000;padding:20px;";
    div.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:320px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <h2 style="color:#f97316;margin-bottom:10px;">Set New Password</h2>
            <p style="font-size:13px;color:#666;margin-bottom:20px;">Please set your password for the first time.</p>
            <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            <button onclick="window.processReset('${userKey}')" style="width:100%;padding:14px;background:#f97316;color:white;border:none;border-radius:8px;font-weight:bold;margin-top:10px;cursor:pointer;">Update & Login</button>
        </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match or empty");
    
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            alert("✅ Password updated! Logging in...");
            window.location.replace('main.html');
        } else {
            alert("❌ Update failed: " + (res.msg || "Error"));
        }
    } catch(e) { alert("❌ Connection error"); }
};

/* 2. SEARCH SYSTEM (แก้ไขการค้นหาให้ทำงานทุกหน้า) */
window.filterData = function() {
    const input = document.getElementById('search-input') || document.getElementById('search');
    if (!input) return;
    const val = input.value.toUpperCase();
    const filtered = window.allRows.filter(i => 
        (i.Material && i.Material.toString().toUpperCase().includes(val)) || 
        (i['Product Name'] && i['Product Name'].toString().toUpperCase().includes(val))
    );
    window.renderTable(filtered);
};

/* 3. SYNC & OUTLOOK (บังคับเปิด Outlook) */
window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    
    btn.innerText = "Processing...";
    btn.disabled = true;

    let emailBody = `Hi BO,\n\nPlease transfer parts for: ${user}\n\n`;
    
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url).then(r => r.json());
            emailBody += `- ${item.mat} | ${item.name} | Qty: ${item.qty} (${item.from} -> ${item.target})\n`;
        }

        window.cart = []; localStorage.removeItem('qiagen_cart');
        
        // บังคับเปิด Outlook
        const to = "AsiaPacBackOfficeFieldService@qiagen.com";
        const cc = "gthfss@qiagen.com";
        const subject = encodeURIComponent(`Spare parts transfer ${user} ${dateStr}`);
        const body = encodeURIComponent(emailBody);
        
        window.location.replace(`mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`);
        
        alert("✅ Sync Success! Outlook will open.");
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { 
        alert("❌ Error: " + e.message); 
        btn.disabled = false; 
    }
};

/* 4. RENDER TABLE & DEDUCT */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;

        if (!path.includes('showall') && displayQty <= 0) return '';

        let actionUI = "";
        if (path.includes('deduct')) {
            actionUI = `<div style="display:flex;gap:4px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:60px;"><input type="number" id="qty_${index}" value="1" style="width:35px;"><button onclick="window.doDeduct('${item.Material}', ${index})" style="background:red;color:white;border:none;padding:5px;border-radius:4px;">Used</button></div>`;
        } else if (!path.includes('showall')) {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex;gap:4px;"><input type="number" id="qty_${index}" value="1" style="width:35px;"><button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:green;color:white;border:none;padding:5px;border-radius:4px;">Add</button></div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center">${displayQty}</td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("Enter WO#");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deducted"); window.loadStockData(); }
    } catch(e) { alert("❌ Error"); }
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
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed;bottom:20px;right:20px;z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9;color:white;padding:12px 20px;border-radius:50px;border:none;font-weight:bold;box-shadow:0 4px 10px rgba(0,0,0,0.3);">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `<div style="font-size:11px;border-bottom:1px solid #eee;padding:5px;display:flex;justify-content:space-between;"><span>${i.mat} (x${i.qty})</span><button onclick="window.removeFromCart(${idx})" style="color:red;border:none;background:none;">✕</button></div>`).join('');
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;";
    div.innerHTML = `<div style="background:white;width:80%;border-radius:15px;padding:20px;"><h3>Review</h3>${html}<button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%;padding:12px;background:#0ea5e9;color:white;border-radius:8px;border:none;margin-top:10px;">Sync & Outlook</button><button onclick="this.parentElement.parentElement.remove()" style="width:100%;margin-top:10px;color:gray;border:none;background:none;">Close</button></div>`;
    document.body.appendChild(div);
};

window.removeFromCart = (idx) => { window.cart.splice(idx, 1); localStorage.setItem('qiagen_cart', JSON.stringify(window.cart)); document.getElementById('review-modal').remove(); if (window.cart.length > 0) window.showReviewModal(); window.updateCartUI(); };

window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { window.allRows = res.data; window.renderTable(res.data); if(window.renderTeamTable) window.renderTeamTable(res.data); }
};

if (!window.location.pathname.includes('index.html')) {
    if (!sessionStorage.getItem('selectedUser')) window.location.replace('index.html');
    window.loadStockData();
}
window.updateCartUI();
