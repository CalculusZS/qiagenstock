/* ========================================================================== 
   QIAGEN INVENTORY - FINAL STABLE (MULTI-WITHDRAW & ALL ADMIN FUNCTIONS)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.withdrawCart = []; 
window.allRows = [];

/* ===== 1. AUTH & LOGIN (With Password Reset) ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('selectedUser', sheetColumnName);
            if (res.status === 'NEW') { window.showForcePasswordChange(userKey); } 
            else { window.location.replace('main.html'); }
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Server Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const isLogin = window.location.pathname.includes('index.html');
    if (!user && !isLogin) { window.location.replace('index.html'); return false; }
    if (user && isLogin) { window.location.replace('main.html'); return true; }
    const ids = ['current-user', 'display-user', 'user_display', 'userName'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerText = user; });
    return true;
};

/* ===== 2. CORE OPERATIONS (WITH CART SYSTEM) ===== */
window.doAction = async function(type, mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser'); 
    if (!confirm(`Confirm ${type} ${qty} unit(s)?`)) return;

    try {
        const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ Added to transfer list");
            if (type === 'withdraw') {
                const prod = window.allRows[idx]['Product Name'] || 'N/A';
                window.withdrawCart.push({ mat, prod, qty });
                window.updateCartUI();
            }
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Request Error"); }
};

/* ===== 3. AUTO-FORMATTED OUTLOOK NOTIFICATION (NO PASTE) ===== */
window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    if (window.withdrawCart.length > 0) {
        btn.innerHTML = `<button onclick="window.sendToOutlook()" style="background:#003366; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); cursor:pointer; font-weight:bold;">📧 Send to Outlook (${window.withdrawCart.length})</button>`;
    } else { btn.innerHTML = ''; }
};

window.sendToOutlook = function() {
    const user = sessionStorage.getItem('selectedUser');
    const today = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
    const mailCc = "gthfss@qiagen.com";
    const subject = `Spare parts transfer ${today} (${user})`;
    
    // จัดรูปแบบข้อความเลียนแบบตาราง เพื่อให้เด้งเข้าเมล์ทันทีโดยไม่ต้อง Paste
    let body = `Hi BO,\n\nPlease transfer the below spare parts:\n\n`;
    body += `Catalog | Product Name | Amt | From | To\n`;
    body += `--------------------------------------------------\n`;
    window.withdrawCart.forEach((item) => {
        body += `${item.mat} | ${item.prod} | ${item.qty} | 0243 | ${user}\n`;
    });
    body += `--------------------------------------------------\n\n`;
    body += `Best Regards,\n${user}`;

    // ดีดเข้า Outlook ทันที
    window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if(confirm("Outlook opened? Clear list?")) {
        window.withdrawCart = [];
        window.updateCartUI();
    }
};

/* ===== 4. SUPERVISOR / ADMIN FUNCTIONS (STAYED) ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value.trim();
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Enter WO#");
    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deduct Success"); window.loadStockData(); }
    } catch (e) { alert("❌ Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:9999;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:300px;">
        <h3>New User</h3><input type="password" id="p1" placeholder="New Pass" style="width:100%;padding:10px;margin:10px 0;">
        <input type="password" id="p2" placeholder="Confirm" style="width:100%;padding:10px;margin:10px 0;">
        <button onclick="window.processReset('${userKey}')" style="width:100%;padding:12px;background:#003366;color:white;border-radius:10px;">Update</button></div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) return alert("❌ No match");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success! Please login."); window.location.reload(); }
};

/* ===== 5. DATA RENDERING ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data, mode); }
    } catch (e) { }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();
    tbody.innerHTML = data.map((item, index) => {
        const q0243 = item['0243'] || 0;
        const qUser = item[user] || 0;
        const disp = (path.includes('withdraw') || path.includes('showall')) ? q0243 : qUser;
        if ((path.includes('return') || path.includes('deduct')) && qUser <= 0) return '';
        let actionUI = "";
        if (path.includes('withdraw')) {
            actionUI = q0243 > 0 ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" style="width:40px;text-align:center;"><button onclick="window.doAction('withdraw','${item.Material}',${index})" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Withdraw</button></div>` : '<b>OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" style="width:40px;text-align:center;"><button onclick="window.doAction('return','${item.Material}',${index})" style="background:#16a34a;color:white;border:none;padding:8px;border-radius:8px;">Return</button></div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:70px;"><input type="number" id="qty_${index}" value="1" style="width:40px;text-align:center;"><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444;color:white;border:none;padding:8px;border-radius:8px;">DEDUCT</button></div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${disp}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
