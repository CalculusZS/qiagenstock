/* QIAGEN INVENTORY V51 - COMPACT & FULL OPTION (ENGLISH) */
const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec", PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};
window.allRows = []; window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

const getU = () => sessionStorage.getItem('selectedUser');

// --- 1. AUTH ---
window.handleLogin = async () => {
    const u = document.getElementById('username-input').value.toUpperCase(), p = document.getElementById('password-input').value;
    const res = await fetch(`${API}?action=checkauth&user=${u}&pass=${p}`).then(r => r.json());
    if (res?.success) {
        sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
        res.status === 'NEW' ? window.showForcePasswordChange(u) : window.location.replace('main.html');
    } else alert("❌ Login Failed");
};

window.showForcePasswordChange = (u) => {
    document.body.insertAdjacentHTML('beforeend', `<div id="pw-box" style="position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:10000;"><div style="background:white;padding:30px;border-radius:20px;text-align:center;width:300px;"><h3>Set Password</h3><input type="password" id="p1" placeholder="New"><input type="password" id="p2" placeholder="Confirm" style="margin-top:10px;"><button onclick="window.processReset('${u}')" style="width:100%;padding:12px;background:#f97316;color:white;border:none;margin-top:15px;border-radius:8px;">Update</button></div></div>`);
};

window.processReset = async (u) => {
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (p1 !== p2) return alert("Mismatch");
    const res = await fetch(`${API}?action=setpassword&user=${u}&newPass=${p1}&pass=${PASS}`).then(r => r.json());
    if (res.success) window.location.reload();
};

// --- 2. RENDER TABLE ---
window.renderTable = (data) => {
    const tbody = document.getElementById('data'), path = window.location.pathname.toLowerCase();
    if (!tbody) return;
    tbody.innerHTML = data.map((item, idx) => {
        let q0 = Number(item['0243']||0), qU = Number(item[getU()]||0), disp = (path.includes('withdraw')||path.includes('showall')) ? q0 : qU;
        if (path.includes('showall') && disp <= 0) disp = '<span style="color:red;font-weight:bold;">Out of Stock</span>';
        if ((path.includes('return')||path.includes('deduct')) && qU <= 0) return '';
        if (disp <= 0 && !path.includes('showall')) return '';

        let ui = "";
        if (path.includes('showall')) ui = `<small>Availability</small>`;
        else if (path.includes('deduct')) ui = `<div style="display:flex;gap:5px;"><input id="wo_${idx}" placeholder="WO#" style="width:70px;"><input type="number" id="qty_${idx}" value="1" style="width:35px;"><button onclick="window.doDeduct('${item.Material}',${idx})" style="background:red;color:white;border:none;padding:8px;border-radius:5px;">Deduct</button></div>`;
        else {
            const isW = path.includes('withdraw'), fr = isW?'0243':getU(), to = isW?getU():'0243';
            ui = `<div style="display:flex;gap:5px;"><input type="number" id="qty_${idx}" value="1" style="width:35px;"><button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${idx},'${fr}','${to}')" style="background:${isW?'#003366':'#16a34a'};color:white;border:none;padding:8px;border-radius:5px;">Add</button></div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center"><b>${disp}</b></td><td align="right">${ui}</td></tr>`;
    }).join('');
};

// --- 3. ACTIONS ---
window.doDeduct = async (mat, idx) => {
    const q = document.getElementById('qty_'+idx).value, wo = document.getElementById('wo_'+idx).value.trim();
    if (!wo) return alert("Need WO#");
    const res = await fetch(`${API}?action=deduct&user=${getU()}&material=${mat}&qty=${q}&wo=${wo}&pass=${PASS}`).then(r => r.json());
    if (res.success) { alert("Deducted!"); window.loadStockData(); }
};

window.addToCart = (type, mat, idx, from, to) => {
    const item = window.allRows.find(i => String(i.Material) === String(mat));
    const q = document.getElementById('qty_'+idx)?.value || document.getElementById(`t_qty_${idx}_${from}`).value;
    window.cart.push({ type, mat, name: item['Product Name'], qty: q, from, target: to });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = () => {
    let btn = document.getElementById('cart-btn');
    if(!btn) { document.body.insertAdjacentHTML('beforeend', `<div id="cart-btn" style="position:fixed;bottom:20px;right:20px;z-index:1000;"></div>`); btn = document.getElementById('cart-btn'); }
    btn.innerHTML = window.cart.length ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9;color:white;padding:15px 20px;border-radius:50px;border:none;font-weight:bold;box-shadow:0 5px 15px rgba(0,0,0,0.2);">🛒 Basket (${window.cart.length})</button>` : '';
};

// --- 4. BASKET MODAL (LIGHT BLUE) ---
window.showReviewModal = () => {
    let html = `<div style="background:#e0f2fe;padding:20px;border-radius:20px;width:90%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.3);"><h3 style="color:#0369a1;margin-top:0;">🛒 Confirm List</h3><div style="max-height:200px;overflow-y:auto;"><table style="width:100%;font-size:11px;border-collapse:collapse;">`;
    window.cart.forEach((i, x) => html += `<tr style="border-bottom:1px solid #999;"><td><b>${i.mat}</b><br>${i.qty} pcs</td><td align="center">${i.from}→${i.target}</td><td align="right"><button onclick="window.removeFromCart(${x})" style="color:red;border:none;background:none;font-size:16px;">✕</button></td></tr>`);
    html += `</table></div><button id="s-btn" onclick="window.confirmSync()" style="width:100%;padding:14px;background:#0369a1;color:white;margin-top:15px;border-radius:12px;border:none;font-weight:bold;">Sync & Open Outlook</button><button onclick="document.getElementById('rv-box').remove()" style="width:100%;background:none;border:none;margin-top:8px;color:#666;">Close</button></div>`;
    document.body.insertAdjacentHTML('beforeend', `<div id="rv-box" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:10000;">${html}</div>`);
};

window.confirmSync = async () => {
    const btn = document.getElementById('s-btn'); btn.innerText = "Processing..."; btn.disabled = true;
    let mail = `Hi BO,\n\nPlease transfer the below spare parts.\n\n`;
    for (const i of window.cart) {
        await fetch(`${API}?action=${i.type}&from=${i.from}&user=${i.target}&material=${i.mat}&qty=${i.qty}&pass=${PASS}`, {mode:'no-cors'});
        mail += `- ${i.mat} (${i.name}) | Qty: ${i.qty} | From: ${i.from} -> To: ${i.target}\n`;
    }
    window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer ${getU()} ${new Date().toLocaleDateString('en-GB')}&body=${encodeURIComponent(mail)}`;
    window.cart = []; localStorage.removeItem('qiagen_cart');
    alert("Success! Check your Email App."); window.location.reload();
};

window.removeFromCart = (x) => { window.cart.splice(x,1); localStorage.setItem('qiagen_cart', JSON.stringify(window.cart)); document.getElementById('rv-box').remove(); window.updateCartUI(); if(window.cart.length) window.showReviewModal(); };
window.loadStockData = async () => { const res = await fetch(`${API}?action=read&pass=${PASS}`).then(r => r.json()); if (res.success) { window.allRows = res.data; if(window.renderTable) window.renderTable(res.data); if(window.renderTeamTable) window.renderTeamTable(res.data); } };
window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

if (!window.location.pathname.includes('index.html')) { if(!getU()) window.location.replace('index.html'); else window.loadStockData(); }
window.updateCartUI();
