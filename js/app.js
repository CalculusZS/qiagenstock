/* ========================================================================== 
   QIAGEN INVENTORY - FULL STABLE VERSION (ORIGINAL + EMAIL SYSTEM)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.allRows = [];

/* ===== 1. AUTH & LOGIN ===== */
window.handleLogin = async function() {
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
            if (res.status === 'NEW') { window.showForcePasswordChange(userKey); } 
            else { window.location.replace('main.html'); }
        } else { alert("❌ Login Failed"); }
    } catch (e) { alert("❌ Server Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    const ids = ['current-user', 'display-user', 'user_display', 'userName'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerText = user; });
    return true;
};

/* ===== 2. DATA RENDERING ===== */
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
    const userInSheet = sessionStorage.getItem('selectedUser'); 
    const path = window.location.pathname.toLowerCase();
    const isCentral = path.includes('withdraw') || path.includes('showall');

    tbody.innerHTML = data.map((item, index) => {
        const qty0243 = Number(item['0243'] || 0);
        const qtyUser = Number(item[userInSheet] || 0); 
        const displayQty = isCentral ? qty0243 : qtyUser;

        if ((path.includes('return') || path.includes('deduct')) && qtyUser <= 0) return '';

        let actionUI = "";
        if (path.includes('withdraw')) {
            actionUI = qty0243 > 0 ? `<div style="display:flex; align-items:center; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" max="${qty0243}" style="width:45px; padding:6px; border-radius:6px; border:1px solid #ccc; text-align:center;">
                <button onclick="window.doAction('withdraw','${item.Material}', ${index})" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Withdraw</button>
            </div>` : '<b style="color:red;">OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex; align-items:center; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" value="1" min="1" max="${qtyUser}" style="width:45px; padding:6px; border-radius:6px; border:1px solid #ccc; text-align:center;">
                <button onclick="window.doAction('return','${item.Material}', ${index})" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">Return</button>
            </div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
                <div style="display:flex; gap:5px;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:80px; padding:6px; border-radius:6px; border:1px solid #ccc;">
                <input type="number" id="qty_${index}" value="1" min="1" max="${qtyUser}" style="width:45px; padding:6px; border-radius:6px; border:1px solid #ccc; text-align:center;"></div>
                <button onclick="window.doDeduct('${item.Material}', ${index})" style="background:#ef4444; color:white; border:none; padding:8px 15px; border-radius:8px; font-weight:bold; width:135px; cursor:pointer;">DEDUCT</button>
            </div>`;
        } else { actionUI = qty0243 > 0 ? '<span style="color:green;">● Available</span>' : '<span style="color:red;">○ Empty</span>'; }

        return `<tr><td style="padding:12px; border-bottom:1px solid #eee;"><div style="font-weight:bold; color:#003366;">${item.Material}</div><div style="font-size:11px; color:#666;">${item['Product Name'] || ''}</div></td>
            <td align="center" style="font-size:18px; font-weight:bold; border-bottom:1px solid #eee;">${displayQty}</td>
            <td align="right" style="padding-right:10px; border-bottom:1px solid #eee;">${actionUI}</td></tr>`;
    }).join('');
};

/* ===== 3. OPERATIONS (Withdraw / Return / Deduct + EMAIL) ===== */
window.doAction = async function(type, mat, idx) {
    const qty = document.getElementById('qty_' + idx).value;
    const userInSheet = sessionStorage.getItem('selectedUser'); 
    if (!confirm(`Confirm ${type} ${qty} unit(s)?`)) return;
    try {
        const url = `${API}?action=${type}&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("✅ Success");
            if (type === 'withdraw') {
                const prod = window.allRows[idx]['Product Name'] || 'N/A';
                const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
                const mailCc = "gthfss@qiagen.com";
                const body = `Hi BO,\n\nPlease transfer the below spare parts.\n\nCatalog: ${mat}\nProduct Name: ${prod}\nAmount: ${qty}\nFrom: 0243\nTo: ${userInSheet}\n\nBest Regards,\nPhurilap\nphurilap.khonthong@qiagen.com`;
                window.location.href = `mailto:${mailTo}?cc=${mailCc}&subject=Spare parts transfer 9 Feb 2026&body=${encodeURIComponent(body)}`;
            }
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value.trim();
    const qty = document.getElementById('qty_' + idx).value;
    const userInSheet = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Enter WO#");
    try {
        const url = `${API}?action=deduct&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ Success"); window.loadStockData(); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. SUPERVISOR CONTROLS (เอาคืนมาให้ครบ) ===== */
window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim();
    const qty = document.getElementById('s_qty').value;
    if (!mat) return alert("Enter Material");
    const res = await fetch(`${API}?action=addstock&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Added"); window.loadStockData('supervisor'); }
};

window.resetStaffPassword = async function(staffName) {
    if (!confirm(`Reset password for ${staffName}?`)) return;
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(staffName)}&newPass=1234&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) alert(`✅ Reset to: 1234`);
};

window.setupAdminLookup = function() {
    const mat = document.getElementById('s_mat').value.toUpperCase();
    const found = window.allRows.find(r => String(r.Material) === mat);
    document.getElementById('s_name_display').innerText = found ? found['Product Name'] : "Not found";
};

/* ===== 5. HISTORY & PASSWORD RESET UI ===== */
window.loadHistory = async function() {
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            listDiv.innerHTML = res.data.map(row => {
                const type = String(row[5]).toLowerCase();
                return `<div style="display:flex; border-bottom:1px solid #eee; padding:12px; font-size:12px; min-width:1100px;">
                    <div style="flex:1;">${new Date(row[0]).toLocaleString()}</div>
                    <div style="flex:1.2; font-weight:bold;">${row[1]}</div>
                    <div style="flex:1.5;">${row[4] || '-'}</div>
                    <div style="flex:1; text-align:center;"><span style="padding:4px 8px; border-radius:4px; background:${type==='withdraw'?'#e1effe':(type==='return'?'#def7ec':'#fde8e8')}">${type.toUpperCase()}</span></div>
                    <div style="flex:0.5; text-align:center;">${row[6]}</div><div style="flex:1; text-align:center;">${row[7] || '-'}</div>
                    <div style="flex:1; text-align:right; color:#ef4444;">${row[8] || '-'}</div></div>`;
            }).reverse().join('');
        }
    } catch (e) { }
};

window.showForcePasswordChange = function(userKey) {
    const div = document.createElement('div');
    div.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:9999;";
    div.innerHTML = `<div style="background:white;padding:30px;border-radius:20px;text-align:center;width:300px;">
        <h3>New User</h3><input type="password" id="p1" placeholder="New Password" style="width:100%;padding:10px;margin:5px 0;">
        <input type="password" id="p2" placeholder="Confirm" style="width:100%;padding:10px;margin:5px 0;">
        <button onclick="window.processReset('${userKey}')" style="width:100%;padding:10px;background:#003366;color:white;border:none;border-radius:10px;">Update</button></div>`;
    document.body.appendChild(div);
};

window.processReset = async function(userKey) {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;
    if (!p1 || p1 !== p2) return alert("❌ No match");
    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ Success"); window.location.reload(); }
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered, mode);
};
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.goBack = () => { window.location.href = 'main.html'; };

window.checkAuth();
