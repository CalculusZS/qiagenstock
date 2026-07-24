/* ========================================================================== 
   QIAGEN INVENTORY - FRONTEND CORE (PREMIUM UI + ANTI-DOUBLE SUBMIT)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbyn-fbvrwSi7Fe1_h1goTInHcSeqK8Ydc6UuMI3wXeqeNxsuAAIZotphtx6NrhlKdSv/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};
const ALL_USERS = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];
let isGlobalSyncing = false;
let isProcessingDeduct = false;

/* --- 1. AUTHENTICATION & USER MANAGEMENT --- */
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
    
    const loginBtn = document.activeElement;
    if (loginBtn && loginBtn.tagName === 'BUTTON') loginBtn.disabled = true;

    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(u)}&pass=${encodeURIComponent(p)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[u] || res.fullName);
            sessionStorage.setItem('tempID', u);
            window.location.replace('main.html');
        } else { 
            alert("❌ Incorrect Password"); 
            if (loginBtn) loginBtn.disabled = false;
        }
    } catch (e) {
        if (p === MASTER_PASS || p === "1234") { 
            sessionStorage.setItem('selectedUser', USER_MAP[u] || u); 
            window.location.replace('main.html'); 
        } else {
            if (loginBtn) loginBtn.disabled = false;
        }
    }
};

window.logout = function() {
    sessionStorage.clear();
    localStorage.removeItem('qiagen_cart');
    window.location.replace('index.html');
};

/* --- 2. CART SYSTEM (PREMIUM UI & PREVENT DOUBLE-ADD) --- */
window.addToCart = function(type, mat, idx, from, target) {
    const btn = document.activeElement;
    if (btn && btn.tagName === 'BUTTON' && btn.disabled) return;

    const qID = type === 'transfer' ? `t_qty_${idx}_${from}` : `qty_${idx}`;
    const qtyInput = document.getElementById(qID) || document.getElementById(`qty_${idx}`);
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

    if (availableStock > 0 && totalInCart > availableStock) {
        alert(`❌ Stock Insufficient!\nMaterial: ${mat}\nAvailable: ${availableStock}`);
        return;
    }

    if (btn && btn.tagName === 'BUTTON') {
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = "✓ Added";
        btn.style.background = "#10b981";

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = "";
            btn.disabled = false;
        }, 600);
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
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); 
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:28px; right:24px; z-index:9999;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? 
        `<button onclick="window.showReviewModal()" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:white; padding:14px 24px; border-radius:30px; border:1px solid rgba(255,255,255,0.15); font-weight:700; font-size:14px; box-shadow: 0 12px 25px -5px rgba(15, 23, 42, 0.4); cursor:pointer; display:flex; align-items:center; gap:10px; transition: all 0.2s ease;">
            <span style="background:#0284c7; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800;">${window.cart.length}</span>
            🛒 View Cart
         </button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `
        <div style="padding:14px; background:#f8fafc; border-radius:12px; margin-bottom:10px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
            <div style="flex:1;">
                <div style="font-size:15px; font-weight:800; color:#0f172a; font-family:sans-serif;">${i.mat}</div>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">${i.name}</div>
                <div style="display:inline-block; margin-top:6px; padding:3px 8px; background:#e0f2fe; color:#0369a1; border-radius:6px; font-size:11px; font-weight:700;">
                    Qty: ${i.qty} &bull; (${i.from} → ${i.target})
                </div>
            </div>
            <button onclick="window.removeFromCart(${idx})" style="background:#fee2e2; color:#ef4444; border:none; width:32px; height:32px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:0.2s;">✕</button>
        </div>`).join('');

    const div = document.createElement('div'); 
    div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(6px); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    div.innerHTML = `<div style="background:white; width:100%; max-width:420px; border-radius:24px; padding:24px; box-shadow:0 20px 40px -15px rgba(0,0,0,0.2); border:1px solid #f1f5f9; font-family:sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; font-size:18px; color:#0f172a; font-weight:800;">🛒 Review Cart Items</h3>
                <span style="font-size:12px; font-weight:700; color:#64748b; background:#f1f5f9; padding:4px 10px; border-radius:20px;">${window.cart.length} Items</span>
            </div>
            <div style="max-height:320px; overflow-y:auto; padding-right:4px;">${html || '<div style="text-align:center; padding:30px; color:#94a3b8; font-weight:600;">Cart is empty</div>'}</div>
            ${window.cart.length > 0 ? `<button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:14px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:white; border:none; border-radius:14px; margin-top:16px; font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 8px 20px -4px rgba(2,132,199,0.4);">Confirm & Submit</button>` : ''}
            <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; padding:10px; border:none; background:none; color:#64748b; font-weight:700; cursor:pointer; font-size:14px;">Cancel</button>
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

/* --- 3. DEDUCT ACTION (PREVENT DOUBLE-SUBMIT) --- */
window.doDeduct = async function(mat, idx) {
    if (isProcessingDeduct) return;

    const btn = document.getElementById('btn_deduct_' + idx);
    const qtyInput = document.getElementById('qty_' + idx);
    const woInput = document.getElementById('wo_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const wo = woInput ? woInput.value.trim() : "";
    
    if (!wo) { alert("❌ Please enter Work Order (WO#)"); return; }
    const user = sessionStorage.getItem('selectedUser');

    isProcessingDeduct = true;
    if (btn) {
        btn.disabled = true;
        btn.innerText = "⏳ Saving...";
        btn.style.opacity = "0.6";
    }

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
    } finally {
        isProcessingDeduct = false;
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Deduct";
            btn.style.opacity = "1";
        }
    }
};

/* --- 4. MODERN TABLE & CARD RENDERER --- */
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
                <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end;">
                    <input type="text" id="wo_${index}" placeholder="WO#" style="width:80px; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:600; outline:none;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" style="width:48px; padding:8px 4px; text-align:center; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700;">
                    <button id="btn_deduct_${index}" onclick="window.doDeduct('${item.Material}', ${index})" style="background:#ef4444; color:white; border:none; padding:8px 14px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; box-shadow:0 4px 10px rgba(239, 68, 68, 0.2);">Deduct</button>
                </div>`;
        } else if (path.includes('return')) {
            actionUI = `
                <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" style="width:48px; padding:8px 4px; text-align:center; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700;">
                    <button onclick="window.addToCart('return','${item.Material}',${index},'${user}','0243')" style="background:#16a34a; color:white; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; box-shadow:0 4px 10px rgba(22, 163, 74, 0.2);">Return</button>
                </div>`;
        } else if (path.includes('transfer')) {
            // สร้าง Dropdown รายชื่อผู้รับ (ตัดชื่อผู้โอนออก)
            const targetOptions = ALL_USERS.filter(u => u !== user).map(u => `<option value="${u}">${u}</option>`).join('');

            actionUI = `
                <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                    <select id="target_user_${index}" style="padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:700; outline:none; background:white;">
                        ${targetOptions}
                    </select>
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" style="width:48px; padding:8px 4px; text-align:center; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700;">
                    <button onclick="
                        const targetUser = document.getElementById('target_user_${index}').value;
                        window.addToCart('transfer', '${item.Material}', ${index}, '${user}', targetUser);
                    " style="background:#eab308; color:white; border:none; padding:8px 14px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; box-shadow:0 4px 10px rgba(234, 179, 8, 0.2);">Transfer</button>
                </div>`;
        } else {
            actionUI = `
                <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" style="width:48px; padding:8px 4px; text-align:center; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700;">
                    <button onclick="window.addToCart('withdraw','${item.Material}',${index},'0243','${user}')" style="background:#003366; color:white; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; box-shadow:0 4px 10px rgba(0, 51, 102, 0.2);">Withdraw</button>
                </div>`;
        }

        return `
        <tr style="background:white; border-bottom:1px solid #f1f5f9;">
            <td style="padding:14px 12px; vertical-align:middle;">
                <div style="font-weight:800; color:#003366; font-size:15px;">${item.Material}</div>
                <div style="font-size:13px; color:#64748b; margin-top:2px; font-weight:500;">${item['Product Name']||'-'}</div>
            </td>
            <td align="center" style="padding:14px 12px; vertical-align:middle;">
                <span style="display:inline-block; padding:4px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:20px; font-weight:800; font-size:15px; color:#0f172a;">${displayQty}</span>
            </td>
            <td align="right" style="padding:14px 12px; vertical-align:middle;">
                ${actionUI}
            </td>
        </tr>`;
    }).join('');

    tbody.innerHTML = rowsHTML || '<tr><td colspan="3" align="center" style="padding:36px; color:#94a3b8; font-weight:600;">📦 No Material Found</td></tr>';
};

/* --- 5. DATA LOADING & SEARCH --- */
window.loadStockData = async function(type) {
    if (window.location.pathname.includes('main.html')) return;

    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center" style="padding:36px; color:#64748b; font-weight:600;">⏳ Loading Stock Data...</td></tr>';

    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { 
            window.allRows = res.data; 
            window.renderTable(res.data); 
        }
    } catch(e) {
        if(tbody) tbody.innerHTML = '<tr><td colspan="3" align="center" style="padding:36px; color:#ef4444; font-weight:600;">❌ Failed to load data.</td></tr>';
    }
};

window.searchStock = function(val, type) {
    window.searchData(val);
};

window.searchData = function(val) {
    const query = (val || '').toLowerCase().trim();
    const filtered = window.allRows.filter(r => 
        String(r.Material || '').toLowerCase().includes(query) || 
        String(r['Product Name']||'').toLowerCase().includes(query)
    );
    window.renderTable(filtered);
};

/* --- 6. INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', () => {
    const name = sessionStorage.getItem('selectedUser');
    
    ['user-display', 'user_display', 'display-user', 'current-user'].forEach(id => {
        const el = document.getElementById(id); 
        if (el && name) el.innerText = name;
    });

    if (!window.location.pathname.includes('index.html')) {
        if (!name) {
            window.location.replace('index.html');
            return;
        }
        if (!window.location.pathname.includes('main.html') && !window.location.pathname.includes('history.html')) {
            window.loadStockData();
        }
    }
    window.updateCartUI();
});
