/* ========================================================================== 
   QIAGEN INVENTORY - FINAL CONSOLIDATED (FIXED REFERENCE ERROR)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbwS6OtxVwCjvHzXTwyAMwvZniemQRAgaA_apA4wmU9XTfH_xD5EpB8v_QpjRzs0bFXA/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = [];

/* ===== 1. AUTH & PASSWORD FIX (แก้ ReferenceError) ===== */

// สร้างฟังก์ชันชื่อที่ HTML ของพี่เรียกหา (handleSetPassword)
window.handleSetPassword = function() {
    window.processReset(); // ให้วิ่งไปทำงานที่ตัวประมวลผลจริง
};

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input'), pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userKey = uInput.value.trim().toUpperCase(), passVal = pInput.value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', sheetColumnName);
            if (res.status === 'NEW') window.showForcePasswordChange(userKey); 
            else window.location.replace('main.html');
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Connection Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pass-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:320px;">
        <h3 style="color:#003366;">Set New Password</h3>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <button id="save-btn" onclick="window.handleSetPassword()" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;">Update & Login</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function() {
    const u = sessionStorage.getItem('userKey');
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2 || p1.length < 4) return alert("❌ Password mismatch or too short");
    const btn = document.getElementById('save-btn');
    btn.innerText = "Processing..."; btn.disabled = true;
    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Activated!"); sessionStorage.clear(); window.location.reload(); }
        else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Error"); }
};

/* ===== 2. STOCK DATA & OPTIONS (ถอน/คืน/ตัด/โอน) ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Updating...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    tbody.innerHTML = data.map((item, index) => {
        const q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0), disp = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
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
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center"><b>${disp}</b></td><td align="right"><input type="number" id="qty_${index}" value="1" style="width:35px; text-align:center;"> ${btn}</td></tr>`;
    }).join('');
};

/* ===== 3. CART SYSTEM (ออปชั่นตะกร้า) ===== */
window.addToCart = function(type, mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const prod = window.allRows[idx]['Product Name'] || "Spare Part";
    const user = sessionStorage.getItem('selectedUser');
    let fFrom = (type === 'withdraw' ? '0243' : user), fTo = (type === 'withdraw' || type === 'transfer') ? user : '0243';
    window.cart.push({ type, mat, prod, qty, from: fFrom, target: fTo });
    window.updateCartUI();
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
    let table = `Catalog | Qty | From | To\n` + "-".repeat(30) + "\n";
    window.cart.forEach(i => { table += `${i.mat} | ${i.qty} | ${i.from} | ${i.target}\n`; });
    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `<div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px;">
        <h3>Confirm Transaction</h3>
        <textarea id="edit-body" style="width:100%; height:180px; padding:10px;">Hi BO,\nPlease process:\n\n${table}\n\nBest Regards,\n${user}</textarea>
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button onclick="document.getElementById('email-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none;">Cancel</button>
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
        alert("✅ Sync Success!"); window.cart = []; window.updateCartUI(); window.loadStockData();
    } catch (e) { alert("❌ Sync Failed"); }
};

/* ===== 4. HISTORY / SEARCH / DEDUCT / UTILS ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value, qty = document.getElementById('qty_' + idx).value, user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Deducted"); window.loadStockData(); }
};

window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.reverse().map(r => `
                <div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                    <b>${new Date(r[0]).toLocaleDateString()}</b> | ${r[1]}<br>
                    Type: <b style="color:#0078d4">${r[4]}</b> | From: ${r[6]} | To: ${r[7]} | Qty: ${r[5]}
                </div>`).join('');
        }
    } catch(e) {}
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    ['current-user', 'display-user', 'user_display', 'userName'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = user; });
    return true;
};
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) {
    window.loadStockData();
    if (window.location.pathname.includes('history')) window.loadHistory();
}
