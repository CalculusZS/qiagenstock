/* ========================================================================== 
   QIAGEN INVENTORY - FINAL VERSION (MULTI-SYNC & CORRECT LOGIC)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzejA7IBIMHmeEvDUoaghhvrh4Mz2ZJD6t4OPEyJliaq73adxajPxNH9vGbRHXUuobt/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = [];

/* ===== 1. CORE LOGIC (Withdraw, Return, Transfer) ===== */
window.addToCart = function(type, mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const prodName = window.allRows[idx]['Product Name'] || "Spare Part";
    const currentUser = sessionStorage.getItem('selectedUser');
    
    let from = "", to = "";

    if (type === 'withdraw') {
        from = "0243";
        to = currentUser;
    } else if (type === 'return') {
        from = currentUser;
        to = "0243";
    } else if (type === 'transfer') {
        // สำหรับ Transfer: ต้นทางคือคนที่เราไปเอาของมา (ในหน้าเว็บต้องระบุได้ แต่พื้นฐานคือ 0243 หรือระบุชื่อเพื่อน)
        // เพื่อให้ง่าย: หน้า Transfer จะดึงของจาก "แหล่งสะสม" เข้าหา "ตัวเรา"
        from = "0243"; 
        to = currentUser;
    }

    window.cart.push({ type, mat, prodName, qty, from, to });
    window.updateCartUI();
    
    const btn = event.target;
    btn.innerText = "Added!";
    btn.style.background = "#ccc";
    setTimeout(() => { 
        btn.innerText = "Add"; 
        btn.style.background = ""; 
    }, 700);
};

/* ===== 2. BASKET UI (แสดงรายการก่อนส่ง) ===== */
window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 
        ? `<button onclick="window.showReviewModal()" style="background:#d97706; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer;">📧 Review & Sync (${window.cart.length})</button>` 
        : '';
};

window.showReviewModal = function() {
    const currentUser = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    
    // สร้างตารางรายการในตะกร้า
    let tableHtml = `<table style="width:100%; font-size:12px; border-collapse:collapse; margin-bottom:15px;">
        <tr style="background:#eee;"><th align="left">Mat</th><th>Qty</th><th>From</th><th>To</th></tr>`;
    
    let emailText = `Hi BO,\n\nPlease process the following inventory update:\n\n`;
    
    window.cart.forEach((item, i) => {
        tableHtml += `<tr style="border-bottom:1px solid #ddd;">
            <td>${item.mat}</td><td align="center">${item.qty}</td><td>${item.from}</td><td>${item.to}</td>
        </tr>`;
        emailText += `- ${item.mat} (${item.prodName}) | Qty: ${item.qty} | From: ${item.from} -> To: ${item.to}\n`;
    });
    tableHtml += `</table>`;
    emailText += `\nBest Regards,\n${currentUser}`;

    const modal = document.createElement('div');
    modal.id = "review-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `
        <div style="background:white; width:100%; max-width:500px; border-radius:15px; padding:20px; max-height:80vh; overflow-y:auto;">
            <h3 style="margin-top:0; color:#003366;">Confirm Transactions</h3>
            ${tableHtml}
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('review-modal').remove()" style="flex:1; padding:12px; background:#eee; border:none; border-radius:8px;">Cancel</button>
                <button id="final-sync-btn" onclick="window.executeSync('${encodeURIComponent(emailText)}')" style="flex:2; padding:12px; background:#003366; color:white; border:none; border-radius:8px; font-weight:bold;">Update Sheet & Open Email</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

/* ===== 3. EXECUTE SYNC & EMAIL ===== */
window.executeSync = async function(emailBody) {
    const btn = document.getElementById('final-sync-btn');
    const currentUser = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    btn.innerText = "Updating Sheet...";
    btn.disabled = true;

    try {
        for (const item of window.cart) {
            // ส่งค่าไปที่ Google Sheet (Action จะตรงกับ handleSync ใน Apps Script)
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.to)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
        }

        // หัวข้อเมลตามสั่ง: Spare parts transfer [User] [Date]
        const subject = `Spare parts transfer ${currentUser} ${dateStr}`;
        const mailtoUrl = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=${encodeURIComponent(subject)}&body=${emailBody}`;
        
        window.location.href = mailtoUrl;
        
        alert("✅ Stock Updated Successfully!");
        window.cart = [];
        document.getElementById('review-modal').remove();
        window.updateCartUI();
        window.loadStockData();
    } catch (e) {
        alert("❌ Sync Failed");
        btn.disabled = false;
    }
};

/* ===== 4. UI & RENDER (คงเดิมแต่ปรับให้สมดุล) ===== */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        const q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let disp = 0, type = "";

        if (path.includes('withdraw')) { disp = q0; type = 'withdraw'; }
        else if (path.includes('return')) { disp = qU; type = 'return'; }
        else if (path.includes('transfer')) { disp = q0; type = 'transfer'; } // โอนจากส่วนกลาง
        else { disp = qU; }

        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        
        let actionBtn = `<button onclick="window.addToCart('${type}','${item.Material}',${index})" style="background:#003366;color:white;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">Add</button>`;
        if (type === 'withdraw' && q0 <= 0) actionBtn = '<b style="color:red">OUT</b>';

        return `<tr>
            <td style="padding:12px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${disp}</b></td>
            <td align="right">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center; padding:5px; border-radius:5px; border:1px solid #ccc;">
                ${actionBtn}
            </td>
        </tr>`;
    }).join('');
};

/* ===== 5. OTHER FUNCTIONS (Deduct, Search, Auth) ===== */
window.handleSetPassword = function() { window.processReset(); };

window.handleLogin = async function() {
    const uInput = document.getElementById('username-input'), pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;
    const userKey = uInput.value.trim().toUpperCase(), passVal = pInput.value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', sheetColumnName);
            if (res.status === 'NEW') window.showForcePasswordChange(userKey); 
            else window.location.replace('main.html');
        } else alert("❌ Login Failed");
    } catch (e) { alert("❌ Connection Error"); }
};

window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Updating...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) { console.error(e); }
};

window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    const displayTags = ['current-user', 'display-user', 'user_display', 'userName'];
    displayTags.forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = user; });
    return true;
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
