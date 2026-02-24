/* ========================================================================== 
   QIAGEN INVENTORY - MASTER STABLE (FIX PASSWORD & ALL OPTIONS)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzH2UPTJbENUpj1gx9LQUHWLkCfa1xLocE8Dxy9JG4KswJcBWqRpr_wXjnOjF-BvW_x/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = [];

/* ===== 1. AUTH & LOGIN ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input'), pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userKey = uInput.value.trim().toUpperCase(), passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || "User";
            sessionStorage.setItem('selectedUser', sheetColumnName);
            sessionStorage.setItem('userKey', userKey);
            
            if (res.status === 'NEW') {
                window.showForcePasswordChange(userKey);
            } else {
                window.location.replace('main.html');
            }
        } else alert("❌ Login Failed: Check credentials");
    } catch (e) { alert("❌ Connection Error: Check API URL"); }
};

/* ===== 2. FIX: PASSWORD RESET (จุดที่ทำให้เกิด Error ในรูป) ===== */

// สร้างฟังก์ชันชื่อนี้เพื่อให้ตรงกับที่ HTML เรียกหา
window.handleSetPassword = function() {
    const userKey = sessionStorage.getItem('userKey');
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;

    if (!p1 || p1.length < 4) return alert("❌ Password must be at least 4 digits.");
    if (p1 !== p2) return alert("❌ Passwords do not match.");

    window.processReset(userKey, p1);
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pass-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;padding:20px;box-sizing:border-box;";
    div.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:350px;">
            <h3 style="color:#003366;margin-top:0;">New User Detected</h3>
            <p style="font-size:14px; color:#666; margin-bottom:20px;">Please set a new password (4+ digits).</p>
            <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
            <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
            <button id="reset-btn" onclick="window.handleSetPassword()" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Update & Activate</button>
        </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(u, p) {
    const btn = document.getElementById('reset-btn');
    if(btn) { btn.innerText = "Activating..."; btn.disabled = true; }
    try {
        // ต้องใช้ newPass (P ใหญ่) เพื่อให้ตรงกับ Backend Google Script
        const url = `${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ Success! Account Activated. Please login again.");
            sessionStorage.clear();
            window.location.reload(); 
        } else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Server Error"); }
};

/* ===== 3. STOCK DATA & OPTIONS ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Updating Data...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        const q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0), disp = path.includes('withdraw') ? q0 : qU;
        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        
        let btn = "";
        if (path.includes('withdraw')) {
            btn = q0 > 0 ? `<button onclick="window.addToCart('withdraw','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>` : '<b style="color:red">OUT</b>';
        } else if (path.includes('return')) {
            btn = `<button onclick="window.addToCart('return','${item.Material}',${index})" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>`;
        } else if (path.includes('deduct')) {
            btn = `<div style="display:flex; flex-direction:column; gap:4px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:70px; padding:4px;"><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444; color:white; border:none; padding:6px; border-radius:5px;">Deduct</button></div>`;
        } else {
            btn = `<button onclick="window.addToCart('transfer','${item.Material}',${index})" style="background:#0078d4; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>`;
        }

        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center"><b>${disp}</b></td><td align="right" style="white-space:nowrap;"><input type="number" id="qty_${index}" value="1" style="width:35px; text-align:center;"> ${btn}</td></tr>`;
    }).join('');
};

/* ===== 4. SEARCH & DEDUCT ===== */
window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};

window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value, qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Please enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Deducted Successfully"); window.loadStockData(); }
};

/* ===== 5. CART & SYNC ===== */
window.addToCart = function(type, mat, idx, fromUser = null) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const prod = (idx !== null && window.allRows[idx]) ? window.allRows[idx]['Product Name'] : "Spare Part";
    const currentUser = sessionStorage.getItem('selectedUser');
    let finalFrom = fromUser || (type === 'withdraw' ? '0243' : currentUser);
    let finalTo = (type === 'withdraw' || type === 'transfer') ? currentUser : '0243';

    window.cart.push({ type, mat, prod, qty, from: finalFrom, target: finalTo });
    window.updateCartUI();
    const btn = event.target; btn.innerText = "Added!"; btn.disabled = true;
    setTimeout(() => { btn.innerText = (type==='transfer'?'Transfer':'Add'); btn.disabled = false; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showEmailPreview()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold;">📧 Confirm & Sync (${window.cart.length})</button>` : '';
};

window.showEmailPreview = function() {
    const user = sessionStorage.getItem('selectedUser');
    let table = `Catalog | Name | Qty | From | To\n` + "-".repeat(45) + "\n";
    window.cart.forEach(i => { table += `${i.mat} | ${i.prod} | ${i.qty} | ${i.from} | ${i.target}\n`; });
    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `<div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px;">
        <h3 style="margin:0;">Confirm & Sync</h3>
        <textarea id="edit-body" style="width:100%; height:180px; padding:10px; border:1px solid #ddd; border-radius:8px; font-family:monospace; font-size:12px;">Hi BO,\n\nPlease process:\n\n${table}\n\nBest Regards,\n${user}</textarea>
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button onclick="document.getElementById('email-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none; border-radius:10px;">Cancel</button>
            <button id="sync-btn" onclick="window.confirmSendAndSync()" style="flex:1; padding:12px; background:#0078d4; color:white; border:none; border-radius:10px; font-weight:bold;">Confirm & Sync</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn'); btn.innerText = "Syncing..."; btn.disabled = true;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
        }
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Inventory Update&body=${encodeURIComponent(document.getElementById('edit-body').value)}`;
        document.getElementById('email-modal').remove();
        alert("✅ Sync Complete & Stock Updated!");
        window.cart = []; window.updateCartUI(); window.loadStockData();
    } catch (e) { alert("❌ Sync Failed"); }
};

/* ===== 6. HISTORY & UTILS ===== */
window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.reverse().map(r => `
                <div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                    <b>${new Date(r[0]).toLocaleDateString()}</b> | ${r[1]}<br>
                    Type: <b style="color:#0078d4">${r[4]}</b> | From: <b>${r[6]}</b> | To: <b>${r[7]}</b> | Qty: <b>${r[5]}</b>
                </div>`).join('');
        }
    } catch(e) {}
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    ['current-user', 'display-user', 'user_display', 'userName'].forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).innerText = user;
    });
    return true;
};
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
