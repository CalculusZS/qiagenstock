/* ===== 1. Configuration ===== */
// สำคัญ: นำ URL ที่ได้จากการ Deploy Apps Script มาวางที่นี่
const API = "https://script.google.com/macros/s/AKfycbzTeYhQQadjV74n3tLZvX4Hmxhp_0vJRUSy7H_866kGXxmh1aGGhSiMV82Hc5fIVvVVGg/exec";           
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
    } else if (passInput === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else {
        alert('Incorrect Password!');
    }
};
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 3. Data Loading & Rendering ===== */
window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading...</td></tr>';
    
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

    tbody.innerHTML = data.map((r) => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;
        
        // ข้อมูลสินค้าแสดงบรรทัดเดียว (Material | Name)
        const itemInfo = `<div style="font-weight:bold;">${r.Material} <span style="font-weight:normal; font-size:12px; color:#64748b;">| ${r['Product Name']}</span></div>`;

        // เงื่อนไขสำหรับหน้า showall.html (type === 'all')
        if (type === 'all') {
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:center;"><span style="color:${isOut?'#ef4444':'#16a34a'}">${isOut?'OUT':'IN STOCK'}</span></td>
            </tr>`;
        }

        // เงื่อนไขสำหรับหน้า main.html (type === 'withdraw')
        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" 
                        style="background:${isOut?'#cbd5e1':'#003366'}; color:white; border:none; padding:8px 12px; border-radius:6px;" 
                        ${isOut ? 'disabled' : ''}>Withdraw</button>
                </td>
            </tr>`;
        }

        // เงื่อนไขสำหรับหน้า main.html (type === 'return')
        if (type === 'return') {
            if (userStock <= 0) return '';
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${userStock}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'return')" 
                        style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px;">Return</button>
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

/* ===== 5. Helpers ===== */
window.findProductByMat = (m) => rows.find(r => String(r.Material) === String(m));
window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};

// ฟังก์ชันเดิมของ Supervisor
window.supAddStock = async function(mat, qty) {
    return await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
};
window.supDeductUser = async function(mat, user, qty) {
    return await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
};
