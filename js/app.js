/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbyL887e7XHftaD8e8lIRIxN3MA90t1GFvka0GiIa4hZQ-Jh5zGlHZG5QKkqa9NqmfeWIA/exec";       
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
let rows = []; 

/* ===== 2. Authentication ===== */
window.login = function() {
    const passInput = document.getElementById('password').value.trim();
    if (passInput === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else {
        alert('Incorrect Password!');
    }
};
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 3. Data Loading & Rendering ===== */
window.loadUsers = async function() {
    return STAFF_NAMES.map(name => ({ header: name }));
};

window.loadStockData = async function(type) {
    const tbody = document.getElementById('data') || document.getElementById('staff_tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">⌛ Loading...</td></tr>';
    
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; 
            if (document.getElementById('data')) window.renderTable(rows, type);
            return res.data; 
        }
    } catch (e) { console.error(e); }
};

window.findProductByMat = function(m) {
    return rows.find(r => String(r.Material) === String(m));
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map((r) => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;
        const itemInfo = `<strong>${r.Material}</strong><br><span style="font-size:12px; color:#64748b;">${r['Product Name']}</span>`;

        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:45px; padding:5px; border-radius:4px; border:1px solid #ddd;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" 
                        style="background:${isOut?'#cbd5e1':'#003366'}; color:white; border:none; padding:8px 15px; border-radius:8px; font-weight:bold; cursor:pointer;" 
                        ${isOut ? 'disabled' : ''}>Withdraw</button>
                </td>
            </tr>`;
        }

        if (type === 'return' && userStock > 0) {
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${userStock}</td>
                <td style="text-align:right;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:45px; padding:5px; border-radius:4px; border:1px solid #ddd;">
                    <button onclick="doAction('${r.Material}', 'return')" 
                        style="background:#16a34a; color:white; border:none; padding:8px 15px; border-radius:8px; font-weight:bold; cursor:pointer;">Return</button>
                </td>
            </tr>`;
        }
    }).join('');
};

/* ===== 4. Transaction Actions ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { alert("Success!"); await window.loadStockData(mode); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

/* ===== 5. Supervisor Actions ===== */
window.supAddStock = async function(mat, qty) {
    try {
        return await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
    } catch (e) { return {success: false, msg: "Network Error"}; }
};

window.supDeductUser = async function(mat, user, qty) {
    try {
        return await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
    } catch (e) { return {success: false, msg: "Network Error"}; }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};
