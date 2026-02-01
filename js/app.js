/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbyL887e7XHftaD8e8lIRIxN3MA90t1GFvka0GiIa4hZQ-Jh5zGlHZG5QKkqa9NqmfeWIA/exec";     
const PASSWORD = "Service";
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];

let rows = []; 

/* ===== 2. Basic Functions ===== */
window.goBack = () => { location.href = 'user-select.html'; };
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };

window.loadUsers = async function() {
    return STAFF_NAMES.map(name => ({ header: name }));
};

/* ===== 3. Data Loader (ดึงข้อมูลสต็อก) ===== */
window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading Inventory...</td></tr>';
    
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; // เก็บข้อมูลลงตัวแปรกลาง
            window.renderTable(rows, type);
        }
    } catch (e) { 
        if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">❌ Connection Error</td></tr>'; 
    }
};

/* ===== 4. Rendering Table (จัดการหน้า All Parts และหน้าหลัก) ===== */
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;
        
        // Single Line Format: Code | Name
        const itemInfo = `<strong>${r.Material}</strong> | <span style="font-size:12px; color:#64748b;">${r['Product Name']}</span>`;

        // หน้า All Parts (โหมด 'all')
        if (type === 'all') {
            return `<tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; padding-right:15px;">
                    <span style="color:${isOut?'#ef4444':'#16a34a'}; font-weight:bold; font-size:12px;">
                        ${isOut ? 'OUT' : 'IN STOCK'}
                    </span>
                </td>
            </tr>`;
        }

        // หน้า Withdraw
        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:10px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center; border:1px solid #ddd; border-radius:4px; padding:4px;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" style="background:${isOut?'#cbd5e1':'#003366'}; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;" ${isOut ? 'disabled' : ''}>Withdraw</button>
                </td>
            </tr>`;
        }

        // หน้า Return (โชว์เฉพาะที่ user มีของ)
        if (type === 'return') {
            if (userStock <= 0) return '';
            return `<tr>
                <td style="padding:10px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${userStock}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" style="width:40px; text-align:center; border:1px solid #ddd; border-radius:4px; padding:4px;">
                    <button onclick="doAction('${r.Material}', 'return')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Return</button>
                </td>
            </tr>`;
        }
    }).join('');
};

/* ===== 5. Search & Action ===== */
window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};

window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { alert("Success!"); await window.loadStockData(mode); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};
