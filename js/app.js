/* ========================================================================== 
   QIAGEN INVENTORY - V12 (STABLE LOGIN & GLOBAL CART & TRANSFER LOGIC)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzejA7IBIMHmeEvDUoaghhvrh4Mz2ZJD6t4OPEyJliaq73adxajPxNH9vGbRHXUuobt/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

// Load cart from LocalStorage to keep items across pages
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];
window.allRows = [];

/* ===== [SECTION 1] AUTH & LOGIN ===== */

async function handleLogin() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', sheetColumnName);
            
            if (res.status === 'NEW') {
                showForcePasswordChange(userKey);
            } else {
                window.location.replace('main.html');
            }
        } else {
            alert("❌ Login Failed: Invalid ID or Password");
        }
    } catch (e) {
        alert("❌ Connection Error. Please try again.");
    }
}

// Ensure functions are globally accessible
window.handleLogin = handleLogin;
window.handleSetPassword = function() { processReset(); };

function showForcePasswordChange(userKey) {
    const div = document.createElement('div');
    div.id = "force-pass-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:320px;box-sizing:border-box;">
        <h3 style="color:#003366;margin-top:0;">Set New Password</h3>
        <p style="font-size:13px;color:#666;">Please set at least 4 digits password</p>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <button id="save-btn" onclick="window.handleSetPassword()" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Update & Activate</button>
    </div>`;
    document.body.appendChild(div);
}

async function processReset() {
    const u = sessionStorage.getItem('userKey');
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2 || p1.length < 4) return alert("❌ Password mismatch");
    
    const btn = document.getElementById('save-btn');
    btn.innerText = "Processing..."; btn.disabled = true;

    try {
        const url = `${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ Activated! Please login again.");
            sessionStorage.clear(); window.location.reload(); 
        } else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Server Error"); }
}

/* ===== [SECTION 2] GLOBAL CART & TRANSFER LOGIC ===== */

window.addToCart = function(type, mat, idx) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const prodName = window.allRows[idx]['Product Name'] || "Spare Part";
    const currentUser = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();
    
    let from = "0243", to = currentUser;

    if (path.includes('return')) {
        from = currentUser; to = "0243";
    } else if (path.includes('transfer')) {
        const ownerEl = document.getElementById('owner_' + idx);
        from = ownerEl ? ownerEl.innerText : "0243";
    }

    window.cart.push({ type: type.toUpperCase(), mat, prodName, qty, from, to });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
    
    const btn = event.target;
    btn.innerText = "Added!";
    setTimeout(() => { btn.innerText = "Add"; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:20px; right:20px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#f59e0b; color:white; padding:15px 20px; border-radius:50px; border:none; box-shadow:0 4px 15px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer;">🛒 Basket (${window.cart.length})</button>` : '';
};

/* ===== [SECTION 3] SYNC & EMAIL ===== */

window.showReviewModal = function() {
    let tableHtml = `<div style="max-height:250px; overflow-y:auto;"><table style="width:100%; font-size:12px; border-collapse:collapse; margin-bottom:15px;">
        <tr style="background:#f3f4f6;"><th align="left">Material</th><th>Qty</th><th>From</th><th>To</th><th></th></tr>`;
    
    window.cart.forEach((item, i) => {
        tableHtml += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:5px;">${item.mat}</td><td align="center">${item.qty}</td><td>${item.from}</td><td>${item.to}</td>
            <td><button onclick="window.removeFromCart(${i})" style="color:red; border:none; background:none; cursor:pointer;">✕</button></td>
        </tr>`;
    });
    tableHtml += `</table></div>`;

    const modal = document.createElement('div');
    modal.id = "review-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `
        <div style="background:white; width:100%; max-width:450px; border-radius:15px; padding:20px;">
            <h3 style="margin-top:0;">Confirm Transactions</h3>
            ${tableHtml}
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('review-modal').remove()" style="flex:1; padding:10px; background:#f3f4f6; border:none; border-radius:8px;">Close</button>
                <button id="final-sync-btn" onclick="window.executeSync()" style="flex:2; padding:10px; background:#003366; color:white; border:none; border-radius:8px; font-weight:bold;">Sync & Send Email</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.executeSync = async function() {
    const btn = document.getElementById('final-sync-btn');
    const currentUser = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    btn.disabled = true;

    let emailText = `Hi BO,\nPlease process the following spare parts update:\n\n`;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type.toLowerCase()}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.to)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
            emailText += `- ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.to}\n`;
        }
        const subject = `Spare parts transfer ${currentUser} ${dateStr}`;
        window.location.href = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`;
        
        alert("✅ Stock Updated!");
        window.cart = [];
        localStorage.removeItem('qiagen_cart');
        window.location.reload();
    } catch (e) { alert("❌ Sync Failed"); btn.disabled = false; }
};

window.removeFromCart = function(i) {
    window.cart.splice(i, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    document.getElementById('review-modal').remove();
    if(window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
};

/* ===== [SECTION 4] DATA RENDERING ===== */

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let disp = 0, owner = "0243", type = "withdraw";
        if (path.includes('withdraw')) disp = item['0243'] || 0;
        else if (path.includes('return')) { disp = item[user] || 0; type = "return"; }
        else if (path.includes('transfer')) {
            let otherOwner = Object.keys(item).find(k => !['Material','Product Name','Instrument','0243',user].includes(k) && item[k] > 0);
            owner = otherOwner || "Others"; disp = item[owner] || 0; type = "transfer";
        }
        if ((path.includes('return') || path.includes('deduct')) && (item[user]||0) <= 0) return '';
        if (path.includes('transfer') && disp <= 0) return '';

        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small>${path.includes('transfer')?`<br><small style=\"color:blue\">Owner: <span id=\"owner_${index}\">${owner}</span></small>`:''}</td>
        <td align="center"><b>${disp}</b></td><td align="right"><input type="number" id="qty_${index}" value="1" style="width:35px;text-align:center;"><button onclick="window.addToCart('${type}','${item.Material}',${index})" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Add</button></td></tr>`;
    }).join('');
};

window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Data...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) {}
};

/* ===== [SECTION 5] INITIALIZE ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    const displayTags = ['current-user', 'display-user', 'user_display', 'userName'];
    displayTags.forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = user; });
    window.updateCartUI();
    return true;
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
