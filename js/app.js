/* ========================================================================== 
   QIAGEN INVENTORY - CUSTOM MASTER CONTROL (SYNC WITH BACKEND V7.1)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.allRows = [];

/* ===== 1. AUTH & LOGIN (บังคับ Global) ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    if (passVal === SUP_PASSWORD || userKey === 'SUPERVISOR') {
        sessionStorage.setItem('userKey', 'Supervisor');
        sessionStorage.setItem('selectedUser', 'Supervisor');
        window.location.href = 'supervisor.html';
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        if (res && res.success) {
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', res.fullName || USER_MAP[userKey] || userKey);
            if (res.status === 'NEW') window.showForcePasswordChange(userKey);
            else window.location.href = 'main.html';
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ API Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    const ids = ['current-user', 'display-user', 'user_display', 'userName'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = user;
    });
    return true;
};

/* ===== 2. DATA RENDERING (เพิ่มปุ่ม QTY และ DEDUCT) ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data, mode);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;

    const user = sessionStorage.getItem('selectedUser');
    const path = window.location.pathname.toLowerCase();
    const isCentral = path.includes('withdraw') || path.includes('showall');

    let html = data.map(item => {
        const qty0243 = Number(item['0243'] || 0);
        const qtyUser = Number(item[user] || 0);
        const displayQty = isCentral ? qty0243 : qtyUser;

        if ((path.includes('return') || path.includes('deduct')) && qtyUser <= 0) return '';

        let actionUI = "";
        // สร้าง ID ที่ปลอดภัยสำหรับ Input
        const safeId = item.Material.replace(/[^a-zA-Z0-9]/g, '_');

        if (path.includes('withdraw')) {
            actionUI = qty0243 > 0 ? `
                <div style="display:flex; align-items:center; gap:5px; justify-content:flex-end;">
                    <input type="number" id="qty_${safeId}" value="1" min="1" style="width:50px; padding:6px; border-radius:6px; border:1px solid #ccc; text-align:center;">
                    <button onclick="window.executeAction('withdraw','${item.Material}','${safeId}')" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Withdraw</button>
                </div>` : '<b style="color:red;">OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `
                <div style="display:flex; align-items:center; gap:5px; justify-content:flex-end;">
                    <input type="number" id="qty_${safeId}" value="1" min="1" style="width:50px; padding:6px; border-radius:6px; border:1px solid #ccc; text-align:center;">
                    <button onclick="window.executeAction('return','${item.Material}','${safeId}')" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Return</button>
                </div>`;
        } else if (path.includes('deduct')) {
            actionUI = `
                <div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="wo_${safeId}" placeholder="WO#" style="width:80px; padding:6px; border-radius:6px; border:1px solid #ccc;">
                        <input type="number" id="qty_${safeId}" value="1" min="1" style="width:50px; padding:6px; border-radius:6px; border:1px solid #ccc; text-align:center;">
                    </div>
                    <button onclick="window.handleDeductClick('${item.Material}','${safeId}')" style="background:#ef4444; color:white; border:none; padding:8px 15px; border-radius:8px; font-weight:bold; width:140px; cursor:pointer;">DEDUCT</button>
                </div>`;
        } else {
            actionUI = displayQty > 0 ? '<span style="color:green;">● Available</span>' : '<span style="color:red;">○ Empty</span>';
        }

        return `<tr>
            <td style="padding:12px; border-bottom:1px solid #eee;">
                <div style="font-weight:bold; color:#003366;">${item.Material}</div>
                <div style="font-size:11px; color:#666;">${item['Product Name'] || ''}</div>
            </td>
            <td align="center" style="font-size:18px; font-weight:bold; border-bottom:1px solid #eee;">${displayQty}</td>
            <td align="right" style="padding-right:10px; border-bottom:1px solid #eee;">${actionUI}</td>
        </tr>`;
    }).join('');

    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No data</td></tr>';
};

/* ===== 3. OPERATIONS (เบิก/คืน/ตัด) ===== */
window.executeAction = async function(type, mat, safeId) {
    const qty = document.getElementById('qty_' + safeId).value;
    const user = sessionStorage.getItem('userKey');
    if (!confirm(`Are you sure to ${type} ${qty} unit(s)?`)) return;

    try {
        const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Success"); window.loadStockData(); }
        else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("❌ Connection Error"); }
};

window.handleDeductClick = async function(mat, safeId) {
    const wo = document.getElementById('wo_' + safeId).value.trim();
    const qty = document.getElementById('qty_' + safeId).value;
    if (!wo) return alert("❌ Please enter WO#");
    
    const user = sessionStorage.getItem('userKey');
    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Deduct Success"); window.loadStockData(); }
        else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("❌ Connection Error"); }
};

/* ===== 4. MISC (Search, History, Logout) ===== */
window.searchStock = function(q, mode) {
    const filtered = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(q.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(q.toLowerCase())
    );
    window.renderTable(filtered, mode);
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.map(row => `
                <div style="display:flex; border-bottom:1px solid #eee; padding:10px; font-size:12px;">
                    <div style="flex:1;">${new Date(row[0]).toLocaleString()}</div>
                    <div style="flex:1; font-weight:bold;">${row[1]}</div>
                    <div style="flex:1; color:#003366;">${row[4]}</div>
                    <div style="flex:0.5; text-align:center;">${row[5]}</div>
                    <div style="flex:1; text-align:right;">${row[6]}</div>
                    <div style="flex:1; text-align:right; color:red;">${row[7] || '-'}</div>
                </div>`).join('');
        }
    } catch (e) { console.error(e); }
};

window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.goBack = () => { window.location.href = 'main.html'; };

window.checkAuth();
