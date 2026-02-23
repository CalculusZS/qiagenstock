/* ========================================================================== 
   QIAGEN INVENTORY - FIXED REFRESH LOOP + MULTI-ITEM TABLE SUMMARY
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.withdrawCart = []; 
window.allRows = [];

/* ===== 1. AUTH & LOGIN (FIXED REFRESH LOOP) ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput) return;
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            const sheetColumnName = USER_MAP[userKey] || res.fullName || userKey;
            sessionStorage.setItem('selectedUser', sheetColumnName);
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Server Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
    
    // ถ้าไม่มี User และไม่ได้อยู่ที่หน้า Login ให้เตะไปหน้า Login
    if (!user && !isLoginPage) {
        window.location.replace('index.html');
        return false;
    }
    // ถ้าอยู่ที่หน้า Login และมี User แล้ว ให้ส่งไปหน้า Main (ป้องกันการ Login ซ้ำ)
    if (user && isLoginPage) {
        window.location.replace('main.html');
        return true;
    }
    return true;
};

/* ===== 2. OPERATIONS (CART SYSTEM) ===== */
window.doAction = async function(type, mat, idx) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const userInSheet = sessionStorage.getItem('selectedUser'); 
    
    if (!confirm(`Confirm ${type} ${qty} unit(s)?`)) return;

    try {
        const url = `${API}?action=${type}&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res.success) { 
            alert("✅ " + type.toUpperCase() + " Success!");
            if (type === 'withdraw') {
                const prod = window.allRows[idx]['Product Name'] || 'N/A';
                window.withdrawCart.push({ mat, prod, qty });
                window.updateCartUI();
            }
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 3. HTML TABLE SUMMARY (FOR OUTLOOK) ===== */
window.updateCartUI = function() {
    let cartBtn = document.getElementById('cart-floating-btn');
    if (!cartBtn) {
        cartBtn = document.createElement('div');
        cartBtn.id = 'cart-floating-btn';
        cartBtn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(cartBtn);
    }
    if (window.withdrawCart.length > 0) {
        cartBtn.innerHTML = `<button onclick="window.showSummary()" style="background:#16a34a; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); cursor:pointer; font-weight:bold; font-size:16px;">📧 Finish & Send Email (${window.withdrawCart.length})</button>`;
    } else { cartBtn.innerHTML = ''; }
};

window.showSummary = function() {
    const user = sessionStorage.getItem('selectedUser');
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    
    let tableHtml = `
        <div id="summary-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:10000; padding:20px; box-sizing:border-box; overflow-y:auto; font-family: Calibri, sans-serif;">
            <div style="max-width:600px; margin:auto;">
                <button onclick="document.getElementById('summary-overlay').remove()" style="float:right; padding:10px; background:#f1f5f9; border:none; border-radius:8px; cursor:pointer;">Close [X]</button>
                <h2 style="color:#003366;">Confirm Withdraw</h2>
                <p style="background:#fff3cd; padding:10px; border-radius:8px; font-size:14px;">1. Press <b>"Copy & Open Outlook"</b><br>2. When Outlook opens, <b>Paste (Ctrl+V)</b> in the message body.</p>
                
                <div id="copy-area" style="padding:15px; border:1px dashed #ccc; background:#fff;">
                    <p>Hi BO,</p>
                    <p>Please transfer the below spare parts.</p>
                    <table style="border-collapse: collapse; width: 100%; border: 1px solid #4472c4;">
                        <thead>
                            <tr style="background-color: #4472c4; color: white;">
                                <th style="border: 1px solid #4472c4; padding: 8px;">Catalog</th>
                                <th style="border: 1px solid #4472c4; padding: 8px;">Product Name</th>
                                <th style="border: 1px solid #4472c4; padding: 8px;">Qty</th>
                                <th style="border: 1px solid #4472c4; padding: 8px;">From</th>
                                <th style="border: 1px solid #4472c4; padding: 8px;">To</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${window.withdrawCart.map(item => `
                                <tr style="background-color: #d9e1f2;">
                                    <td style="border: 1px solid #4472c4; padding: 8px;">${item.mat}</td>
                                    <td style="border: 1px solid #4472c4; padding: 8px;">${item.prod}</td>
                                    <td style="border: 1px solid #4472c4; padding: 8px; text-align:center;">${item.qty}</td>
                                    <td style="border: 1px solid #4472c4; padding: 8px; text-align:center;">0243</td>
                                    <td style="border: 1px solid #4472c4; padding: 8px; text-align:center;">${user}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p>Best Regards,<br>${user}</p>
                </div>
                <br>
                <button onclick="window.copyAndOpenOutlook()" style="width:100%; padding:18px; background:#003366; color:white; font-size:18px; border-radius:12px; border:none; cursor:pointer; font-weight:bold;">📋 Copy Table & Open Outlook</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', tableHtml);
};

window.copyAndOpenOutlook = function() {
    const range = document.createRange();
    range.selectNode(document.getElementById("copy-area"));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    
    try {
        document.execCommand('copy');
        alert("✅ Table Copied! Opening Outlook...");
        
        const user = sessionStorage.getItem('selectedUser');
        const subject = `Spare parts transfer ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${user}`;
        const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
        const mailCc = "gthfss@qiagen.com";
        
        // ใช้ ms-outlook:// ถ้าเป็นมือถือ หรือ mailto: ถ้าเป็นคอม
        const outlookLink = `ms-outlook://compose?to=${mailTo}&cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("--- PASTE TABLE HERE ---")}`;
        window.location.href = outlookLink;

        setTimeout(() => {
            if (document.visibilityState === 'visible') {
                window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("--- PASTE TABLE HERE ---")}`;
            }
        }, 800);

        window.withdrawCart = [];
        window.updateCartUI();
    } catch (err) { alert("❌ Copy Failed"); }
};

/* ===== 4. LOAD & RENDER DATA ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Inventory...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data, mode);
        }
    } catch (e) { }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById(mode === 'supervisor' ? 'staff-data' : 'data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();

    tbody.innerHTML = data.map((item, index) => {
        const q0243 = item['0243'] || 0;
        const qUser = item[user] || 0;
        const disp = path.includes('withdraw') ? q0243 : qUser;
        let btn = `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center;"><button onclick="window.doAction('${path.includes('withdraw')?'withdraw':'return'}','${item.Material}',${index})" style="padding:6px 12px; border-radius:6px; border:none; background:#003366; color:white; cursor:pointer;">${path.includes('withdraw')?'Withdraw':'Return'}</button></div>`;
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${disp}</b></td><td align="right">${btn}</td></tr>`;
    }).join('');
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered, mode);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };

// เริ่มทำงาน
window.checkAuth();
if (window.location.pathname.includes('main.html') || window.location.pathname.includes('withdraw.html') || window.location.pathname.includes('return.html')) {
    window.loadStockData();
}
