/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (GROUPED ITEMS & OUTLOOK FORCED)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyvkhS_Zk9dR_MzJq4UCALV_41VFx4JH01y_xAma9Wou-yP9LJL8VydAkw7tNZYuVms/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. AUTH & PASSWORD --- */
window.handleLogin = async function() {
    const uEl = document.getElementById('username-input') || document.getElementById('user-select');
    const pEl = document.getElementById('password-input');
    if (!uEl || !pEl) return;
    const u = uEl.value.trim().toUpperCase();
    const p = pEl.value.trim();
    if (!u) { alert("Please enter User ID"); return; }
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
            sessionStorage.setItem('tempID', u);
            if (res.status === 'NEW') { window.showForcePasswordChange(u); } 
            else { window.location.replace('main.html'); }
        } else { alert("❌ Incorrect Password"); }
    } catch (e) {
        if (p === MASTER_PASS || p === "1234") { 
            sessionStorage.setItem('selectedUser', USER_MAP[u] || u); 
            window.location.replace('main.html'); 
        }
    }
};

window.showForcePasswordChange = function(u) {
    const div = document.createElement('div');
    div.id = "force-pw-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.98);display:flex;justify-content:center;align-items:center;z-index:99999;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:24px;text-align:center;width:100%;max-width:340px;">
            <h3>Set New Password</h3>
            <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:14px;margin-bottom:10px;border:1px solid #ddd;border-radius:12px;">
            <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:14px;margin-bottom:20px;border:1px solid #ddd;border-radius:12px;">
            <button onclick="window.processReset('${u}')" style="width:100%;padding:16px;background:#f97316;color:white;border:none;border-radius:12px;font-weight:bold;">Update & Activate</button>
        </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(u) {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) { alert("❌ Not Match!"); return; }
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Activated!"); window.location.replace('main.html'); }
    } catch (e) { alert("❌ Error"); }
};

/* --- 2. CART --- */
window.addToCart = function(type, mat, idx, from, target) {
    const qID = type === 'transfer' ? `t_qty_${idx}_${from}` : `qty_${idx}`;
    const addQty = parseInt(document.getElementById(qID).value) || 0;
    
    if (addQty <= 0) { alert("Please enter quantity"); return; }

    const itm = window.allRows.find(i => String(i.Material) === String(mat));
    const availableStock = Number(itm ? itm[from] : 0);

    const existingIndex = window.cart.findIndex(i => 
        String(i.mat) === String(mat) && 
        i.from === from && 
        i.target === target && 
        i.type === type
    );

    let totalInCart = addQty;
    if (existingIndex > -1) {
        totalInCart = parseInt(window.cart[existingIndex].qty) + addQty;
    }

    if (totalInCart > availableStock) {
        alert(`❌ Stock Insufficient!\nItem: ${mat}\nAvailable: ${availableStock}\nAlready in cart: ${existingIndex > -1 ? window.cart[existingIndex].qty : 0}\nNew total would be: ${totalInCart}`);
        return;
    }

    if (existingIndex > -1) {
        window.cart[existingIndex].qty = totalInCart;
    } else {
        window.cart.push({ 
            type, 
            mat, 
            name: itm ? itm['Product Name'] : 'Unknown', 
            qty: addQty, 
            from, 
            target 
        });
    }
    
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
    
    const btn = document.activeElement;
    if(btn && btn.tagName === 'BUTTON') {
        const originalText = btn.innerText;
        btn.innerText = "Added!";
        setTimeout(() => btn.innerText = originalText, 800);
    }
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:9999;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9; color:white; padding:15px 25px; border-radius:50px; border:none; font-weight:bold; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `
        <div style="padding:12px 0; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1;">
                <b style="color:#003366;">${i.mat}</b><br>
                <small>${i.name}</small><br>
                <small style="color:black;"><b>Qty: ${i.qty}</b> | ${i.from} → ${i.target}</small>
            </div>
            <button onclick="window.removeFromCart(${idx})" style="background:#fee2e2; color:#dc2626; border:none; padding:5px 10px; border-radius:8px;">✕</button>
        </div>`).join('');
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    div.innerHTML = `<div style="background:white; width:100%; max-width:400px; border-radius:20px; padding:20px;">
            <h3 style="margin-top:0; border-bottom:2px solid #f1f5f9; padding-bottom:10px; color:black;">🛒 Review Order</h3>
            <div style="max-height:350px; overflow-y:auto;">${html || 'No items'}</div>
            <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:16px; background:#0ea5e9; color:white; border:none; border-radius:12px; margin-top:15px; font-weight:bold;">Confirm & Open Outlook</button>
            <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; border:none; background:none; color:gray;">Cancel</button>
        </div>`;
    document.body.appendChild(div);
};

window.removeFromCart = function(idx) {
    window.cart.splice(idx, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    const modal = document.getElementById('review-modal');
    if(modal) modal.remove();
    if (window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
};

/* --- 3. SYNC (NEW LOGIC: SILENT SYNC FOR 9026466) --- */
window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    const now = new Date();
    const today = now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
    
    // เช็คว่าในตะกร้ามีแต่รหัส 9026466 หรือไม่
    const onlySilentItems = window.cart.every(item => String(item.mat) === "9026466");

    btn.innerText = "Syncing..."; btn.disabled = true;

    let subjectText = `Spare parts transfer ${user} ${today}`;
    let bodyText = `Hi BO,\n\nPlease transfer the following spare parts.\n\n`;
    let hasEmailContent = false;

    try {
        for (const item of window.cart) {
            // 1. อัปเดต Google Sheet ทุกรายการ
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
            
            // 2. สร้างเนื้อหาอีเมล (ข้าม 9026466)
            if (String(item.mat) !== "9026466") {
                bodyText += `• ${item.mat} | ${item.name}\n  Qty: ${item.qty} (${item.from} -> ${item.target})\n\n`;
                hasEmailContent = true;
            }
        }

        // ล้างตะกร้าทันทีที่ส่ง Data สำเร็จ
        window.cart = []; 
        localStorage.removeItem('qiagen_cart');

        // 3. ตัดสินใจว่าจะเปิด Outlook หรือไม่
        if (onlySilentItems || !hasEmailContent) {
            // กรณีมีแต่ของไม่ต้องแจ้งทางเมล์ ให้แจ้งเตือนแล้วรีโหลดเลย
            alert("✅ Sync Successfully (No email required)");
            window.location.reload();
        } else {
            // กรณีมีของอื่นๆ ให้เปิด Outlook
            const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
            const ccTo = "gthfss@qiagen.com";
            const outlookUrl = `ms-outlook://compose?to=${encodeURIComponent(mailTo)}&cc=${encodeURIComponent(ccTo)}&subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
            const fallbackUrl = `mailto:${mailTo}?cc=${ccTo}&subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;

            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                window.location.href = outlookUrl;
                setTimeout(() => { if (document.hasFocus()) window.location.href = fallbackUrl; }, 1500);
            } else {
                window.location.href = fallbackUrl;
            }
            setTimeout(() => window.location.reload(), 3000);
        }
    } catch (e) { 
        alert("Sync Error"); 
        btn.disabled = false; 
        btn.innerText = "Confirm & Open Outlook";
    }
};

/* --- 4. RENDERING & DATA (FIXED: SHOW OWN STOCK BUT DISABLE TRANSFER) --- */
window.renderTeamTable = function(data) {
    const container = document.getElementById('team-data-container') || document.getElementById('data');
    if (!container || !window.location.pathname.includes('team-stock')) return;

    const currentUser = sessionStorage.getItem('selectedUser');
    const members = Object.values(USER_MAP);
    let html = '';
    
    data.forEach((item, idx) => {
        members.forEach(m => {
            const q = Number(item[m] || 0);
            // แสดงข้อมูลถ้า Stock > 0 (รวมตัวเองด้วย)
            if (q > 0) {
                const isMe = (m === currentUser);
                html += `<tr class="card">
                    <td style="padding:12px;">
                        <div style="font-size: 15px; font-weight: bold; color: ${isMe ? '#64748b' : 'black'}; margin-bottom: 4px;">
                            Owner: ${isMe ? m + ' (Me)' : m}
                        </div>
                        <b>${item.Material}</b> - <small>${item['Product Name']||''}</small>
                    </td>
                    <td align="right" style="padding-right:10px;">
                        <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                            <b style="font-size: 16px;">Stock: ${q}</b>
                            ${isMe ? 
                                `<button disabled style="background:#cbd5e1; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:not-allowed;">Transfer</button>` :
                                `<input type="number" id="t_qty_${idx}_${m}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #ddd; border-radius:6px;">
                                 <button onclick="window.addToCart('transfer','${item.Material}',${idx},'${m}','${currentUser}')" style="background:#f97316; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold;">Transfer</button>`
                            }
                        </div>
                    </td>
                </tr>`;
            }
        });
    });
    container.innerHTML = html || '<tr><td colspan="2" align="center" style="padding:20px;">No Team Stock Available</td></tr>';
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); 
    if (!tbody || window.location.pathname.includes('team-stock')) return;

    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    let rowsHtml = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if (!path.includes('showall') && displayQty <= 0) return '';
        
        let actionUI = "";
        if (path.includes('showall')) {
            actionUI = `<b style="color:${displayQty > 0 ? "#16a34a" : "#dc2626"};">${displayQty > 0 ? "In stock" : "Out of stock"}</b>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                        <input type="text" id="wo_${index}" placeholder="WO#" style="width:65px; padding:6px; border:1px solid #ddd; border-radius:6px;">
                        <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #ddd; border-radius:6px;">
                        <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold;">Deduct</button></div>`;
        } else {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                        <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #ddd; border-radius:6px;">
                        <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold;">${isW?'Withdraw':'Return'}</button></div>`;
        }
        return `<tr><td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${displayQty}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
    tbody.innerHTML = rowsHtml || '<tr><td colspan="3" align="center" style="padding:40px; color:gray;">❌ No items found.</td></tr>';
};

/* --- 5. SEARCH & CACHE --- */
window.loadStockData = async function() {
    const cacheKey = 'qiagen_cache';
    const now = new Date().getTime();
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { 
            window.allRows = res.data; 
            localStorage.setItem(cacheKey, JSON.stringify(res.data));
            localStorage.setItem('qiagen_cache_time', now.toString());
            window.renderTable(res.data); 
            window.renderTeamTable(res.data); 
        }
    } catch(e) {
        if (localStorage.getItem(cacheKey)) {
            window.allRows = JSON.parse(localStorage.getItem(cacheKey));
            window.renderTable(window.allRows);
            window.renderTeamTable(window.allRows);
        }
    }
};

window.searchData = function(val) {
    const query = val.toLowerCase();
    const filtered = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(query) || 
        String(r['Product Name']||'').toLowerCase().includes(query)
    );
    if (window.location.pathname.includes('team-stock')) {
        window.renderTeamTable(filtered);
    } else {
        window.renderTable(filtered);
    }
};

window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ Enter WO#");
    const user = sessionStorage.getItem('selectedUser');
    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Deducted Successfully"); window.loadStockData(); }
    } catch(e) { alert("❌ Error"); }
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

document.addEventListener('DOMContentLoaded', () => {
    const name = sessionStorage.getItem('selectedUser');
    ['user-display', 'user_display', 'display-user', 'current-user'].forEach(id => {
        const el = document.getElementById(id); if (el && name) el.innerText = name;
    });
    const sInput = document.getElementById('search-input') || document.querySelector('input[type="text"]');
    if (sInput) sInput.oninput = (e) => window.searchData(e.target.value);
    if (!window.location.pathname.includes('index.html')) {
        if (!name) window.location.replace('index.html'); else window.loadStockData();
    }
    window.updateCartUI();
});
