/* ========================================================================== 
   QIAGEN INVENTORY - FRONTEND (MATCHES YOUR CSS TABLE STRUCTURE)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbyn-fbvrwSi7Fe1_h1goTInHcSeqK8Ydc6UuMI3wXeqeNxsuAAIZotphtx6NrhlKdSv/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];
let isGlobalSyncing = false; // Global Lock Flag

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
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:24px;text-align:center;width:100%;max-width:340px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);">
            <h3 style="margin-top:0;color:#003366;">Set New Password</h3>
            <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:14px;margin-bottom:10px;border:1.5px solid #cbd5e1;border-radius:12px;outline:none;">
            <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:14px;margin-bottom:20px;border:1.5px solid #cbd5e1;border-radius:12px;outline:none;">
            <button onclick="window.processReset('${u}')" style="width:100%;padding:16px;background:linear-gradient(135deg,#f97316,#ea580c);color:white;border:none;border-radius:12px;font-weight:bold;cursor:pointer;">Update & Activate</button>
        </div>`;
    document.body.appendChild(div);
};

window.processReset = async function(u) {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) { alert("❌ Password Does Not Match!"); return; }
    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
        if (res.success) { alert("✅ Activated Successfully!"); window.location.replace('main.html'); }
    } catch (e) { alert("❌ Error resetting password"); }
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
        alert(`❌ Stock Insufficient!\nMaterial: ${mat}\nAvailable: ${availableStock}\nAlready in cart: ${existingIndex > -1 ? window.cart[existingIndex].qty : 0}\nAttempted: ${totalInCart}`);
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
        `<button onclick="window.showReviewModal()" style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:white; padding:14px 24px; border-radius:50px; border:none; font-weight:bold; font-size:15px; box-shadow: 0 10px 25px -5px rgba(2,132,199,0.5); cursor:pointer; display:flex; align-items:center; gap:8px; transition:transform 0.2s;">
            🛒 Review Cart (${window.cart.length})
         </button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `
        <div style="padding:14px; background:#f8fafc; border-radius:12px; margin-bottom:10px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1;">
                <div style="font-size:16px; font-weight:800; color:#003366;">${i.mat}</div>
                <div style="font-size:13px; color:#475569; margin:2px 0;">${i.name}</div>
                <div style="font-size:12px; font-weight:700; color:#0ea5e9;">Qty: ${i.qty} | ${i.from} → ${i.target}</div>
            </div>
            <button onclick="window.removeFromCart(${idx})" style="background:#fee2e2; color:#ef4444; border:none; padding:8px 12px; border-radius:10px; font-weight:bold; cursor:pointer;">✕</button>
        </div>`).join('');

    const div = document.createElement('div'); 
    div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.75); backdrop-filter:blur(4px); z-index:10000; display:flex; justify-content:center; align-items:center; padding:15px;";
    div.innerHTML = `<div style="background:white; width:100%; max-width:440px; border-radius:24px; padding:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <h3 style="margin-top:0; border-bottom:2px solid #f1f5f9; padding-bottom:12px; color:#0f172a; font-size:1.2rem;">🛒 Confirm Cart Items</h3>
            <div style="max-height:360px; overflow-y:auto; padding-right:4px;">${html || '<div style="text-align:center; padding:30px; color:#94a3b8;">Cart is empty</div>'}</div>
            ${window.cart.length > 0 ? `<button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:16px; background:linear-gradient(135deg, #0ea5e9, #0284c7); color:white; border:none; border-radius:14px; margin-top:16px; font-weight:bold; font-size:1rem; cursor:pointer; box-shadow:0 4px 12px rgba(14,165,233,0.3);">Confirm & Submit Order</button>` : ''}
            <button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; padding:12px; border:none; background:none; color:#64748b; font-weight:600; cursor:pointer;">Cancel</button>
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

/* --- 3. SYNC WITH LOCK PROTECTION --- */
window.confirmSendAndSync = async function() {
    if (isGlobalSyncing) return;
    
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    const now = new Date();
    const today = now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
    const onlySilentItems = window.cart.every(item => String(item.mat) === "9026466");

    isGlobalSyncing = true;
    if (btn) {
        btn.innerText = "⏳ Processing Sync..."; 
        btn.disabled = true;
        btn.style.opacity = "0.7";
    }

    let subjectText = `Spare parts transfer ${user} ${today}`;
    let bodyText = `Hi BO,\n\nPlease transfer the following spare parts.\n\n`;
    let hasEmailContent = false;

    try {
        for (const item of window.cart) {
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
            
            if (String(item.mat) !== "9026466") {
                bodyText += `• ${item.mat} | ${item.name}\n  Qty: ${item.qty} (${item.from} -> ${item.target})\n\n`;
                hasEmailContent = true;
            }
        }

        window.cart = []; 
        localStorage.removeItem('qiagen_cart');

        if (onlySilentItems || !hasEmailContent) {
            alert("✅ Sync Completed Successfully!");
            window.location.reload();
        } else {
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
            setTimeout(() => window.location.reload(), 2500);
        }
    } catch (e) { 
        alert("❌ Sync Error. Please check connection."); 
        isGlobalSyncing = false;
        if (btn) {
            btn.disabled = false; 
            btn.innerText = "Confirm & Submit Order";
            btn.style.opacity = "1";
        }
    }
};

/* --- 4. DEDUCT WITH DOUBLE-CLICK PROTECTION --- */
window.doDeduct = async function(mat, idx, btnElement) {
    if (isGlobalSyncing) return;
    
    const qtyInput = document.getElementById('qty_' + idx);
    const woInput = document.getElementById('wo_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const wo = woInput ? woInput.value.trim() : "";
    
    if (!wo) { alert("❌ Please enter Work Order (WO#)"); return; }

    const user = sessionStorage.getItem('selectedUser');

    isGlobalSyncing = true;
    let origText = "";
    if (btnElement) {
        origText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = "⏳ Deducting...";
        btnElement.style.opacity = "0.7";
        btnElement.style.cursor = "not-allowed";
    }

    try {
        const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
        
        if (res && res.success) { 
            alert("✅ Deducted Successfully!"); 
            window.loadStockData(); 
        } else {
            alert("❌ Deduct Failed: " + (res.msg || "Unknown Error"));
        }
    } catch(e) { 
        alert("❌ Connection/Server Error"); 
    } finally {
        isGlobalSyncing = false;
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = origText;
            btnElement.style.opacity = "1";
            btnElement.style.cursor = "pointer";
        }
    }
};

/* --- 5. RENDER ENGINE (MATCHES TABLE CSS) --- */
window.renderTeamTable = function(data) {
    const container = document.getElementById('team-data-container') || document.getElementById('data');
    if (!container || !window.location.pathname.includes('team-stock')) return;

    const currentUser = sessionStorage.getItem('selectedUser');
    const members = Object.values(USER_MAP);
    let rowsHTML = '';
    
    data.forEach((item, idx) => {
        members.forEach(m => {
            const q = Number(item[m] || 0);
            if (q > 0) {
                const isMe = (m === currentUser);
                rowsHTML += `
                <tr>
                    <td>
                        <div class="p-info" style="display:flex; align-items:center; gap:12px;">
                            <span style="background:${isMe ? '#f1f5f9':'#f0fdf4'}; color:${isMe ? '#64748b':'#166534'}; font-size:0.75rem; font-weight:800; padding:4px 8px; border-radius:6px; border:1px solid ${isMe ? '#cbd5e1':'#bbf7d0'};">
                                ${isMe ? m + ' (Me)' : m}
                            </span>
                            <div>
                                <div class="p-mat" style="font-weight:800; color:#003366;">${item.Material}</div>
                                <div class="p-name" style="font-size:0.85rem; color:#64748b;">${item['Product Name']||'-'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="text-align:center;">
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:4px 8px; border-radius:8px; display:inline-block;">
                            <span style="font-size:0.65rem; color:#64748b; font-weight:800; display:block;">QTY</span>
                            <span style="font-size:1.1rem; font-weight:800; color:#0f172a;">${q}</span>
                        </div>
                    </td>
                    <td>
                        <div class="action-cell">
                        ${isMe ? 
                            `<button disabled class="btn-sm" style="background:#f1f5f9; color:#94a3b8; cursor:not-allowed;">Transfer</button>` :
                            `<input type="number" id="t_qty_${idx}_${m}" value="1" min="1" max="${q}" class="qty-inline">
                             <button onclick="window.addToCart('transfer','${item.Material}',${idx},'${m}','${currentUser}')" class="btn-sm" style="background:#f97316; color:white;">Transfer</button>`
                        }
                        </div>
                    </td>
                </tr>`;
            }
        });
    });

    container.innerHTML = rowsHTML ? 
        `<table>
            <thead>
                <tr>
                    <th style="text-align:left;">DETAILS</th>
                    <th style="text-align:center;">STOCK</th>
                    <th style="text-align:right;">ACTION</th>
                </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
        </table>` : 
        '<div style="text-align:center; padding:50px; background:white; border-radius:16px; color:#94a3b8;">No Team Stock Available</div>';
};

window.renderTable = function(data) {
    const container = document.getElementById('data'); 
    if (!container || window.location.pathname.includes('team-stock')) return;

    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();

    let rowsHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if (!path.includes('showall') && displayQty <= 0) return '';
        
        let actionUI = "";
        if (path.includes('showall')) {
            actionUI = displayQty > 0 ? 
                `<span style="background:#dcfce7; color:#15803d; padding:6px 14px; border-radius:20px; font-weight:800; font-size:0.85rem; border:1px solid #bbf7d0;">In Stock</span>` :
                `<span style="background:#fee2e2; color:#b91c1c; padding:6px 14px; border-radius:20px; font-weight:800; font-size:0.85rem; border:1px solid #fca5a5;">Out of Stock</span>`;
        } else if (path.includes('deduct')) {
            actionUI = `
                <div class="action-cell">
                    <input type="text" id="wo_${index}" placeholder="WO#" style="width:80px; padding:6px; border:2px solid #e2e8f0; border-radius:8px; font-weight:bold; outline:none;">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" class="qty-inline">
                    <button onclick="window.doDeduct('${item.Material}', ${index}, this)" class="btn-sm" style="background:var(--danger); color:white;">Deduct</button>
                </div>`;
        } else {
            const isW = path.includes('withdraw');
            const btnClass = isW ? 'btn-wd' : 'btn-rt';
            actionUI = `
                <div class="action-cell">
                    <input type="number" id="qty_${index}" value="1" min="1" max="${displayQty}" class="qty-inline">
                    <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" class="btn-sm ${btnClass}">${isW?'Withdraw':'Return'}</button>
                </div>`;
        }

        return `
        <tr>
            <!-- DETAILS -->
            <td>
                <div class="p-info" style="display:flex; flex-direction:column; gap:2px;">
                    <div class="p-mat" style="font-size:1.1rem; font-weight:800; color:#003366;">${item.Material}</div>
                    <div class="p-name" style="font-size:0.85rem; color:#475569; font-weight:600;">${item['Product Name']||'-'}</div>
                </div>
            </td>
            
            <!-- STOCK (QTY Box) -->
            <td style="text-align:center;">
                <div style="background:#f8fafc; border:1.5px solid #e2e8f0; padding:6px 0; border-radius:12px; width:70px; margin:0 auto;">
                    <span style="font-size:0.65rem; color:#64748b; font-weight:800; text-transform:uppercase; display:block;">QTY</span>
                    <span style="font-size:1.25rem; font-weight:800; color:#0f172a; line-height:1.1;">${displayQty}</span>
                </div>
            </td>
            
            <!-- ACTION -->
            <td style="text-align:right;">
                ${actionUI}
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = rowsHTML ? 
        `<table>
            <thead>
                <tr>
                    <th style="text-align:left;">DETAILS</th>
                    <th style="text-align:center;">STOCK</th>
                    <th style="text-align:right;">ACTION</th>
                </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
        </table>` : 
        '<div style="text-align:center; padding:50px; background:white; border-radius:16px; color:#94a3b8;">📦 No Material Found</div>';
};

/* --- 6. DATA LOADING & SEARCH --- */
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
    const query = val.toLowerCase().trim();
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
