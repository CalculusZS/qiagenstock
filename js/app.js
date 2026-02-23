/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (CART + PREVIEW + ALL OPERATIONS)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const USER_MAP = { 'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat', 'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat' };

window.allRows = [];
window.cart = []; // ระบบตะกร้าสินค้า

/* ===== 1. AUTH & LOGIN ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || "User";
            sessionStorage.setItem('selectedUser', sheetColumnName);
            sessionStorage.setItem('userKey', userKey);
            if (res.status === 'NEW') window.showForcePasswordChange(userKey);
            else window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Login Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    const ids = ['current-user', 'display-user', 'user_display', 'userName'];
    ids.forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = user; });
    return true;
};

/* ===== 2. DATA RENDERING ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();

    tbody.innerHTML = data.map((item, index) => {
        const q0 = Number(item['0243'] || 0);
        const qU = Number(item[user] || 0);
        const dispQty = path.includes('withdraw') ? q0 : qU;

        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';

        let actionUI = "";
        if (path.includes('withdraw')) {
            actionUI = q0 > 0 ? `<div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" max="${q0}" style="width:40px; text-align:center;">
                <button onclick="window.addToCart('withdraw','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>
            </div>` : '<b style="color:red;">OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" max="${qU}" style="width:40px; text-align:center;">
                <button onclick="window.addToCart('return','${item.Material}',${index})" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button>
            </div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:80px; padding:5px;">
                <div style="display:flex; gap:5px;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${qU}" style="width:40px; text-align:center;">
                    <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#ef4444; color:white; border:none; padding:8px; border-radius:8px;">DEDUCT</button>
                </div>
            </div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center"><b>${dispQty}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

/* ===== 3. CART & EMAIL (PREVIEW & OUTLOOK) ===== */
window.addToCart = function(type, mat, idx, fromUser = null) {
    const qty = document.getElementById('qty_' + idx) ? document.getElementById('qty_' + idx).value : 1;
    const prod = (idx !== null) ? window.allRows[idx]['Product Name'] : "N/A";
    const user = sessionStorage.getItem('selectedUser');

    // Logic: ถ้าเป็น Transfer จากหน้า Team Stock 'fromUser' จะมีค่า
    const finalFrom = fromUser || (type === 'withdraw' ? '0243' : user);
    const finalTo = (type === 'withdraw' || type === 'transfer') ? user : '0243';

    window.cart.push({ type, mat, prod, qty, from: finalFrom, target: finalTo });
    window.updateCartUI();
    
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Added!"; btn.disabled = true;
    setTimeout(() => { btn.innerText = oldText; btn.disabled = false; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showEmailPreview()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer;">📧 Preview & Send (${window.cart.length})</button>` : '';
};

window.showEmailPreview = function() {
    const user = sessionStorage.getItem('selectedUser');
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const type = window.cart[0].type;

    let sub = `Spare parts ${type} ${today} (${user})`;
    let intro = `Hi BO,\n\nPlease ${type === 'return' ? 'return' : 'transfer'} the below spare parts.`;
    let table = `Catalog | Product Name | Amt | From | To\n` + "-".repeat(45) + "\n";
    window.cart.forEach(i => { table += `${i.mat} | ${i.prod} | ${i.qty} | ${i.from} | ${i.target}\n`; });

    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `<div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px;">
        <h3 style="margin-top:0;">Preview Email</h3>
        <input id="edit-sub" value="${sub}" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">
        <textarea id="edit-body" style="width:100%; height:200px; padding:10px; border:1px solid #ddd; border-radius:8px; font-family:monospace; font-size:12px;">${intro}\n\n${table}\n\nBest Regards,\n${user}</textarea>
        <div style="display:flex; gap:10px; margin-top:10px;">
            <button onclick="document.getElementById('email-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none; border-radius:10px;">Cancel</button>
            <button onclick="window.confirmSendOutlook()" style="flex:1; padding:12px; background:#0078d4; color:white; border:none; border-radius:10px; font-weight:bold;">Send Outlook</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

window.confirmSendOutlook = function() {
    const sub = document.getElementById('edit-sub').value;
    const body = document.getElementById('edit-body').value;
    const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
    const mailCc = "gthfss@qiagen.com";
    
    // พยายามเปิด Outlook App ก่อน
    const outlookUrl = `ms-outlook://compose?to=${mailTo}&cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    window.location.href = outlookUrl;
    
    // ถ้าไม่เปิดใน 800ms ให้เปิด mailto ปกติ
    setTimeout(() => { if (document.visibilityState === 'visible') window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`; }, 800);
    
    document.getElementById('email-modal').remove();
    if (confirm("Clear the list?")) { window.cart = []; window.updateCartUI(); window.loadStockData(); }
};

/* ===== 4. DEDUCT & HISTORY & RESET (เดิม) ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value;
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); window.loadStockData(); }
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    listDiv.innerHTML = '⌛ Loading History...';
    const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
    if (res.success) {
        listDiv.innerHTML = res.data.reverse().map(r => `
            <div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                <b>${new Date(r[0]).toLocaleDateString()}</b> | ${r[1]} | ${r[5].toUpperCase()} | Qty: ${r[6]} | WO: ${r[8]||'-'}
            </div>`).join('');
    }
};

window.showForcePasswordChange = function(u) { /* ฟังก์ชันเดิมของพี่ */ };
window.processReset = async function(u) { /* ฟังก์ชันเดิมของพี่ */ };
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('team-stock')) window.loadStockData();
