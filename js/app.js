/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbwS2LWmnkCYE4eiP5MWMyGW9S4QqpG9sITJis0WJOqkguiMPjEApOBF7dQYSHbz8SnfeQ/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; // เก็บข้อมูลสต็อกทั้งหมดเพื่อใช้ค้นหาชื่อสินค้า

/* ===== 2. Data Loading ===== */
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        return res.success ? res.users : [];
    } catch (e) { console.error("Load Users Error", e); return []; }
};

window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; // เก็บข้อมูลลงตัวแปร global
            window.renderTable(rows, type);
        }
    } catch (e) { tbody.innerHTML = 'Error loading data'; }
};

/* ===== 3. Core Render Engine (โชว์บรรทัดเดียว) ===== */
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    
    tbody.innerHTML = data.map(r => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;

        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:10px;">
                    <div style="font-weight:bold; ${isOut ? 'color:red;' : ''}">${r.Material}</div>
                    <div style="font-size:11px; color:#666; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${r['Product Name']}</div>
                </td>
                <td style="text-align:center; font-weight:bold; ${isOut ? 'color:red;' : ''}">${stock0243}</td>
                <td style="text-align:right;">
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                        <button onclick="doAction('${r.Material}', 'withdraw')" style="background:${isOut?'#ccc':'#ef4444'}; color:white; border:none; padding:8px; border-radius:5px;" ${isOut ? 'disabled' : ''}>OUT</button>
                    </div>
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
                    <button onclick="doAction('${r.Material}', 'return')" style="background:#22c55e; color:white; border:none; padding:8px; border-radius:5px;">IN</button>
                </td>
            </tr>`;
        }
        if (type === 'all') {
            return `<tr>
                <td style="padding:10px;"><div style="font-weight:bold; ${isOut ? 'color:red;' : ''}">${r.Material}</div><div style="font-size:11px; color:#666;">${r['Product Name']}</div></td>
                <td style="text-align:center; font-weight:bold; ${isOut ? 'color:red;' : ''}">${stock0243}</td>
                <td style="text-align:center;"><span style="font-size:10px; padding:3px 8px; border-radius:10px; background:${isOut?'#fee2e2':'#dcfce7'}; color:${isOut?'#ef4444':'#15803d'}">${isOut?'Empty':'Stock'}</span></td>
            </tr>`;
        }
    }).join('');
};

/* ===== 4. Helper & Action Functions ===== */
window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};

window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const input = document.getElementById(`q_${mat}`);
    const qty = input.value;
    const url = `${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("Success!"); window.loadStockData(mode); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 5. Supervisor Actions (ครบถ้วน) ===== */
window.supAddStock = async (mat, qty) => fetch(`${API}?action=addstock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r=>r.json());
window.supDeductUser = async (mat, user, qty) => fetch(`${API}?action=return&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&status=USED&admin=Supervisor`).then(r=>r.json());;
