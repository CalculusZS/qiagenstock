/* ========================================================================== 
   QIAGEN INVENTORY - ULTIMATE MASTER VERSION (TEAM STOCK INCLUDED)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. แสดงชื่อผู้ใช้งาน --- */
window.displayUserInfo = function() {
    const fullName = sessionStorage.getItem('selectedUser');
    if (!fullName) return;
    const possibleIDs = ['user-display', 'user_display', 'display-user', 'current-user'];
    possibleIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'user_display') el.innerText = fullName; 
            else el.innerHTML = `Logged in as: <b>${fullName}</b>`;
        }
    });
};

/* --- 2. RENDER TABLE (หน้าปกติ) --- */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if (!path.includes('showall') && displayQty <= 0) return '';

        let actionUI = "";
        if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end; align-items:center;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:65px; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:bold; font-size:12px;">Used</button>
            </div>`;
        } else if (!path.includes('showall')) {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end; align-items:center;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px;">
                <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:bold; font-size:12px;">Add</button>
            </div>`;
        }

        return `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:15px 10px;">
                <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name'] || ''}</div>
            </td>
            <td align="center" style="font-size:18px; font-weight:bold;">${displayQty}</td>
            <td align="right" style="padding-right:10px;">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* --- 3. RENDER TEAM TABLE (หน้า Team Stock) --- */
window.renderTeamTable = function(data) {
    const container = document.getElementById('team-data-container'); if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser');
    const members = ['Kitti','Tatchai','Parinyachat','Phurilap','Penporn','Phuriwat'];
    let html = '';

    data.forEach((item, idx) => {
        members.forEach(m => {
            const q = Number(item[m] || 0);
            if (m !== currentUser && q > 0) {
                html += `
                <div class="card" style="background:white; margin:10px; padding:15px; border-radius:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="flex:1;">
                        <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                        <div style="font-size:11px; color:#64748b;">${item['Product Name'] || ''}</div>
                        <div style="font-size:12px; color:#f97316; margin-top:5px;"><i class="fas fa-user"></i> ${m}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:20px; font-weight:bold; margin-bottom:5px;">${q}</div>
                        <div style="display:flex; gap:5px; align-items:center;">
                            <input type="number" id="t_qty_${idx}_${m}" value="1" style="width:40px; padding:5px; border-radius:5px; border:1px solid #ddd; text-align:center;">
                            <button onclick="window.addToCart('transfer','${item.Material}',${idx},'${m}','${currentUser}')" style="background:#f97316; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; font-size:12px;">Add</button>
                        </div>
                    </div>
                </div>`;
            }
        });
    });
    container.innerHTML = html || '<div style="text-align:center; padding:50px; color:gray;">No Stock Found in Team</div>';
};

/* --- 4. หน้าตะกร้า (โชว์ข้อมูลครบ) --- */
window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `
        <div style="font-size:13px; border-bottom:1px solid #eee; padding:10px 0; display:flex; justify-content:space-between; align-items:start;">
            <div style="flex:1;">
                <div style="font-weight:bold; color:#0369a1;">${i.mat} (x${i.qty})</div>
                <div style="font-size:11px; color:#64748b;">${i.name || ''}</div>
                <div style="font-size:10px; margin-top:4px;"><span style="background:#f1f5f9; padding:2px 5px; border-radius:4px;">${i.from} → ${i.target}</span></div>
            </div>
            <button onclick="window.removeFromCart(${idx})" style="color:red; border:none; background:none; font-size:18px;">✕</button>
        </div>
    `).join('');
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;padding:15px;";
    div.innerHTML = `<div style="background:white;width:100%;max-width:400px;border-radius:20px;padding:20px;">
        <h3 style="margin-top:0;">🛒 Selected Items</h3>
        <div style="max-height:300px; overflow-y:auto;">${html || 'Empty'}</div>
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%;padding:15px;background:#0ea5e9;color:white;border:none;border-radius:12px;font-weight:bold;margin-top:15px;">Sync & Open Outlook</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%;margin-top:10px;border:none;background:none;color:gray;">Close</button>
    </div>`;
    document.body.appendChild(div);
};

/* --- 5. SYNC, LOGIN, LOGOUT & LOAD --- */
window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    btn.innerText = "Processing..."; btn.disabled = true;
    let emailBody = `Hi BO,\n\nPlease transfer parts for: ${user}\n\n`;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type || 'transfer'}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url).then(r => r.json());
            emailBody += `- ${item.mat} | ${item.name} | Qty: ${item.qty} (${item.from} -> ${item.target})\n`;
        }
        window.cart = []; localStorage.removeItem('qiagen_cart');
        window.location.replace(`mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=Spare parts transfer ${user} ${dateStr}&body=${encodeURIComponent(emailBody)}`);
        alert("✅ Sync Success!"); setTimeout(() => window.location.reload(), 1000);
    } catch (e) { alert("❌ Error"); btn.disabled = false; }
};

window.addToCart = function(type, mat, idx, from, target) {
    const qID = type === 'transfer' ? `t_qty_${idx}_${from}` : `qty_${idx}`;
    const q = document.getElementById(qID).value;
    const itm = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: itm['Product Name'], qty: q, from, target });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed;bottom:25px;right:25px;z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9;color:white;padding:15px 25px;border-radius:50px;border:none;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);">Cart (${window.cart.length})</button>` : '';
};

window.removeFromCart = (idx) => { window.cart.splice(idx, 1); localStorage.setItem('qiagen_cart', JSON.stringify(window.cart)); document.getElementById('review-modal').remove(); if (window.cart.length > 0) window.showReviewModal(); window.updateCartUI(); };

window.loadStockData = async function() {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { 
            window.allRows = res.data; 
            window.renderTable(res.data); 
            window.renderTeamTable(res.data); 
        }
    } catch(e) { console.error("Load Error", e); }
};

window.handleLogin = async function() {
    const u = document.getElementById('username-input').value.trim().toUpperCase();
    const p = document.getElementById('password-input').value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
            window.location.replace('main.html');
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Error"); }
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

document.addEventListener('DOMContentLoaded', () => {
    window.displayUserInfo();
    if (!window.location.pathname.includes('index.html')) {
        if (!sessionStorage.getItem('selectedUser')) window.location.replace('index.html');
        else window.loadStockData();
    }
    window.updateCartUI();
});
