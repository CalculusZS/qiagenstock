/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbwS2LWmnkCYE4eiP5MWMyGW9S4QqpG9sITJis0WJOqkguiMPjEApOBF7dQYSHbz8SnfeQ/exec";   
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; // ตัวแปรหลักสำหรับเก็บข้อมูลสต็อก

/* ===== 2. Authentication & Navigation ===== */
window.login = function() {
    const passValue = document.getElementById('password')?.value.trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { 
        alert('Invalid Password!'); 
    }
};

window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html'; 
    } else if (p !== null) { 
        alert("Wrong Password!"); 
    }
};

window.goBack = () => { 
    location.href = 'user-select.html'; 
};

window.logout = () => { 
    sessionStorage.clear(); 
    location.href = 'index.html'; 
};

/* ===== 3. Data Loading Functions ===== */
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        return res.success ? res.users : [];
    } catch (e) {
        console.error("Load users failed", e);
        return [];
    }
};

window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading Data...</td></tr>';
    
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; // เก็บข้อมูลลงตัวแปร global
            window.renderTable(rows, type);
        }
    } catch (e) { 
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Error loading data</td></tr>'; 
    }
};

/* ===== 4. Rendering Engine (โชว์ Product Name บรรทัดเดียว) ===== */
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
                    <div style="font-size:11px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${r['Product Name']}</div>
                </td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right;">
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                        <button onclick="doAction('${r.Material}', 'withdraw')" style="background:${isOut?'#ccc':'#ef4444'}; color:white; border:none; padding:8px; border-radius:6px;" ${isOut ? 'disabled' : ''}>OUT</button>
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
                    <button onclick="doAction('${r.Material}', 'return')" style="background:#22c55e; color:white; border:none; padding:8px; border-radius:6px;">IN</button>
                </td>
            </tr>`;
        }
        if (type === 'all') {
            return `<tr>
                <td style="padding:10px;"><div style="font-weight:bold; ${isOut ? 'color:red;' : ''}">${r.Material}</div><div style="font-size:11px; color:#666;">${r['Product Name']}</div></td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:center;"><span style="font-size:10px; padding:3px 8px; border-radius:10px; background:${isOut?'#fee2e2':'#dcfce7'}; color:${isOut?'#ef4444':'#15803d'}">${isOut?'Empty':'Stock'}</span></td>
            </tr>`;
        }
    }).join('');
};

/* ===== 5. Action Logic ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const input = document.getElementById(`q_${mat}`);
    const qty = input.value;
    const url = `${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    
    input.disabled = true;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { 
            alert("Success!"); 
            window.loadStockData(mode); 
        } else { 
            alert("Error: " + res.msg); 
            input.disabled = false;
        }
    } catch (e) { 
        alert("Network Error"); 
        input.disabled = false;
    }
};

/* ===== 6. Search Function ===== */
window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};

/* ===== 7. Supervisor Logic (ดึงข้อมูลรายชิ้น) ===== */
window.findProductByMat = function(mat) {
    return rows.find(r => String(r.Material).trim() === String(mat).trim());
};

window.supAddStock = async function(mat, qty) {
    const url = `${API}?action=addstock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) { return { success: false, msg: "Network error" }; }
};

window.supDeductUser = async function(mat, user, qty) {
    const url = `${API}?action=return&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&status=USED&admin=Supervisor`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) { return { success: false, msg: "Network error" }; }
};
