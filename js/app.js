/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbyL887e7XHftaD8e8lIRIxN3MA90t1GFvka0GiIa4hZQ-Jh5zGlHZG5QKkqa9NqmfeWIA/exec";     
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
let rows = []; 

// รายชื่อพนักงานจากคอลัมน์ I ถึง N
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

/* ===== 2. Authentication & Navigation ===== */
window.login = () => {
    const v = document.getElementById('password')?.value.trim();
    if (v === PASSWORD) { 
        sessionStorage.setItem('isLoggedIn', 'true'); 
        location.href = 'user-select.html'; 
    } else { alert('Incorrect Password!'); }
};
window.goBack = () => { location.href = 'user-select.html'; };
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };

/* ===== 3. Data Loader ===== */
window.loadUsers = async function() {
    return STAFF_NAMES.map(name => ({ header: name }));
};

window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading Inventory...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; 
            window.renderTable(rows, type);
        }
    } catch (e) { if(tbody) tbody.innerHTML = '<tr><td colspan="3">Connection Error</td></tr>'; }
};

/* ===== 4. Rendering (Single Line Format) ===== */
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;
        const itemInfo = `<strong>${r.Material}</strong> | <span style="font-size:12px; color:#64748b;">${r['Product Name']}</span>`;

        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:10px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" style="background:${isOut?'#cbd5e1':'#003366'}; color:white; border:none; padding:6px 12px; border-radius:4px;" ${isOut ? 'disabled' : ''}>Withdraw</button>
                </td>
            </tr>`;
        }
        if (type === 'return') {
            if (userStock <= 0) return '';
            return `<tr>
                <td style="padding:10px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${userStock}</td>
                <td style="text-align:right;">
                    <input type="number" id="q_${r.Material}" value="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'return')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:4px;">Return</button>
                </td>
            </tr>`;
        }
        if (type === 'all') {
            return `<tr>
                <td style="padding:10px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right;"><span style="color:${isOut?'#ef4444':'#16a34a'}; font-weight:bold; font-size:12px; padding-right:10px;">${isOut?'OUT':'IN STOCK'}</span></td>
            </tr>`;
        }
    }).join('');
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};;
