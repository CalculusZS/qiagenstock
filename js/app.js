/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbxQVNIf-QRiQVibH601ijLM57fBSjAlZJcEfzNhFn5X8VjTukJQXkv5vtib-jzaybImnw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 

/* ===== 2. Authentication & Navigation ===== */
window.login = function() {
    const passValue = document.getElementById('password')?.value.trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { alert('Invalid Password!'); }
};

window.openSupModal = () => document.getElementById('sup_modal').style.display='flex';
window.closeSupModal = () => document.getElementById('sup_modal').style.display='none';
window.submitSupLogin = () => {
    if(document.getElementById('sup_pass_input').value === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else { alert('Wrong Password!'); }
};

window.goBack = () => { location.href = 'user-select.html'; };
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };

/* ===== 3. Data Loading ===== */
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        return res.success ? res.users : [];
    } catch (e) { return []; }
};

window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data;
            window.renderTable(rows, type);
        }
    } catch (e) { tbody.innerHTML = 'Error loading data'; }
};

/* ===== 4. Core Render Engine (แก้ไขตามโจทย์) ===== */
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    
    tbody.innerHTML = data.map(r => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;

        // Condition 1: Withdraw Page
        if (type === 'withdraw') {
            return `
                <tr>
                    <td style="padding:10px;">
                        <div style="font-weight:bold; ${isOut ? 'color:red;' : ''}">${r.Material}</div>
                        <div style="font-size:11px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${r['Product Name']}</div>
                    </td>
                    <td style="text-align:center; font-weight:bold; ${isOut ? 'color:red;' : ''}">${stock0243}</td>
                    <td style="text-align:right;">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="number" id="q_${r.Material}" value="1" min="1" class="qty-input-sm" ${isOut ? 'disabled' : ''}>
                            <button class="btn-withdraw" onclick="doAction('${r.Material}', 'withdraw')" ${isOut ? 'disabled style="background:#ccc"' : ''}>OUT</button>
                        </div>
                    </td>
                </tr>`;
        }

        // Condition 2: Return Page (Show only what user has)
        if (type === 'return') {
            if (userStock <= 0) return ''; 
            return `
                <tr>
                    <td style="padding:10px;">
                        <div style="font-weight:bold;">${r.Material}</div>
                        <div style="font-size:11px; color:#666;">${r['Product Name']}</div>
                    </td>
                    <td style="text-align:center; font-weight:bold;">${userStock}</td>
                    <td style="text-align:right;">
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                            <input type="number" id="q_${r.Material}" value="1" max="${userStock}" class="qty-input-sm">
                            <button class="btn-success" onclick="doAction('${r.Material}', 'return')">IN</button>
                        </div>
                    </td>
                </tr>`;
        }

        // Condition 3: View All Page
        if (type === 'all') {
            return `
                <tr>
                    <td style="padding:10px;">
                        <div style="font-weight:bold; ${isOut ? 'color:red;' : ''}">${r.Material}</div>
                        <div style="font-size:11px; color:#666;">${r['Product Name']}</div>
                    </td>
                    <td style="text-align:center; font-weight:bold; ${isOut ? 'color:red;' : ''}">${stock0243}</td>
                    <td style="text-align:center;">
                        <span style="font-size:10px; padding:3px 8px; border-radius:10px; background:${isOut?'#fee2e2':'#dcfce7'}; color:${isOut?'#ef4444':'#15803d'}">
                            ${isOut ? 'Empty' : 'Stock'}
                        </span>
                    </td>
                </tr>`;
        }
    }).join('');
};

/* ===== 5. Action Functions ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const input = document.getElementById(`q_${mat}`);
    const qty = input.value;
    
    input.disabled = true;
    const url = `${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("Success!");
            window.loadStockData(mode);
        } else {
            alert("Error: " + res.msg);
            input.disabled = false;
        }
    } catch (e) { alert("Network Error"); input.disabled = false; }
};

/* ===== 6. Supervisor Actions ===== */
window.supAddStock = async (mat, qty) => {
    return await fetch(`${API}?action=addstock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r=>r.json());
};
window.supDeductUser = async (mat, user, qty) => {
    return await fetch(`${API}?action=return&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&status=USED&admin=Supervisor`).then(r=>r.json());
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};
