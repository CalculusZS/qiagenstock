/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (FINAL FIX FOR BACKEND V9)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. SEARCH SYSTEM (แก้ไขให้ค้นหาได้ทุกหน้า) --- */
window.filterData = function() {
    const searchInput = document.getElementById('search-input') || document.getElementById('search');
    if (!searchInput) return;
    const val = searchInput.value.toUpperCase();
    
    // กรองข้อมูลจาก Material และ Product Name
    const filtered = window.allRows.filter(item => {
        const mat = (item.Material || '').toString().toUpperCase();
        const name = (item['Product Name'] || '').toString().toUpperCase();
        return mat.includes(val) || name.includes(val);
    });
    window.renderTable(filtered);
};

/* --- 2. SYNC & OUTLOOK (บังคับเปิด Outlook เท่านั้น) --- */
window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
    
    btn.innerText = "Syncing & Opening Outlook...";
    btn.disabled = true;

    let emailBody = `Hi BO,\n\nPlease transfer the below spare parts for user: ${user}\n\n`;
    
    try {
        // วนลูปส่งค่าไปที่ Google Sheets (Backend)
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url).then(r => r.json());
            emailBody += `- ${item.mat} | ${item.name} | Qty: ${item.qty} (From: ${item.from} -> To: ${item.target})\n`;
        }

        // ล้างข้อมูลตะกร้าหลัง Sync สำเร็จ
        window.cart = [];
        localStorage.removeItem('qiagen_cart');

        // บังคับเปิด Outlook ทันที
        const to = "AsiaPacBackOfficeFieldService@qiagen.com";
        const cc = "gthfss@qiagen.com";
        const subject = encodeURIComponent(`Spare parts transfer ${user} ${dateStr}`);
        const body = encodeURIComponent(emailBody);
        
        // ใช้ mailto: เพื่อดีดเข้าแอป Outlook ในมือถือ
        window.location.replace(`mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`);

        alert("✅ Sync Success! Switching to Outlook...");
        setTimeout(() => { window.location.reload(); }, 1500);

    } catch (e) {
        alert("❌ Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Sync & Open Outlook";
    }
};

/* --- 3. DEDUCT PART (ข้อ 4: USED PART) --- */
window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ Please enter Work Order#");
    
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ Deduct Success!"); 
            window.loadStockData(); 
        } else {
            alert("❌ Failed: " + res.msg);
        }
    } catch(e) { alert("❌ Error connecting to server"); }
};

/* --- 4. RENDER TABLE (จัดการการแสดงผล) --- */
window.renderTable = function(data) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0243 = Number(item['0243'] || 0);
        let qUser = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0243 : qUser;

        if (!path.includes('showall') && displayQty <= 0) return '';

        let actionUI = "";
        if (path.includes('deduct')) {
            actionUI = `<div style="display:flex;gap:5px;justify-content:flex-end;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:70px;padding:5px;border:1px solid #ddd;border-radius:4px;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:40px;text-align:center;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626;color:white;padding:6px;border-radius:4px;border:none;">Deduct</button>
            </div>`;
        } else if (!path.includes('showall')) {
            const isW = path.includes('withdraw');
            const from = isW ? '0243' : user;
            const target = isW ? user : '0243';
            actionUI = `<div style="display:flex;gap:5px;justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" style="width:40px;text-align:center;">
                <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${from}','${target}')" style="background:${isW?'#003366':'#16a34a'};color:white;padding:6px 10px;border-radius:4px;border:none;">Add</button>
            </div>`;
        }

        return `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center"><b>${displayQty}</b></td>
            <td align="right">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* --- 5. UTILS (CART, LOGIN, LOAD) --- */
window.addToCart = function(type, mat, idx, fromUser, targetUser) {
    let qInput = document.getElementById('qty_' + idx) || document.getElementById(`t_qty_${idx}_${fromUser}`);
    const item = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: item['Product Name'], qty: qInput.value, from: fromUser, target: targetUser });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0ea5e9; color:white; padding:15px 25px; border-radius:50px; border:none; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.3);">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = `<div style="max-height:200px; overflow-y:auto; margin:15px 0;">`;
    window.cart.forEach((i, idx) => { 
        html += `<div style="font-size:12px; border-bottom:1px solid #ddd; padding:8px; display:flex; justify-content:space-between; align-items:center;">
            <span><b>${i.mat}</b> (x${i.qty})<br><small>${i.from} → ${i.target}</small></span>
            <button onclick="window.removeFromCart(${idx})" style="color:red; border:none; background:none;">✕</button>
        </div>`; 
    });
    html += `</div>`;
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `<div style="background:white; width:85%; border-radius:20px; padding:20px;"><h3>Review & Sync</h3>${html}<button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%; padding:15px; background:#0ea5e9; color:white; border:none; border-radius:12px; font-weight:bold;">Confirm & Sync</button><button onclick="document.getElementById('review-modal').remove()" style="width:100%; margin-top:10px; border:none; background:none; color:gray;">Cancel</button></div>`;
    document.body.appendChild(div);
};

window.removeFromCart = (idx) => {
    window.cart.splice(idx, 1);
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    document.getElementById('review-modal').remove();
    if (window.cart.length > 0) window.showReviewModal();
    window.updateCartUI();
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
    } catch (e) { alert("❌ Connection Error"); }
};

window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { 
        window.allRows = res.data; 
        window.renderTable(res.data); 
        if(window.renderTeamTable) window.renderTeamTable(res.data); 
    }
};

if (!window.location.pathname.includes('index.html')) {
    if (!sessionStorage.getItem('selectedUser')) window.location.replace('index.html');
    window.loadStockData();
}
window.updateCartUI();
