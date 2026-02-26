/* ========================================================================== 
   QIAGEN INVENTORY - ULTIMATE MASTER (NO FEATURES REMOVED)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbzG1H23irpdroTLl5VwRUpbjmXxzotzvy1v6IcoElH5u6yBYe2vo9DaHCsRL5jKmKWU/exec";
const MASTER_PASS = "Service";

window.allRows = [];
window.cart = JSON.parse(localStorage.getItem('qiagen_cart')) || [];

/* --- 1. ระบบ LOGIN (สำหรับหน้า index.html) --- */
window.handleLogin = async function() {
    const userSelect = document.getElementById('user-select');
    const passInput = document.getElementById('password-input');
    if (!userSelect || !passInput) return;

    const selectedUser = userSelect.value;
    const password = passInput.value;

    if (!selectedUser) { alert("กรุณาเลือกชื่อผู้ใช้งาน"); return; }
    if (password === MASTER_PASS) {
        sessionStorage.setItem('selectedUser', selectedUser);
        window.location.href = 'main.html';
    } else {
        alert("❌ รหัสผ่านไม่ถูกต้อง");
    }
};

/* --- 2. การเรนเดอร์ข้อมูล (จัดการสีสต็อกในหน้า ShowAll) --- */
window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    
    tbody.innerHTML = data.map((item, index) => {
        let q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0);
        let displayQty = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        
        // ถ้าไม่ใช่หน้า showall และไม่มีของ ไม่ต้องโชว์แถว
        if (!path.includes('showall') && displayQty <= 0) return '';

        let actionUI = "";
        if (path.includes('showall')) {
            // โชว์ In stock/Out of stock ตามที่พี่ต้องการในหน้า ShowAll
            const statusText = displayQty > 0 ? "In stock" : "Out of stock";
            const statusColor = displayQty > 0 ? "#16a34a" : "#dc2626";
            actionUI = `<b style="color:${statusColor}; font-size:14px;">${statusText}</b>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end; align-items:center;">
                <input type="text" id="wo_${index}" placeholder="WO#" style="width:65px; padding:6px; border:1px solid #ddd; border-radius:6px;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #ddd; border-radius:6px;">
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#dc2626; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold;">Used</button>
            </div>`;
        } else {
            const isW = path.includes('withdraw');
            actionUI = `<div style="display:flex; gap:5px; justify-content: flex-end; align-items:center;">
                <input type="number" id="qty_${index}" value="1" style="width:40px; padding:6px; text-align:center; border:1px solid #ddd; border-radius:6px;">
                <button onclick="window.addToCart('${isW?'withdraw':'return'}','${item.Material}',${index},'${isW?'0243':user}','${isW?user:'0243'}')" style="background:${isW?'#003366':'#16a34a'}; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold;">Add</button>
            </div>`;
        }

        return `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:15px 10px;">
                <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                <div style="font-size:11px; color:#64748b;">${item['Product Name'] || ''}</div>
            </td>
            <td align="center" style="font-size:18px; font-weight:bold;">${displayQty}</td>
            <td align="right" style="padding-right:15px;">${actionUI}</td>
        </tr>`;
    }).join('');
};

/* --- 3. ระบบค้นหา (สำหรับทุกหน้าที่มี oninput="searchStock") --- */
window.searchStock = function(val) {
    const query = val.toUpperCase();
    const filtered = window.allRows.filter(i => 
        String(i.Material).toUpperCase().includes(query) || 
        String(i['Product Name']).toUpperCase().includes(query)
    );
    window.renderTable(filtered);
};

/* --- 4. ทีมสต็อก (สำหรับหน้า team-stock.html) --- */
window.renderTeamTable = function(data) {
    const container = document.getElementById('team-data-container') || document.getElementById('stock-list'); 
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser');
    const members = ['Kitti','Tatchai','Parinyachat','Phurilap','Penporn','Phuriwat'];
    let html = '';
    data.forEach((item, idx) => {
        members.forEach(m => {
            const q = Number(item[m] || 0);
            if (m !== currentUser && q > 0) {
                html += `<div class="card" style="background:white; margin:12px; padding:15px; border-radius:15px; display:flex; justify-content:space-between; align-items:center; border-left:5px solid #f97316;">
                    <div style="flex:1;"><b>${item.Material}</b><br><small>${item['Product Name'] || ''}</small><div style="font-size:12px; color:#f97316; margin-top:5px;">User: ${m}</div></div>
                    <div style="text-align:right;"><div style="font-size:20px; font-weight:bold;">${q}</div><div style="display:flex; gap:5px; margin-top:5px;"><input type="number" id="t_qty_${idx}_${m}" value="1" style="width:40px; border:1px solid #ddd; text-align:center;"><button onclick="window.addToCart('transfer','${item.Material}',${idx},'${m}','${currentUser}')" style="background:#f97316; color:white; border:none; padding:8px 12px; border-radius:8px;">Add</button></div></div></div>`;
            }
        });
    });
    container.innerHTML = html || '<p style="text-align:center; padding:50px;">No Stock in Team</p>';
};

/* --- 5. ระบบตะกร้า และ SYNC ไป Outlook --- */
window.addToCart = function(type, mat, idx, from, target) {
    const qID = type === 'transfer' ? `t_qty_${idx}_${from}` : `qty_${idx}`;
    const qInput = document.getElementById(qID);
    const q = qInput ? qInput.value : 1;
    const itm = window.allRows.find(i => String(i.Material) === String(mat));
    window.cart.push({ type, mat, name: itm ? itm['Product Name'] : '', qty: q, from, target });
    localStorage.setItem('qiagen_cart', JSON.stringify(window.cart));
    window.updateCartUI();
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) { btn = document.createElement('div'); btn.id = 'cart-floating-btn'; btn.style = "position:fixed;bottom:25px;right:25px;z-index:1000;"; document.body.appendChild(btn); }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.showReviewModal()" style="background:#0078d4;color:white;padding:15px 25px;border-radius:50px;border:none;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);">Cart (${window.cart.length})</button>` : '';
};

window.showReviewModal = function() {
    let html = window.cart.map((i, idx) => `<div style="padding:10px 0; border-bottom:1px solid #eee;"><b>${i.mat} (x${i.qty})</b><br><small>${i.from} → ${i.target}</small></div>`).join('');
    const div = document.createElement('div'); div.id = "review-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;padding:15px;";
    div.innerHTML = `<div style="background:white;width:100%;max-width:400px;border-radius:20px;padding:20px;"><h3>🛒 Review Summary</h3><div style="max-height:300px; overflow-y:auto;">${html}</div>
        <button id="sync-btn" onclick="window.confirmSendAndSync()" style="width:100%;padding:15px;background:#0078d4;color:white;border:none;border-radius:12px;font-weight:bold;margin-top:15px;">Open Outlook</button>
        <button onclick="document.getElementById('review-modal').remove()" style="width:100%;margin-top:10px;border:none;background:none;color:gray;">Cancel</button></div>`;
    document.body.appendChild(div);
};

window.confirmSendAndSync = async function() {
    const btn = document.getElementById('sync-btn');
    const user = sessionStorage.getItem('selectedUser');
    btn.innerText = "Syncing..."; btn.disabled = true;
    let bodyText = `Hi BO,\n\nPlease transfer parts for: ${user}\n\n`;
    try {
        for (const item of window.cart) {
            await fetch(`${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`);
            bodyText += `- ${item.mat} | Qty: ${item.qty} (${item.from} -> ${item.target})\n`;
        }
        window.location.href = `ms-outlook://compose?to=AsiaPacBackOfficeFieldService@qiagen.com&subject=Spare parts transfer ${user}&body=${encodeURIComponent(bodyText)}`;
        window.cart = []; localStorage.removeItem('qiagen_cart');
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { alert("Error Syncing"); btn.disabled = false; }
};

/* --- 6. ฟังก์ชันพื้นฐานอื่นๆ (ห้ามตัด) --- */
window.loadStockData = async function() {
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { 
        window.allRows = res.data; 
        window.renderTable(res.data); 
        window.renderTeamTable(res.data);
    }
};

window.displayUserInfo = function() {
    const fullName = sessionStorage.getItem('selectedUser');
    if (!fullName) return;
    const possibleIDs = ['user-display', 'user_display', 'display-user', 'current-user'];
    possibleIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = (id === 'user_display') ? fullName : `Logged in as: ${fullName}`;
    });
};

window.doDeduct = async function(mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const wo = document.getElementById('wo_' + idx).value.trim();
    if (!wo) return alert("❌ กรุณาใส่เลข WO#");
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ ตัดสต็อกสำเร็จ"); window.loadStockData(); }
    } catch(e) { alert("❌ เกิดข้อผิดพลาดในการ Sync"); }
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
