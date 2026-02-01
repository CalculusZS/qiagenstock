/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbw_pn83IIHLcJuLr_z2_5c7EMGx40aHIgnIkMAC4gknRJMgXs_JsVNbvpap23CMFCcLiw/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
let rows = []; 

/* ===== 2. Authentication & Auto Logout ===== */
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };

// Auto Logout 5 นาที
let idleTimer;
const resetIdle = () => {
    clearTimeout(idleTimer);
    if(sessionStorage.getItem('isLoggedIn')) idleTimer = setTimeout(() => { alert("Session Expired"); window.logout(); }, 5 * 60 * 1000);
};
['mousedown','mousemove','keypress','touchstart'].forEach(e => window.addEventListener(e, resetIdle));

/* ===== 3. Data Loading & Rendering ===== */
window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; 
            window.renderTable(rows, type);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const s0243 = Number(r['0243'] || 0);
        const sUser = Number(r[user] || 0);
        const info = `<b>${r.Material}</b> <small>| ${r['Product Name']}</small>`;

        if (type === 'all') return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="center">${s0243>0?'IN':'OUT'}</td></tr>`;
        
        if (type === 'withdraw') {
            return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="right">
                <input type="number" id="q_${r.Material}" value="1" style="width:40px;">
                <button onclick="doAction('${r.Material}','withdraw')" style="background:#003366;color:white;border:none;padding:5px 10px;border-radius:4px;">Withdraw</button>
            </td></tr>`;
        }
        if (type === 'return' && sUser > 0) {
            return `<tr><td>${info}</td><td align="center">${sUser}</td><td align="right">
                <input type="number" id="q_${r.Material}" value="1" style="width:40px;">
                <button onclick="doAction('${r.Material}','return')" style="background:#16a34a;color:white;border:none;padding:5px 10px;border-radius:4px;">Return</button>
            </td></tr>`;
        }
    }).join('');
};

/* ===== 4. Actions ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
    if(res.success) { alert("Success"); loadStockData(mode); } else alert(res.msg);
};

window.supAddStock = async (mat, qty) => fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
window.supDeductUser = async (mat, user, qty) => fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());

/* Audit Function */
window.exportAudit = () => {
    let csv = "Material,Product,0243," + STAFF_NAMES.join(",") + "\n";
    rows.forEach(r => {
        let line = `${r.Material},"${r['Product Name']}",${r['0243']}`;
        STAFF_NAMES.forEach(n => line += `,${r[n]||0}`);
        csv += line + "\n";
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit_stock.csv'; a.click();
};
