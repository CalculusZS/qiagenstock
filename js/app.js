/* ========================================================================== 
   QIAGEN INVENTORY - AUTO-FORMAT LIST FOR OUTLOOK (NO PASTE REQUIRED)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.withdrawCart = []; 
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

/* ===== 2. WITHDRAW (ADD TO LIST) ===== */
window.doAction = async function(type, mat, idx) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const userInSheet = sessionStorage.getItem('selectedUser'); 
    
    if (!confirm(`Confirm ${type} ${qty} unit(s)?`)) return;

    try {
        const url = `${API}?action=${type}&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res.success) { 
            alert("✅ Added to list");
            if (type === 'withdraw') {
                const prod = window.allRows[idx]['Product Name'] || 'N/A';
                window.withdrawCart.push({ mat, prod, qty });
                window.updateCartUI();
            }
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 3. AUTO FORMAT FOR OUTLOOK ===== */
window.updateCartUI = function() {
    let cartBtn = document.getElementById('cart-floating-btn');
    if (!cartBtn) {
        cartBtn = document.createElement('div');
        cartBtn.id = 'cart-floating-btn';
        cartBtn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(cartBtn);
    }
    if (window.withdrawCart.length > 0) {
        cartBtn.innerHTML = `<button onclick="window.sendToOutlook()" style="background:#003366; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); cursor:pointer; font-weight:bold;">📧 Send to Outlook (${window.withdrawCart.length} items)</button>`;
    } else { cartBtn.innerHTML = ''; }
};

window.sendToOutlook = function() {
    const user = sessionStorage.getItem('selectedUser');
    const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
    const mailCc = "gthfss@qiagen.com";
    const subject = `Spare parts transfer - ${user}`;
    
    // สร้างเนื้อหาแบบจัดบรรทัดให้อ่านง่าย (ทดแทนตาราง)
    let body = `Hi BO,\n\nPlease transfer the spare parts as listed below:\n\n`;
    body += `------------------------------------------\n`;
    
    window.withdrawCart.forEach((item, i) => {
        body += `Item ${i+1}:\n`;
        body += `Catalog: ${item.mat}\n`;
        body += `Product Name: ${item.prod}\n`;
        body += `Amount: ${item.qty}\n`;
        body += `From: 0243  To: ${user}\n`;
        body += `------------------------------------------\n`;
    });

    body += `\nBest Regards,\n${user}`;

    // ส่งเข้า Outlook ทันที
    const mailtoLink = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;

    // เคลียร์รายการ
    if(confirm("Outlook opened? Clear the list?")) {
        window.withdrawCart = [];
        window.updateCartUI();
    }
};

/* ===== 4. DATA LOAD & RENDER ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data, mode);
        }
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
        const disp = path.includes('withdraw') ? q0243 : qUser;
        let btn = `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center;"><button onclick="window.doAction('${path.includes('withdraw')?'withdraw':'return'}','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">${path.includes('withdraw')?'Withdraw':'Return'}</button></div>`;
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${disp}</b></td><td align="right">${btn}</td></tr>`;
    }).join('');
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered, mode);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
