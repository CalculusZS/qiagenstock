/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbyL887e7XHftaD8e8lIRIxN3MA90t1GFvka0GiIa4hZQ-Jh5zGlHZG5QKkqa9NqmfeWIA/exec";     
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

// รายชื่อพนักงานตรงตาม Column I ถึง N ใน Google Sheets
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
let rows = []; 

/* ===== 2. Authentication (แก้ปัญหา Login ไม่ได้) ===== */
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
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading Inventory...</td></tr>';
    
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; 
            window.renderTable(rows, type);
        }
    } catch (e) { 
        if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">❌ Connection Error</td></tr>'; 
    }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map((r, index) => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;
        const itemInfo = `<strong>${r.Material}</strong> | <span style="font-size:12px; color:#64748b;">${r['Product Name']}</span>`;

        if (type === 'all') { // สำหรับหน้า All Parts (0243)
            return `<tr>
                <td style="padding:10px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; padding-right:15px;">
                    <span style="color:${isOut?'#ef4444':'#16a34a'}; font-weight:bold;">${isOut?'OUT':'IN STOCK'}</span>
                </td>
            </tr>`;
        }

        if (type === 'withdraw') { // หน้าเบิก
            return `<tr>
                <td style="padding:10px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" style="background:${isOut?'#cbd5e1':'#003366'}; color:white; border:none; padding:6px 12px; border-radius:4px;" ${isOut ? 'disabled' : ''}>Withdraw</button>
                </td>
            </tr>`;
        }

        if (type === 'return') { // หน้าคืน
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
    }).join('');
};

/* ===== 4. Transaction Actions (เบิก/คืน) ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { alert("Success!"); await window.loadStockData(mode); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

/* ===== 5. Supervisor Actions (เพิ่ม/ลดสต็อก) ===== */
window.addStock = async function() {
    const mat = document.getElementById('add_mat').value;
    const qty = document.getElementById('add_qty').value;
    if(!mat || !qty) return alert("Please enter Material and Quantity");

    try {
        const res = await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
        if(res.success) { alert("Stock Added!"); location.reload(); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

window.deductStock = async function(mat, user, qtyId) {
    const qty = document.getElementById(qtyId).value;
    if(!confirm(`Confirm deduct ${qty} units from ${user}?`)) return;

    try {
        const res = await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
        if(res.success) { alert("Stock Deducted!"); location.reload(); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};
};
