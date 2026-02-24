/* ========================================================================== 
   QIAGEN INVENTORY - ULTIMATE AUTO-SYNC VERSION
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = [];

/* ===== 1. AUTH & LOGIN (Complete) ===== */
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
            if (res.status === 'NEW') window.showForcePasswordChange(userKey);
            else window.location.replace('main.html');
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Connection Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    ['current-user', 'display-user', 'user_display', 'userName'].forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).innerText = user;
    });
    return true;
};

/* ===== 2. DATA LOADING ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Updating Data...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) { console.error(e); }
};

/* ===== 3. CART SYSTEM (Withdraw, Return, Transfer Combined) ===== */
window.addToCart = function(type, mat, idx, fromUser = null) {
    // ดึงค่าจากหน้า Team Stock หรือหน้าปกติ
    const qtyInput = document.getElementById('qty_' + idx) || document.getElementById('t_qty_' + idx + '_' + fromUser);
    const qty = qtyInput ? qtyInput.value : 1;
    const prod = (idx !== null && window.allRows[idx]) ? window.allRows[idx]['Product Name'] : "Spare Part";
    const currentUser = sessionStorage.getItem('selectedUser');

    // Logic การระบุต้นทาง/ปลายทาง (From: Col G, To: Col H)
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
        `<button onclick="window.showEmailPreview()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; font-size:16px;">📧 Confirm & Sync (${window.cart.length})</button>` : '';
};

/* ===== 4. AUTO-SYNC & EMAIL PREVIEW ===== */
window.showEmailPreview = function() {
    const user = sessionStorage.getItem('selectedUser'), today = new Date().toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
    // หัวข้ออีเมลตามสั่ง: Spare parts transfer [ชื่อพนักงาน] [วันที่]
    let sub = `Spare parts transfer ${user} ${today}`;
    let intro = `Hi BO,\n\nPlease process the following spare parts transfer/return:`;
    let table = `Catalog | Name | Qty | From | To\n` + "-".repeat(45) + "\n";
    window.cart.forEach(i => { table += `${i.mat} | ${i.prod} | ${i.qty} | ${i.from} | ${i.target}\n`; });

    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `<div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px;">
        <h3 style="margin:0 0 10px 0;">Preview & Auto-Sync</h3>
        <p style="font-size:11px; color:red;">*เมื่อกดส่ง สต็อกใน Sheet จะถูกตัดและเพิ่มให้ทันทีตามช่อง From/To</p>
        <input id="edit-sub" value="${sub}" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">
        <textarea id="edit-body" style="width:100%; height:200px; padding:10px; border:1px solid #ddd; border-radius:8px; font-family:monospace; font-size:12px;">${intro}\n\n${table}\n\nBest Regards,\n${user}</textarea>
        <div style="display:flex; gap:10px; margin-top:10px;">
            <button onclick="document.getElementById('email-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none; border-radius:10px;">Cancel</button>
            <button id="sync-btn" onclick="window.confirmSendAndSync()" style="flex:1; padding:12px; background:#0078d4; color:white; border:none; border-radius:10px; font-weight:bold;">Confirm & Sync</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    btn.innerText = "Processing..."; btn.disabled = true;

    // --- วนลูปตัดสต็อกอัตโนมัติ (Withdraw / Return / Transfer) ---
    for (const item of window.cart) {
        // ส่ง action ตามประเภท (เช่น action=transfer จะไปลบ From และบวก To ใน Sheet)
        const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
        await fetch(url);
    }

    // --- เปิด Outlook ---
    const sub = document.getElementById('edit-sub').value, body = document.getElementById('edit-body').value;
    const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com", mailCc = "gthfss@qiagen.com";
    window.location.href = `ms-outlook://compose?to=${mailTo}&cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => { if (document.visibilityState === 'visible') window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`; }, 800);

    document.getElementById('email-modal').remove();
    alert("✅ Sheet Updated & Email Opened");
    window.cart = []; window.updateCartUI(); window.loadStockData();
};

/* ===== 5. DEDUCT & TABLE RENDER ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value, qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Please enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Deducted Successfully"); window.loadStockData(); }
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

/* ===== 6. HISTORY & UTILS (Complete) ===== */
window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
    if (res.success) {
        listDiv.innerHTML = res.data.reverse().map(r => `
            <div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                <b>${new Date(r[0]).toLocaleDateString()}</b> | ${r[1]}<br>
                Type: <b style="color:#0078d4">${r[5]}</b> | From: <b>${r[6]||'-'}</b> | To: <b>${r[7]||'-'}</b> | Qty: <b>${r[6]}</b> | WO: ${r[8]||'-'}
            </div>`).join('');
    }
};

window.showForcePasswordChange = function(u) {
    const p = prompt("First login! Set 4+ digit password:");
    if(p && p.length>=4) window.processReset(u, p);
    else { alert("Too short"); window.logout(); }
};
window.processReset = async function(u, p) {
    const res = await fetch(`${API}?action=resetpass&user=${u}&newpass=${p}&pass=${MASTER_PASS}`).then(r=>r.json());
    if(res.success) { alert("Done! Login again."); window.logout(); }
};
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('team-stock')) window.loadStockData();
