/* ========================================================================== 
   QIAGEN INVENTORY - FRONTEND (FULL APP.JS - SAFE FIX)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbyn-fbvrwSi7Fe1_h1goTInHcSeqK8Ydc6UuMI3wXeqeNxsuAAIZotphtx6NrhlKdSv/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];
let isGlobalSyncing = false;

/* --- 1. AUTHENTICATION --- */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    return true;
};

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
            window.location.replace('main.html');
        } else { alert("❌ Incorrect Password"); }
    } catch (e) {
        if (p === MASTER_PASS || p === "1234") { 
            sessionStorage.setItem('selectedUser', USER_MAP[u] || u); 
            window.location.replace('main.html'); 
        }
    }
};

/* --- 2. CART SYSTEM --- */
window.addToCart = function(type, mat, idx, from, target) {
    const qID = type === 'transfer' ? `t_qty_${idx}_${from}` : `qty_${idx}`;
    const qtyInput = document.getElementById(qID);
    const addQty = parseInt(qtyInput ? qtyInput.value : 1) || 0;
    
    if (addQty <= 0) { alert("Please enter valid quantity"); return; }

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
        alert(`❌ Stock Insufficient!\nMaterial: ${mat}\nAvailable: ${availableStock}`);
        return;
    }

    if (existingIndex > -1) {
        window.cart[existingIndex].qty = totalInCart;
    } else {
        window.cart.push({ 
            type, 
            mat, 
            name: itm ? itm['Product Name'] : 'Unknown Item', 
            qty: addQty, 
            from, 
            target 
        });
    }
    
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
    
    const btn = document.activeElement;
    if(btn && btn.tagName === 'BUTTON') {
        const originalText = btn.innerHTML;
        btn.innerHTML = "✓ Added";
        btn.style.background = "#10b981";
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = "";
        }, 800);
    }
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); 
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:9999;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? 
        `<button onclick="window.showReviewModal()" style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:white; padding:14px 24px; border-radius:50px; border:none; font-weight:bold; font-size:15px; box-shadow: 0 10px 25px -5px rgba(2,132,199,0.5); cursor:pointer; display:flex; align-items:center; gap:8px;">
            🛒 Review Cart (${window.cart.length})
         </button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `
        <div style="padding:12px; background:#f8fafc; border-radius:10px; margin-bottom:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1;">
                <div style="font-size:15px; font-weight:800; color:#003366;">${i.mat}</div>
                <div style="font-size:12px; color:#475569;">${i.name}</div>
                <div style="font-size:12px; font-weight:700; color:#0ea5e9;">Qty: ${i.qty} (${i.from} → ${i.target})</div>
            </div>
            <button onclick="window.removeFromCart(${idx})" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 10px; border-radius:8px; font-weight:bold; cursor:pointer;">✕</button>
        </div>`).join('');

    const div = document.createElement('div'); 
    div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.75); backdrop-filter:blur(4px); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    div.innerHTML = `<div style="background:white; width:100%; max-width:400px; border-radius:20px; padding:20px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <h3 style="margin-top:0; border-bottom:2px solid #f1f5f9; padding-bottom:10px; color:#0f172a;">🛒 Confirm Cart Items</h3>
            <div style="max-height:300px; overflow-y:auto;">${html || '<div style="text-align:center; padding:20px; color:#94a3b8;">Cart is empty</div>'}</div>
            ${window.cart.length > 0 ? `<button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:14px; background:#0284c7; color:white; border:none; border-radius:12px; margin-top:14px; font-weight:bold; cursor:pointer;">Confirm & Submit</button>` : ''}
            <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:8px; padding:10px; border:none; background:none; color:#64748b; font-weight:600; cursor:pointer;">Cancel</button>
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

window.confirmSendAndSync = async function() {
    if (isGlobalSyncing) return;
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    const now = new Date();
    const today = now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();

    isGlobalSyncing = true;
    if (btn) { btn.innerText = "⏳ Processing..."; btn.disabled = true; }

    try {
        for (const item of window.cart) {
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
        }
        window.cart = []; 
        localStorage.removeItem('qiagen_cart');
        alert("✅ Sync Completed Successfully!");
        window.location.reload();
    } catch (e) { 
        alert("❌ Sync Error"); 
        isGlobalSyncing = false;
        if (btn) { btn.disabled = false; btn.innerText = "Confirm & Submit"; }
    }
};

/* --- 3. DEDUCT ACTION --- */
window.doDeduct = async function(mat, idx) {
    const qtyInput = document.getElementById('qty_' + idx);
    const woInput = document.getElementById('wo_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const wo = woInput ? woInput.value.trim() : "";
    
    if (!wo) { alert("❌ Please enter Work Order (WO#)"); return; }
    const user = sessionStorage.getItem('selectedUser');

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { 
            alert("✅ Deducted Successfully!"); 
            window.loadStockData(); 
        } else {
            alert("❌ Deduct Failed: " + (res.msg || "Error"));
        }
    } catch(e) { 
        alert("❌ Connection Error"); 
    }
};

/* --- 4. TABLE RENDERER (COMPATIBLE WITH HTML TABLES) --- */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); 
    if (!tbody || window.location.pathname.includes('main.html')) return;

    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();

    let rowsHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0);
        let qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        
        if (!path.includes('showall') && displayQty <= 0) return '';
        
        let actionUI = "";
        if (path.includes('deduct')) {
            actionUI = `
                <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                    <input type="text" id="wo_${index}" placeholder="WO#" class="wo-input" style="width:75px; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" class="qty-input-sm" style="width:40px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                    <button id="btn_deduct_${index}" onclick="window.doDeduct('${item.Material}', ${index})" class="btn-deduct" style="background:#ef4444; color:white; border:none; padding:7px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">Deduct</button>
                </div>`;
        } else if (path.includes('return')) {
            actionUI = `
                <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" class="qty-input-sm" style="width:40px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                    <button onclick="window.addToCart('return','${item.Material}',${index},'${user}','0243')" class="btn-return" style="background:#16a34a; color:white; border:none; padding:7px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">Return</button>
                </div>`;
        } else {
            actionUI = `
                <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" class="qty-input-sm" style="width:40px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                    <button onclick="window.addToCart('withdraw','${item.Material}',${index},'0243','${user}')" class="btn-withdraw" style="background:#003366; color:white; border:none; padding:7px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">Withdraw</button>
                </div>`;
        }

        return `
        <tr>
            <td style="padding:12px 10px; vertical-align:middle;">
                <div style="font-weight:bold; color:#003366; font-size:15px;">${item.Material}</div>
                <div style="font-size:13px; color:#64748b; margin-top:2px;">${item['Product Name']||'-'}</div>
            </td>
            <td align="center" style="padding:12px 10px; vertical-align:middle; font-weight:bold; font-size:16px; color:#0f172a;">
                ${displayQty}
            </td>
            <td align="right" style="padding:12px 10px; vertical-align:middle;">
                ${actionUI}
            </td>
        </tr>`;
    }).join('');

    tbody.innerHTML = rowsHTML || '<tr><td colspan="3" align="center" style="padding:30px; color:#94a3b8;">📦 No Material Found</td></tr>';
};

/* --- 5. DATA LOADING & SEARCH --- */
window.loadStockData = async function(type) {
    if (window.location.pathname.includes('main.html')) return; // ข้ามการทำงานถ้าอยู่หน้า Dashboard

    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center" style="padding:30px; color:#64748b;">⏳ Loading Stock Data...</td></tr>';

    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { 
            window.allRows = res.data; 
            window.renderTable(res.data); 
        }
    } catch(e) {
        if(tbody) tbody.innerHTML = '<tr><td colspan="3" align="center" style="padding:30px; color:#ef4444;">❌ Failed to load data.</td></tr>';
    }
};

window.searchStock = function(val, type) {
    window.searchData(val);
};

window.searchData = function(val) {
    const query = val.toLowerCase().trim();
    const filtered = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(query) || 
        String(r['Product Name']||'').toLowerCase().includes(query)
    );
    window.renderTable(filtered);
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

/* --- 6. INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', () => {
    const name = sessionStorage.getItem('selectedUser');
    
    // อัปเดตชื่อผู้ใช้ตาม ID ต่างๆ ใน HTML
    ['user-display', 'user_display', 'display-user', 'current-user'].forEach(id => {
        const el = document.getElementById(id); 
        if (el && name) el.innerText = name;
    });

    // ถ้าไม่ใช่หน้า login และไม่มี session ให้กลับไปหน้า login
    if (!window.location.pathname.includes('index.html')) {
        if (!name) {
            window.location.replace('index.html');
            return;
        }
        // โหลดข้อมูลเฉพาะหน้าที่จำเป็น
        if (!window.location.pathname.includes('main.html') && !window.location.pathname.includes('history.html')) {
            window.loadStockData();
        }
    }
    window.updateCartUI();
});
