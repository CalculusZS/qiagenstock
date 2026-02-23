/* ========================================================================== 
   QIAGEN INVENTORY - FULL STABLE (WITHDRAW / RETURN / TEAM TRANSFER)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

window.cart = []; // ตะกร้าเก็บรายการเพื่อส่งอีเมลทีเดียว
window.allRows = [];

/* ===== 1. AUTH & LOGIN (เดิม) ===== */
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
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
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
            alert("✅ Added to list");
            const prod = window.allRows[idx]['Product Name'] || 'N/A';
            window.cart.push({ type, mat, prod, qty });
            window.updateCartUI();
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Request Error"); }
};

window.doTransfer = function(mat, prod, qty, fromUser) {
    const target = prompt(`Transfer ${qty} units of ${mat} to whom?\n(Kitti, Tatchai, Parinyachat, Phurilap, Penporn, Phuriwat)`);
    if (target && STAFF_LIST.includes(target)) {
        window.cart.push({ type: 'transfer', mat, prod, qty, from: fromUser, target: target });
        alert(`✅ Transfer to ${target} added to list`);
        window.updateCartUI();
    } else if (target) { alert("❌ Invalid Name"); }
};

/* ===== 3. EMAIL TRIGGER (FORCED OUTLOOK) ===== */
window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    if (window.cart.length > 0) {
        btn.innerHTML = `<button onclick="window.sendToOutlook()" style="background:#003366; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); cursor:pointer; font-weight:bold;">📧 Send Outlook (${window.cart.length})</button>`;
    } else { btn.innerHTML = ''; }
};

window.sendToOutlook = function() {
    const user = sessionStorage.getItem('selectedUser');
    const today = "9 Feb 2026";
    const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
    const mailCc = "gthfss@qiagen.com";
    
    const type = window.cart[0].type; 
    let subject = (type === 'withdraw') ? `Spare parts transfer ${today} (${user})` : 
                  (type === 'return') ? `Spare parts return ${today} (${user})` : 
                  `Spare parts team transfer ${today}`;

    let intro = (type === 'return') ? `Hi BO,\n\nPlease return the spare part as below spare parts.` : `Hi BO,\n\nPlease transfer the below spare parts.`;
    
    let body = `${intro}\n\n`;
    body += `Catalog | Product Name | Amt | From | To\n`;
    body += `--------------------------------------------------\n`;
    window.cart.forEach((item) => {
        let from = (item.type === 'withdraw') ? "0243" : (item.type === 'transfer' ? item.from : user);
        let to = (item.type === 'withdraw') ? user : (item.type === 'transfer' ? item.target : "0243");
        body += `${item.mat} | ${item.prod} | ${item.qty} | ${from} | ${to}\n`;
    });
    body += `\nBest Regards,\n${user}`;

    const outlookLink = `ms-outlook://compose?to=${mailTo}&cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = outlookLink;
    setTimeout(() => { if (document.visibilityState === 'visible') window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }, 500);

    if(confirm("Outlook opened? Clear list?")) { window.cart = []; window.updateCartUI(); }
};

/* ===== 4. DATA RENDERING (เดิม + Support Deduct) ===== */
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
        const q0243 = Number(item['0243'] || 0);
        const qUser = Number(item[user] || 0);
        const disp = (path.includes('withdraw')) ? q0243 : qUser;
        if ((path.includes('return') || path.includes('deduct')) && qUser <= 0) return '';
        let actionUI = "";
        if (path.includes('withdraw')) {
            actionUI = q0243 > 0 ? `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" style="width:40px;text-align:center;"><button onclick="window.doAction('withdraw','${item.Material}',${index})" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Withdraw</button></div>` : '<b>OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex;gap:5px;justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" style="width:40px;text-align:center;"><button onclick="window.doAction('return','${item.Material}',${index})" style="background:#16a34a;color:white;border:none;padding:8px;border-radius:8px;">Return</button></div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;"><div style="display:flex;gap:5px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:70px;"><input type="number" id="qty_${index}" value="1" style="width:40px;"></div><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444;color:white;border:none;padding:8px;border-radius:8px;width:120px;">DEDUCT</button></div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${disp}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value.trim();
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Enter WO#");
    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deduct Success"); window.loadStockData(); }
    } catch (e) { }
};

window.loadHistory = async function() { /* คงโค้ดเดิมของพี่ไว้ */ };
window.showForcePasswordChange = function(userKey) { /* คงโค้ดเดิมของพี่ไว้ */ };
window.processReset = async function(userKey) { /* คงโค้ดเดิมของพี่ไว้ */ };
window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('team-stock')) window.loadStockData();
