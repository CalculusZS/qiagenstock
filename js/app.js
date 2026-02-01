const API = "https://script.google.com/macros/s/AKfycbwd2Db27tpGfv1STLX8N6I6tBv5CDYkAM4bHbsxQDJ8wgRLqP_f3kvwkleemCH9DrEf/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
let rows = []; 

// 1. ระบบ Login (Global)
window.login = function() {
    const passInput = document.getElementById('password').value.trim();
    if (passInput === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else if (passInput === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else { alert('Incorrect Password!'); }
};

window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { location.href = 'user-select.html'; };

// 2. โหลดข้อมูลสต็อก
window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Inventory...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; 
            window.renderTable(rows, type);
        }
    } catch (e) { console.error(e); }
};

// 3. วาดตาราง (แยกโหมด Withdraw/Return/All)
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const s0243 = Number(r['0243'] || 0);
        const sUser = Number(r[user] || 0);
        const info = `<b>${r.Material}</b><br><small>${r['Product Name']}</small>`;

        if (type === 'all') return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="center">${s0243>0?'IN':'OUT'}</td></tr>`;
        
        if (type === 'withdraw') {
            return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="right">
                <input type="number" id="q_${r.Material}" value="1" style="width:40px">
                <button onclick="doAction('${r.Material}','withdraw')" style="background:#003366;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Withdraw</button>
            </td></tr>`;
        }
        if (type === 'return' && sUser > 0) {
            return `<tr><td>${info}</td><td align="center">${sUser}</td><td align="right">
                <input type="number" id="q_${r.Material}" value="1" style="width:40px">
                <button onclick="doAction('${r.Material}','return')" style="background:#16a34a;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Return</button>
            </td></tr>`;
        }
    }).join('');
};

// 4. ทำรายการ (เบิก/คืน)
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const qtyInput = document.getElementById(`q_${mat}`);
    const qty = qtyInput.value;
    
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if(res.success) { 
            alert("Transaction Complete!"); 
            await loadStockData(mode); 
        } else alert(res.msg);
    } catch (e) { alert("Connection Error"); }
};

// 5. ระบบค้นหา (Search)
window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material).toLowerCase().includes(keyword.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};

// 6. Supervisor Functions
window.supAddStock = async (mat, qty) => fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
window.supDeductUser = async (mat, user, qty) => fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
