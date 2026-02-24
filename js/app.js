/* ========================================================================== 
   QIAGEN INVENTORY - FINAL STABLE (FIXED STATUS & PASSWORD)
   ========================================================================== */

// 1. ใช้ API URL ล่าสุดที่พี่ส่งมา
const API = "https://script.google.com/macros/s/AKfycbzejA7IBIMHmeEvDUoaghhvrh4Mz2ZJD6t4OPEyJliaq73adxajPxNH9vGbRHXUuobt/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};

window.allRows = [];
window.cart = [];

/* ===== FIX: ดักจับ Error ReferenceError ที่พี่เจอในรูป ===== */
window.handleSetPassword = function() {
    window.processReset();
};

/* ===== 1. AUTH & LOGIN ===== */
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
            
            // ถ้า Status เป็น NEW ให้โชว์หน้ากากเปลี่ยนรหัส
            if (res.status === 'NEW') window.showForcePasswordChange(userKey); 
            else window.location.replace('main.html');
        } else alert("❌ Login Failed: Check ID/Password");
    } catch (e) { alert("❌ API Connection Error"); }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.id = "force-pass-modal";
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;padding:20px;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:100%;max-width:320px;box-sizing:border-box;">
        <h3 style="color:#003366;margin-top:0;">Set New Password</h3>
        <p style="font-size:13px;color:#666;">กรุณาตั้งรหัสผ่านใหม่เพื่อเปิดใช้งานระบบ (4 หลักขึ้นไป)</p>
        <input type="password" id="p1" placeholder="New Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <input type="password" id="p2" placeholder="Confirm Password" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;">
        <button id="save-btn" onclick="window.handleSetPassword()" style="width:100%;padding:14px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Update & Activate</button>
    </div>`;
    document.body.appendChild(div);
};

window.processReset = async function() {
    const u = sessionStorage.getItem('userKey');
    const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2 || p1.length < 4) return alert("❌ Password mismatch or too short (min 4)");
    
    const btn = document.getElementById('save-btn');
    btn.innerText = "กำลังเปิดใช้งาน..."; btn.disabled = true;

    try {
        // ส่ง 'newPass' เพื่อให้ Script หลังบ้านเปลี่ยน Status เป็น ACTIVE
        const url = `${API}?action=setpassword&user=${encodeURIComponent(u)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ เปิดใช้งานสำเร็จ! สถานะเป็น ACTIVE แล้ว กรุณา Login ใหม่อีกครั้ง");
            sessionStorage.clear(); window.location.reload(); 
        } else alert("❌ " + res.msg);
    } catch (e) { alert("❌ Server Error"); } finally { btn.disabled = false; btn.innerText = "Update & Activate"; }
};

/* ===== 2. STOCK OPERATIONS (เบิก/คืน/ตัด/โอน) ===== */
window.loadStockData = async function() {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Updating Data...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) { window.allRows = res.data; window.renderTable(res.data); }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data) {
    const tbody = document.getElementById('data'); if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser'), path = window.location.pathname.toLowerCase();
    tbody.innerHTML = data.map((item, index) => {
        const q0 = Number(item['0243'] || 0), qU = Number(item[user] || 0), disp = (path.includes('withdraw') || path.includes('showall')) ? q0 : qU;
        if ((path.includes('return') || path.includes('deduct')) && qU <= 0) return '';
        
        let btn = "";
        if (path.includes('withdraw')) {
            btn = q0 > 0 ? `<button onclick="window.addToCart('withdraw','${item.Material}',${index})" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Add</button>` : '<b style="color:red">OUT</b>';
        } else if (path.includes('return')) {
            btn = `<button onclick="window.addToCart('return','${item.Material}',${index})" style="background:#16a34a;color:white;border:none;padding:8px;border-radius:8px;">Add</button>`;
        } else if (path.includes('deduct')) {
            btn = `<div style="display:flex;flex-direction:column;gap:4px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:70px;padding:4px;"><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444;color:white;border:none;padding:6px;border-radius:5px;">Deduct</button></div>`;
        } else {
            btn = `<button onclick="window.addToCart('transfer','${item.Material}',${index})" style="background:#0078d4;color:white;border:none;padding:8px;border-radius:8px;">Add</button>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td><td align="center"><b>${disp}</b></td><td align="right"><input type="number" id="qty_${index}" value="1" style="width:35px;text-align:center;"> ${btn}</td></tr>`;
    }).join('');
};

/* ===== 3. CART SYSTEM (ออปชั่นครบ) ===== */
window.addToCart = function(type, mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const user = sessionStorage.getItem('selectedUser');
    let fFrom = (type === 'withdraw' ? '0243' : user), fTo = (type === 'withdraw' || type === 'transfer') ? user : '0243';
    window.cart.push({ type, mat, qty, from: fFrom, target: fTo });
    window.updateCartUI();
    const btn = event.target; btn.innerText = "Added!"; btn.disabled = true;
    setTimeout(() => { btn.innerText = "Add"; btn.disabled = false; }, 700);
};

window.updateCartUI = function() {
    let btn = document.getElementById('cart-floating-btn');
    if (!btn) {
        btn = document.createElement('div'); btn.id = 'cart-floating-btn';
        btn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(btn);
    }
    btn.innerHTML = window.cart.length > 0 ? `<button onclick="window.confirmSendAndSync()" style="background:#0078d4; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold;">📧 Confirm & Sync (${window.cart.length})</button>` : '';
};

window.confirmSendAndSync = async function() {
    if (!confirm("Confirm to Sync Stock & Open Email?")) return;
    try {
        for (const item of window.cart) {
            const url = `${API}?action=${item.type}&from=${encodeURIComponent(item.from)}&user=${encodeURIComponent(item.target)}&material=${encodeURIComponent(item.mat)}&qty=${item.qty}&pass=${MASTER_PASS}`;
            await fetch(url, { mode: 'no-cors' }); 
        }
        alert("✅ Stock Updated! Please send the email next.");
        window.cart = []; window.updateCartUI(); window.loadStockData();
    } catch (e) { alert("❌ Sync Failed"); }
};

/* ===== 4. HISTORY & SEARCH ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value, qty = document.getElementById('qty_' + idx).value, user = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Deducted"); window.loadStockData(); }
};

window.searchStock = (q) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered);
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.reverse().map(r => `
                <div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                    <b>${new Date(r[0]).toLocaleDateString()}</b> | ${r[1]}<br>
                    Type: <b style="color:#0078d4">${r[4]}</b> | From: ${r[6]} | To: ${r[7]} | Qty: ${r[5]}
                </div>`).join('');
        }
    } catch(e) {}
};

/* ===== 5. UI UTILS ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) { window.location.replace('index.html'); return false; }
    ['current-user', 'display-user', 'user_display', 'userName'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = user; });
    return true;
};
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

window.checkAuth();
if (!window.location.pathname.includes('index.html')) {
    window.loadStockData();
    if (window.location.pathname.includes('history')) window.loadHistory();
}
