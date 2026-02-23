/* ========================================================================== 
   QIAGEN INVENTORY - FINAL MOBILE & OUTLOOK FORCED VERSION
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

/* ===== 2. LOAD DATA ===== */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Inventory...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            window.renderTable(res.data, mode);
        }
    } catch (e) { console.error(e); }
};

/* ===== 3. OPERATIONS + FORCED OUTLOOK FOR MOBILE ===== */
window.doAction = async function(type, mat, idx) {
    const qtyInput = document.getElementById('qty_' + idx);
    const qty = qtyInput ? qtyInput.value : 1;
    const userInSheet = sessionStorage.getItem('selectedUser'); 
    
    if (!confirm(`Confirm ${type} ${qty} unit(s)?`)) return;

    try {
        const url = `${API}?action=${type}&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res.success) { 
            alert("✅ Transaction Success");

            if (type === 'withdraw') {
                const prod = window.allRows[idx]['Product Name'] || 'N/A';
                const mailTo = "AsiaPacBackOfficeFieldService@qiagen.com";
                const mailCc = "gthfss@qiagen.com";
                const subject = `Spare parts transfer 9 Feb 2026`;
                
                let body = `Hi BO,\n\nPlease transfer the below spare parts.\n\n`;
                body += `Catalog: ${mat}\n`;
                body += `Product Name: ${prod}\n`;
                body += `Amount: ${qty}\n`;
                body += `From: 0243\n`;
                body += `To: ${userInSheet}\n\n`;
                body += `Best Regards,\nPhurilap\nphurilap.khonthong@qiagen.com`;

                // --- เทคนิคบังคับเปิดแอปสำหรับมือถือ ---
                const mailtoLink = `mailto:${mailTo}?cc=${mailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                
                // ใช้ iframe ช่วยในการดีดตัวแอป
                const iframe = document.createElement("iframe");
                iframe.style.display = "none";
                iframe.src = mailtoLink;
                document.body.appendChild(iframe);
                
                // สำรองด้วยการคลิกลิงก์
                setTimeout(() => {
                    const a = document.createElement("a");
                    a.href = mailtoLink;
                    a.click();
                    document.body.removeChild(iframe);
                }, 300);
            }
            window.loadStockData(); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ Error"); }
};

/* ===== 4. SUPERVISOR & OTHER FUNCTIONS (คงไว้ครบถ้วน) ===== */
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_' + idx).value.trim();
    const qty = document.getElementById('qty_' + idx).value;
    const userInSheet = sessionStorage.getItem('selectedUser');
    if (!wo) return alert("❌ Enter WO#");
    const url = `${API}?action=deduct&user=${encodeURIComponent(userInSheet)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ Success"); window.loadStockData(); } else { alert("❌ " + res.msg); }
};

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
            actionUI = qty0243 > 0 ? `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center;"><button onclick="window.doAction('withdraw','${item.Material}',${index})" style="background:#003366; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Withdraw</button></div>` : '<b style="color:red;">OUT</b>';
        } else if (path.includes('return')) {
            actionUI = `<div style="display:flex; gap:5px; justify-content:flex-end;"><input type="number" id="qty_${index}" value="1" min="1" style="width:40px; text-align:center;"><button onclick="window.doAction('return','${item.Material}',${index})" style="background:#16a34a; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Return</button></div>`;
        } else if (path.includes('deduct')) {
            actionUI = `<div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;"><input type="text" id="wo_${index}" placeholder="WO#" style="width:80px; padding:5px;"><button onclick="window.doDeduct('${item.Material}',${index})" style="background:#ef4444; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Deduct</button></div>`;
        }
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']||''}</small></td><td align="center"><b>${displayQty}</b></td><td align="right">${actionUI}</td></tr>`;
    }).join('');
};

window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    window.renderTable(filtered, mode);
};
window.logout = () => { sessionStorage.clear(); window.location.replace('index.html'); };
window.checkAuth();
