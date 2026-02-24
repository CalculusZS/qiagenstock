/* ========================================================================== 
   QIAGEN INVENTORY - GLOBAL CART & TRANSFER LOGIC FIX
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbzejA7IBIMHmeEvDUoaghhvrh4Mz2ZJD6t4OPEyJliaq73adxajPxNH9vGbRHXUuobt/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

// โหลดตะกร้าจาก LocalStorage เพื่อให้ตะกร้าไม่หายเวลาเปลี่ยนหน้า
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];
window.allRows = [];

/* ===== 1. ADD TO CART LOGIC (ปรับตามประเภทหน้า) ===== */
window.addToCart = function(type, mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const prodName = window.allRows[idx]['Product Name'] || "Spare Part";
    const currentUser = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();
    
    let from = "", to = "";

    if (path.includes('withdraw')) {
        from = "0243";
        to = currentUser;
    } else if (path.includes('return')) {
        from = currentUser;
        to = "0243";
    } else if (path.includes('transfer')) {
        // ดึงชื่อเจ้าของอะไหล่จากคอลัมน์ที่แสดงผล (ในหน้า Team Stock)
        from = document.getElementById('owner_' + idx) ? document.getElementById('owner_' + idx).innerText : "0243";
        to = currentUser;
    }

    window.cart.push({ type: type.toUpperCase(), mat, prodName, qty, from, to });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart)); // เซฟลงเครื่อง
    window.updateCartUI();
    
    const btn = event.target;
    btn.innerText = "Added!";
    setTimeout(() => { btn.innerText = "Add"; }, 700);
};

/* ===== 2. GLOBAL CART UI (โชว์ทุกหน้า) ===== */
window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div');
        btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:20px; right:20px; z-index:1000;";
        document.body.appendChild(btn);
    }
    
    if (window.cart.length > 0) {
        btn.innerHTML = `
            <button onclick="window.showReviewModal()" style="background:#f59e0b; color:white; padding:15px 20px; border-radius:50px; border:none; box-shadow:0 4px 15px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:8px;">
                🛒 Basket (${window.cart.length})
            </button>`;
    } else {
        btn.innerHTML = '';
    }
};

window.showReviewModal = function() {
    const currentUser = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    
    let tableHtml = `<div style="max-height:300px; overflow-y:auto;"><table style="width:100%; font-size:12px; border-collapse:collapse; margin-bottom:15px;">
        <tr style="background:#f3f4f6;"><th align="left" style="padding:8px;">Material</th><th>Qty</th><th>From</th><th>To</th><th></th></tr>`;
    
    let emailDetail = "";
    window.cart.forEach((item, i) => {
        tableHtml += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px;">${item.mat}</td><td align="center">${item.qty}</td><td>${item.from}</td><td>${item.to}</td>
            <td><button onclick="window.removeFromCart(${i})" style="color:red; border:none; background:none; cursor:pointer;">✕</button></td>
        </tr>`;
        emailDetail += `- ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.to}\n`;
    });
    tableHtml += `</table></div>`;

    const modal = document.createElement('div');
    modal.id = "review-modal";
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; display:flex; justify-content:center; align-items:center; padding:15px;";
    modal.innerHTML = `
        <div style="background:white; width:100%; max-width:450px; border-radius:15px; padding:20px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
            <h3 style="margin-top:0; color:#003366; border-bottom:2px solid #eee; padding-bottom:10px;">Review & Sync</h3>
            ${tableHtml}
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button onclick="document.getElementById('review-modal').remove()" style="flex:1; padding:12px; background:#f3f4f6; border:none; border-radius:8px; font-weight:bold;">Close</button>
                <button id="final-sync-btn" onclick="window.executeSync()" style="flex:2; padding:12px; background:#003366; color:white; border:none; border-radius:8px; font-weight:bold;">Confirm Sync</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.removeFromCart = function(i) {
    window.cart.splice(i, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    document.getElementById('review-modal').remove();
    if(window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
};

/* ===== 3. EXECUTE SYNC & EMAIL SUBJECT (ตามสั่งข้อ 5) ===== */
window.executeSync = async function() {
    const btn = document.getElementById('final-sync-btn');
    const currentUser = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB');
    
    btn.innerText = "Processing...";
    btn.disabled = true;

    let emailText = `Hi BO,\n\nPlease process the following spare parts update:\n\n`;
    
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type.toLowerCase()}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.to)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
            emailText += `- ${item.mat} | Qty: ${item.qty} | From: ${item.from} -> To: ${item.to}\n`;
        }

        const subject = `Spare parts transfer ${currentUser} ${dateStr}`;
        const mailtoUrl = `mailto:AsiaPacBackOfficeFieldService@qiagen.com?cc=gthfss@qiagen.com&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`;
        
        window.location.href = mailtoUrl;
        
        alert("✅ Stock Updated & Email Prepared!");
        window.cart = [];
        localStorage.removeItem('qiagen_cart');
        document.getElementById('review-modal').remove();
        window.updateCartUI();
        window.loadStockData();
    } catch (e) {
        alert("❌ Sync Error");
        btn.disabled = false;
    }
};

/* ===== 4. TABLE RENDER (Team Stock Support) ===== */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let disp = 0, owner = "0243", type = "withdraw";

        if (path.includes('withdraw')) { 
            disp = item['0243'] || 0; 
        } else if (path.includes('return')) { 
            disp = item[user] || 0; type = "return";
        } else if (path.includes('transfer')) {
            // ค้นหาว่าใครมีของชิ้นนี้บ้าง (นอกจากเราและ 0243)
            let otherOwner = Object.keys(item).find(k => !['Material','Product Name','Instrument','0243',user].includes(k) && item[k] > 0);
            owner = otherOwner || "Others";
            disp = item[owner] || 0; type = "transfer";
        }

        if ((path.includes('return') || path.includes('deduct')) && (item[user]||0) <= 0) return '';
        if (path.includes('transfer') && disp <= 0) return '';

        return `<tr>
            <td style="padding:10px;">
                <b>${item.Material}</b><br>
                <small>${item['Product Name']}</small>
                ${path.includes('transfer') ? `<br><span style="color:blue; font-size:10px;">Owner: <span id="owner_${index}">${owner}</span></span>` : ''}
            </td>
            <td align="center"><b>${disp}</b></td>
            <td align="right">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:35px; text-align:center;">
                <button onclick="window.addToCart('${type}','${item.Material}',${index})" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Add</button>
            </td>
        </tr>`;
    }).join('');
};

/* ===== 5. MISC (Search, Auth, Password) ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) {}
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
    window.updateCartUI(); // อัปเดตตะกร้าทุกครั้งที่เช็ค Auth
    return true;
};

window.logout = () => { sessionStorage.clear(); localStorage.removeItem('qiagen_cart'); window.location.replace('index.html'); };
window.handleSetPassword = function() { window.processReset(); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
