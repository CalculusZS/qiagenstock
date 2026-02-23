/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (WITHDRAW / RETURN / TEAM TRANSFER)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

window.cart = []; // ตะกร้าสะสมรายการ (ใช้ร่วมกันทั้ง Withdraw/Return/Transfer)
window.allRows = [];

/* ===== 1. AUTH & LOGIN ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[userKey] || res.fullName);
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    return true;
};

/* ===== 2. CORE OPERATIONS ===== */
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
            // เก็บเข้าตะกร้าโดยระบุประเภท (Withdraw/Return/Transfer)
            window.cart.push({ type, mat, prod, qty });
            window.updateCartUI();
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Request Error"); }
};

/* ===== 3. TEAM STOCK TRANSFER (FOR SUPERVISOR) ===== */
window.doTransfer = function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const prod = window.allRows[idx]['Product Name'] || 'N/A';
    
    // สร้างตัวเลือกรายชื่อ Staff
    let options = STAFF_LIST.map(name => `<option value="${name}">${name}</option>`).join('');
    
    const target = prompt(`Transfer ${qty} units of ${mat} to whom?\nOptions: ${STAFF_LIST.join(', ')}`);
    
    if (target && STAFF_LIST.includes(target)) {
        window.cart.push({ type: 'transfer', mat, prod, qty, target });
        alert(`✅ Added transfer to ${target} to list`);
        window.updateCartUI();
    } else if (target) {
        alert("❌ Invalid Name");
    }
};

/* ===== 4. EMAIL SENDER (AUTO FORMAT) ===== */
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
    
    // แยกประเภทรายการในตะกร้า
    const type = window.cart[0].type; 
    let subject = "";
    let intro = "";

    if (type === 'withdraw') {
        subject = `Spare parts transfer ${today} (${user})`;
        intro = `Hi BO,\n\nPlease transfer the below spare parts.`;
    } else if (type === 'return') {
        subject = `Spare parts return ${today} (${user})`;
        intro = `Hi BO,\n\nPlease return the spare part as below spare parts.`;
    } else {
        subject = `Spare parts team transfer ${today}`;
        intro = `Hi BO,\n\nPlease transfer spare parts between team members:`;
    }
    
    let body = `${intro}\n\n`;
    body += `Catalog | Product Name | Amt | From | To\n`;
    body += `--------------------------------------------------\n`;
    window.cart.forEach((item) => {
        let from = (item.type === 'withdraw') ? "0243" : user;
        let to = (item.type === 'withdraw') ? user : (item.type === 'transfer' ? item.target : "0243");
        body += `${item.mat} | ${item.prod} | ${item.qty} | ${from} | ${to}\n`;
    });
    body += `--------------------------------------------------\n\n`;
    body += `Best Regards,\n${user}`;

    window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if(confirm("Outlook opened? Clear list?")) {
        window.cart = [];
        window.updateCartUI();
    }
};

/* ===== 5. DATA RENDERING ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data, mode); }
    } catch (e) { }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();

    tbody.innerHTML = data.map((item, index) => {
        const q0243 = item['0243'] || 0;
        const qUser = item[user] || 0;
        const qTeam = item['Qty'] || 0; // สำหรับหน้า team-stock

        let disp = qUser;
        let actionUI = "";

        if (path.includes('withdraw')) {
            disp = q0243;
            actionUI = q0243 > 0 ? `<div style="display:flex;gap:5px;"><input type="number" id="qty_${index}" value="1" style="width:40px;"><button onclick="window.doAction('withdraw','${item.Material}',${index})" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Withdraw</button></div>` : 'OUT';
        } else if (path.includes('return')) {
            if (qUser <= 0) return '';
            actionUI = `<div style="display:flex;gap:5px;"><input type="number" id="qty_${index}" value="1" style="width:40px;"><button onclick="window.doAction('return','${item.Material}',${index})" style="background:#16a34a;color:white;border:none;padding:8px;border-radius:8px;">Return</button></div>`;
        } else if (path.includes('team-stock') || path.includes('admin')) {
            disp = qTeam;
            actionUI = `<div style="display:flex;gap:5px;"><input type="number" id="qty_${index}" value="1" style="width:40px;"><button onclick="window.doTransfer('${item.Material}',${index})" style="background:#f59e0b;color:white;border:none;padding:8px;border-radius:8px;">Transfer to User</button></div>`;
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
