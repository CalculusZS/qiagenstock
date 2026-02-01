/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbyL887e7XHftaD8e8lIRIxN3MA90t1GFvka0GiIa4hZQ-Jh5zGlHZG5QKkqa9NqmfeWIA/exec";     
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
let rows = []; 

/* ===== 2. Authentication & Navigation ===== */
window.login = function() {
    const v = document.getElementById('password')?.value.trim();
    if (v === PASSWORD) { sessionStorage.setItem('isLoggedIn', 'true'); location.href = 'user-select.html'; }
    else { alert('Invalid Password!'); }
};
window.goBack = () => { location.href = 'user-select.html'; };
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };

/* ===== 3. Data Loader (Fixed) ===== */
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r=>r.json());
        return res.users;
    } catch(e) { return []; }
};

window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r=>r.json());
        if (res.success) {
            rows = res.data; 
            window.renderTable(rows, type);
            return rows;
        }
    } catch (e) { if(tbody) tbody.innerHTML = '<tr><td colspan="3">Load Failed</td></tr>'; }
};

/* ===== 4. Rendering ===== */
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;

        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:10px;">
                    <div style="font-weight:bold; ${isOut ? 'color:red;' : ''}">${r.Material}</div>
                    <div style="font-size:11px; color:#666;">${r['Product Name']}</div>
                </td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" style="background:${isOut?'#ccc':'#2563eb'}; color:white; border:none; padding:8px; border-radius:6px;" ${isOut ? 'disabled' : ''}>OUT</button>
                </td>
            </tr>`;
        }
        if (type === 'return') {
            if (userStock <= 0) return '';
            return `<tr>
                <td><div style="font-weight:bold;">${r.Material}</div><div style="font-size:11px; color:#666;">${r['Product Name']}</div></td>
                <td style="text-align:center; font-weight:bold;">${userStock}</td>
                <td style="text-align:right;">
                    <input type="number" id="q_${r.Material}" value="1" max="${userStock}" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'return')" style="background:#22c55e; color:white; border:none; padding:8px; border-radius:6px;">IN</button>
                </td>
            </tr>`;
        }
        if (type === 'all') {
            return `<tr>
                <td><div style="font-weight:bold;">${r.Material}</div><div style="font-size:11px;">${r['Product Name']}</div></td>
                <td style="text-align:center;">${stock0243}</td>
                <td style="text-align:right;"><span style="color:${isOut?'red':'green'}">${isOut?'Out':'In Stock'}</span></td>
            </tr>`;
        }
    }).join('');
};

/* ===== 5. Action & Search ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const input = document.getElementById(`q_${mat}`);
    const qty = input.value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { alert("Successfully!"); await window.loadStockData(mode); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};

/* ===== 6. Supervisor Functions (คงไว้เหมือนเดิม) ===== */
window.findProductByMat = (mat) => rows.find(r => String(r.Material).trim() === String(mat).trim());
window.supAddStock = async (mat, qty) => fetch(`${API}?action=addstock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r=>r.json());
window.supDeductUser = async (mat, user, qty) => fetch(`${API}?action=return&status=USED&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
