/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (V.FINAL - CACHE BUSTED & LOGIC LOCKED)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzX5Yuy6X5S6tVNfr128CTHKVtM3IvyJDehj1DkMoDPmP02DCLuzmBaeE3Tcx9WBHaU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

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
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:320px;"><h3>Set New Password</h3><input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;"><input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;"><button onclick="window.processReset('${userKey}')" style="width:100%;padding:14px;background:#f97316;color:white;border:none;border-radius:8px;font-weight:bold;">Update & Login</button></div>`;
    document.body.appendChild(div);
};
window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (p1 !== p2) return alert("❌ Passwords do not match");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) window.location.reload();
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        let actionUI = "";

        if (path.includes('showall')) {
            let color = displayQty <= 0 ? 'red' : 'black';
            return `<tr style="border-bottom:1px solid #eee;"><td style="padding:15px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center" style="font-size:18px; font-weight:bold; color:${color};">${displayQty}</td><td align="right"><span style="color:${displayQty<=0?'red':'#94a3b8'}; font-weight:bold;">Availability</span></td></tr>`;
        }

        if (path.includes('deduct')) {
            // ข้อ 4: DEDUCT ให้ใส่ Work Order ได้
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:90px; padding:8px; border:1px solid #ddd; border-radius:5px;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center; border:1px solid #ddd;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626; color:white; border:none; padding:8px; border-radius:5px;">Deduct</button>
            </div>`;
        } else {
            const isW = path.includes('withdraw');
            // ข้อ 2 (Return): From=เรา, Target=0243 | ข้อ 3 (Withdraw): From=0243, Target=เรา
            const from = isW ? '0243' : user;
            const target = isW ? user : '0243';
            
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:45px; text-align:center; border:1px solid #ddd; border-radius:5px;">
                <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${from}','${target}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:8px 12px; border-radius:5px;">Add</button>
            </div>`;
        }

        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        if (displayQty <= 0 && !path.includes('showall')) return '';

        return `<tr style="border-bottom:1px solid #eee;"><td style="padding:15px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center" style="font-size:18px; font-weight:bold;">${displayQty}</td><td align="right" style="padding-right:10px;">${actionUI}</td></tr>`;
    }).join('');
};

// ข้อ 5: ค้นหาในหน้า Withdraw/Return/Deduct
window.filterData = function() {
    const searchEl = document.getElementById('search') || document.getElementById('search-input');
    if(!searchEl) return;
    const val = searchEl.value.toUpperCase();
    const filtered = window.allRows.filter(i => (i.Material||'').toString().toUpperCase().includes(val) || (i['Product Name']||'').toString().toUpperCase().includes(val));
    window.renderTable(filtered);
};

window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ Please enter Work Order#");
    
    // ข้อ 4: ส่ง user และ wo ไปให้ Backend
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deduct Success!"); window.loadStockData(); }
        else { alert("❌ Failed: " + res.msg); }
    } catch(e) { alert("❌ Error"); }
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn'); btn.innerText = "Syncing..."; btn.disabled = true;
    const user = sessionStorage.getItem('selectedUser');
    let emailBody = `Hi BO,\n\nPlease transfer the below spare parts.\n\n`;
    try {
        for (const item of window.cart) {
            // ข้อ 1, 2, 3: ส่ง from และ target ไปให้ตรงกับที่ GAS ต้องการ (from คือต้นทาง, user คือปลายทาง)
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url).then(r => r.json());
            emailBody += `- ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.target}\n`;
        }
        window.location.replace(`mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer&body=${encodeURIComponent(emailBody)}`);
        window.cart = []; localStorage.removeItem('qiagen_cart');
        alert("✅ Sync Success!"); window.location.reload();
    } catch (e) { alert("❌ Sync Failed"); btn.disabled = false; }
};

window.addToCart = function(type, mat, idx, fromUser, targetUser) {
    let qInput = document.getElementById('qty_' + idx) || document.getElementById(`t_qty_${idx}_${fromUser}`);
    const item = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: item['Product Name'], qty: qInput.value, from: fromUser, target: targetUser });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};
window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9; color:white; padding:15px 25px; border-radius:50px; border:none; font-weight:bold;">Cart (${window.cart.length})</button>` : '';
};
window.showReviewModal = function() {
    let html = `<div style="max-height:250px; overflow-y:auto; margin:15px 0;">`;
    window.cart.forEach((i, idx) => { html += `<div style="font-size:12px; border-bottom:1px solid #ddd; padding:8px;"><b>${i.mat}</b> (Qty: ${i.qty})<br><small>${i.from} -> ${i.target}</small><button onclick="window.removeFromCart(${idx})" style="float:right; color:red; border:none; background:none;">✕</button></div>`; });
    html += `</div>`;
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `<div style="background:white; width:90%; max-width:400px; border-radius:20px; padding:20px;"><h3>Review</h3>${html}<button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:15px; background:#0ea5e9; color:white; border:none; border-radius:12px; font-weight:bold;">Sync & Outlook</button><button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; border:none; background:none; color:gray;">Cancel</button></div>`;
    document.body.appendChild(div);
};
window.removeFromCart = (idx) => { window.cart.splice(idx, 1); localStorage.setItem('qiagen_cart', JSON.stringify(window.cart)); document.getElementById('review-modal').remove(); if (window.cart.length > 0) window.showReviewModal(); window.updateCartUI(); };
window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { window.allRows = res.data; window.renderTable(res.data); if(window.renderTeamTable) window.renderTeamTable(res.data); }
};
window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };
window.checkAuth = () => { if (!sessionStorage.getItem('selectedUser') && !window.location.pathname.includes('index.html')) window.location.replace('index.html'); window.updateCartUI(); };
window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
