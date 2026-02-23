/* ========================================================================== 
   QIAGEN INVENTORY - MULTI-ITEM CART + TABLE SUMMARY (STABLE)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.withdrawCart = []; // ตะกร้าเก็บของสำหรับส่งเมล์ทีเดียว
window.allRows = [];

/* ===== 1. AUTH & LOGIN (Fixed Refresh) ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();
    try {
        const res = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('selectedUser', USER_MAP[userKey] || res.fullName);
            window.location.replace('main.html');
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const isLogin = window.location.pathname.includes('index.html');
    if (!user && !isLogin) return window.location.replace('index.html');
    return true;
};

/* ===== 2. DATA LOADING ===== */
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

/* ===== 3. WITHDRAW SYSTEM (ADD TO CART) ===== */
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
                // เพิ่มเข้าตะกร้า
                window.withdrawCart.push({ mat, prod, qty });
                window.updateCartUI();
            }
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. SUMMARY TABLE & EMAIL (ฟอร์มที่พี่ต้องการ) ===== */
window.updateCartUI = function() {
    let cartBtn = document.getElementById('cart-floating-btn');
    if (!cartBtn) {
        cartBtn = document.createElement('div');
        cartBtn.id = 'cart-floating-btn';
        cartBtn.style = "position:fixed; bottom:25px; right:25px; z-index:1000;";
        document.body.appendChild(cartBtn);
    }
    if (window.withdrawCart.length > 0) {
        cartBtn.innerHTML = `<button onclick="window.showSummary()" style="background:#16a34a; color:white; padding:15px 25px; border-radius:50px; border:none; box-shadow:0 5px 15px rgba(0,0,0,0.3); cursor:pointer; font-weight:bold;">📧 Send Summary (${window.withdrawCart.length})</button>`;
    } else { cartBtn.innerHTML = ''; }
};

window.showSummary = function() {
    const user = sessionStorage.getItem('selectedUser');
    const dateStr = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    
    let tableHtml = `
        <div id="summary-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:10000; padding:20px; box-sizing:border-box; overflow-y:auto; font-family: 'Calibri', sans-serif;">
            <div style="max-width:600px; margin:auto;">
                <button onclick="document.getElementById('summary-overlay').remove()" style="float:right; padding:10px; background:#eee; border:none; border-radius:5px;">[X] Close</button>
                <h3 style="color:#003366;">Confirm & Send Email</h3>
                <p style="background:#fff3cd; padding:10px; border-radius:5px; font-size:14px;">1. Press <b>"Copy & Open Outlook"</b><br>2. When Outlook opens, <b>Paste (Ctrl+V)</b> in the message body.</p>
                
                <div id="copy-area" style="padding:10px; background:white;">
                    <p>Hi BO,</p>
                    <p>Please transfer the below spare parts.</p>
                    <table style="border-collapse: collapse; width: 100%; border: 1px solid #4472c4;">
                        <thead>
                            <tr style="background-color: #4472c4; color: white;">
                                <th style="border: 1px solid #4472c4; padding: 8px;">Catalog</th>
                                <th style="border: 1px solid #4472c4; padding: 8px;">Product Name</th>
                                <th style="border: 1px solid #4472c4; padding: 8px; text-align:center;">Amount</th>
                                <th style="border: 1px solid #4472c4; padding: 8px; text-align:center;">From</th>
                                <th style="border: 1px solid #4472c4; padding: 8px; text-align:center;">To</th>
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
                <button onclick="window.copyAndOpenOutlook()" style="width:100%; padding:20px; background:#003366; color:white; font-size:18px; border-radius:10px; border:none; cursor:pointer; font-weight:bold;">📋 Copy Table & Open Outlook</button>
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
        const subject = `Spare parts transfer ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })} - ${user}`;
        const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
        const mailCc = "gthfss@qiagen.com";
        
        // เปิด Outlook
        window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("--- PASTE THE TABLE HERE (Ctrl+V) ---")}`;

        window.withdrawCart = []; // เคลียร์ของ
        window.updateCartUI();
    } catch (err) { alert("❌ Copy Failed"); }
};

/* ===== 5. RENDERING ===== */
window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();

    tbody.innerHTML = data.map((item, index) => {
        const q0243 = item['0243'] || 0;
        const qUser = item[user] || 0;
        const disp = path.includes('withdraw') ? q0243 : qUser;
        let actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center;"><button onclick="window.doAction('${path.includes('withdraw')?'withdraw':'return'}','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">${path.includes('withdraw')?'Withdraw':'Return'}</button></div>`;
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${disp}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered, mode);
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
if (!window.location.pathname.includes('index.html')) window.loadStockData();
