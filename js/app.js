/* ========================================================================== 
   QIAGEN INVENTORY - ENGLISH VERSION (CORS FIX & AUTO-SYNC)
   ========================================================================== */

// Use your latest verified URL
const API = "https://script.google.com/macros/s/AKfycbzlkvbbY_5jyz6_K6UYj7lX_sDbFLDWnZ-Ox_jTfft8g969gyFUcPvVctS9QPKWyk-I/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = [];

/* ===== 1. AUTH & LOGIN ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input'), pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    const btn = document.querySelector('button[onclick="window.handleLogin()"]') || event.target;
    const originalText = btn.innerText;
    btn.innerText = "Connecting..."; btn.disabled = true;

    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`)
            .then(r => r.json());

        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || "User";
            sessionStorage.setItem('selectedUser', sheetColumnName);
            sessionStorage.setItem('userKey', userKey);

            if (res.status === 'NEW') {
                window.showForcePasswordChange(userKey);
            } else {
                window.location.replace('main.html');
            }
        } else {
            alert("❌ Login Failed: " + (res.msg || "Invalid Credentials"));
        }
    } catch (e) { 
        alert("❌ Connection Error! Please ensure Deployment is set to 'Anyone'."); 
    } finally {
        btn.innerText = originalText; btn.disabled = false;
    }
};

/* ===== 2. FORCE PASSWORD CHANGE (English UI) ===== */
window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pass-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;padding:20px;box-sizing:border-box;";
    div.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:350px;">
            <h3 style="color:#003366;margin-top:0;">New User Detected</h3>
            <p style="font-size:14px; color:#666; margin-bottom:20px;">Please set a new password for your first login (4+ digits).</p>
            <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
            <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
            <button id="reset-btn" onclick="window.processReset('${userKey}')" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;width:100%;">Update & Login</button>
        </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (!p1 || p1.length < 4) return alert("❌ Password must be at least 4 characters.");
    if (p1 !== p2) return alert("❌ Passwords do not match.");

    const btn = document.getElementById('reset-btn');
    btn.innerText = "Saving..."; btn.disabled = true;

    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ Success! Please login with your new password.");
            window.location.reload();
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Server Error during reset"); }
    finally { btn.innerText = "Update & Login"; btn.disabled = false; }
};

/* ===== 3. CORE CART & SYNC ===== */
window.addToCart = function(type, mat, idx, fromUser = null) {
    const qtyInput = document.getElementById('qty_' + idx) || document.getElementById('t_qty_' + idx + '_' + fromUser);
    const qty = qtyInput ? qtyInput.value : 1;
    const prod = (idx !== null && window.allRows[idx]) ? window.allRows[idx]['Product Name'] : "Spare Part";
    const currentUser = sessionStorage.getItem('selectedUser');

    let finalFrom = fromUser || (type === 'withdraw' ? '0243' : currentUser);
    let finalTo = (type === 'withdraw' || type === 'transfer') ? currentUser : '0243';

    window.cart.push({ type, mat, prod, qty, from: finalFrom, target: finalTo });
    window.updateCartUI();
    
    const btn = event.target;
    btn.innerText = "Added!"; btn.disabled = true;
    setTimeout(() => { btn.innerText = (type==='transfer'?'Transfer':'Add'); btn.disabled = false; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? 
        `<button onclick="window.showEmailPreview()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold;">📧 Confirm & Sync (${window.cart.length})</button>` : '';
};

window.showEmailPreview = function() {
    const user = sessionStorage.getItem('selectedUser'), today = new Date().toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
    let sub = `Spare parts transfer ${user} ${today}`;
    let intro = `Hi BO,\n\nPlease process the following spare parts:`;
    let table = `Catalog | Name | Qty | From | To\n` + "-".repeat(45) + "\n";
    window.cart.forEach(i => { table += `${i.mat} | ${i.prod} | ${i.qty} | ${i.from} | ${i.target}\n`; });

    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `
    <div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px;">
        <h3 style="margin:0 0 10px 0;">Preview & Auto-Sync</h3>
        <p style="font-size:11px; color:red;">*Sheet inventory will be updated immediately after clicking Confirm.</p>
        <input id="edit-sub" value="${sub}" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">
        <textarea id="edit-body" style="width:100%; height:180px; padding:10px; border:1px solid #ddd; border-radius:8px; font-family:monospace; font-size:12px;">${intro}\n\n${table}\n\nBest Regards,\n${user}</textarea>
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button onclick="document.getElementById('email-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none; border-radius:10px;">Cancel</button>
            <button id="sync-btn" onclick="window.confirmSendAndSync()" style="flex:1; padding:12px; background:#0078d4; color:white; border:none; border-radius:10px; font-weight:bold;">Confirm & Sync</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
        }

        const sub = document.getElementById('edit-sub').value, body = document.getElementById('edit-body').value;
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
        
        document.getElementById('email-modal').remove();
        alert("✅ Inventory Updated & Email Triggered");
        window.cart = []; window.updateCartUI(); window.loadStockData();
    } catch (e) { alert("❌ Sync Failed"); }
};

/* ===== 4. UI RENDER ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    ['current-user', 'display-user', 'user_display', 'userName'].forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).innerText = user;
    });
    return true;
};

window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Data...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    tbody.innerHTML = data.map((item, index) => {
        const q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0), disp = path.includes('withdraw') ? q0 : qU;
        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        let btn = path.includes('withdraw') ? (q0 > 0 ? `<button onclick="window.addToCart('withdraw','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>` : '<b style="color:red">OUT</b>') :
                  path.includes('return') ? `<button onclick="window.addToCart('return','${item.Material}',${index})" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>` :
                  `<div style="display:flex; flex-direction:column; gap:4px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:70px; padding:4px;"><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444; color:white; border:none; padding:6px; border-radius:5px;">Deduct</button></div>`;
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center"><b>${disp}</b></td><td align="right" style="white-space:nowrap;"><input type="number" id="qty_${index}" value="1" style="width:35px; text-align:center;"> ${btn}</td></tr>`;
    }).join('');
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('team-stock')) window.loadStockData();
