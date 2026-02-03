/* ===== CONFIGURATION ===== */
const API = "https://script.google.com/macros/s/AKfycbzzniWvRgSWhQEoSI2UzXfTdPK1Dp181RHWesV25pNWwD8aPWQp18yMuFgELRrYlCxd/exec"; 
const PASSWORD = "Service";
let rows = [];

/* ===== 1. LOAD DATA (ทุกหน้า) ===== */
window.loadStockData = async function(type) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="4" align="center">⌛ Loading...</td></tr>';
    
    try {
        const response = await fetch(`${API}?action=read&password=${PASSWORD}&t=${Date.now()}`);
        const res = await response.json();
        if (res.success) {
            rows = res.data;
            if (document.getElementById('data')) window.renderTable(rows, type);
            if (document.getElementById('staff-data')) window.renderStaffInventory(rows);
            if (document.getElementById('s_mat')) window.setupAdminLookup();
        }
    } catch (e) { console.error("Error:", e); }
};

/* ===== 2. RENDER TABLE (เบิก-คืน) ===== */
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser') || "";

    tbody.innerHTML = data.map(r => {
        const stock = (type === 'return') ? (r[user] || 0) : (r['0243'] || 0);
        return `
            <tr>
                <td><b>${r.Material}</b><br><small>${r['Product Name']}</small></td>
                <td align="center"><b>${stock}</b></td>
                <td align="right">
                    <button onclick="window.doAction('${r.Material}', '${type}')" 
                    style="background:${type==='withdraw'?'#003366':'#16a34a'}; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">
                    ${type === 'withdraw' ? 'Withdraw' : 'Return'}
                    </button>
                </td>
            </tr>`;
    }).join('');
};

/* ===== 3. DO ACTION (เบิก-คืน) ===== */
window.doAction = async function(mat, type) {
    const user = sessionStorage.getItem('selectedUser');
    const qty = prompt(`จำนวนที่ต้องการ ${type}:`);
    if (!qty || isNaN(qty) || qty <= 0) return;

    try {
        const url = `${API}?action=${type}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&password=${PASSWORD}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ สำเร็จ!");
            window.loadStockData(type);
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ ติดต่อ Server ไม่ได้"); }
};

/* ===== 4. SUPERVISOR FUNCTIONS ===== */
window.renderStaffInventory = function(data) {
    const tbody = document.getElementById('staff-data');
    const staff = ["0432", "0433", "0434", "0435", "0436", "0437", "0438", "0439", "0440", "0441", "0442"];
    let html = '';
    data.forEach(row => {
        staff.forEach(user => {
            const val = Number(row[user] || 0);
            if (val > 0) {
                const tid = `in_${row.Material}_${user}`;
                html += `<tr>
                    <td><b>${row.Material}</b><br><small>${row['Product Name']}</small></td>
                    <td><span class="badge-user">${user}</span></td>
                    <td align="center"><input type="number" id="${tid}" value="${val}" style="width:50px; text-align:center;"></td>
                    <td align="right"><button onclick="window.doSupDeduct('${row.Material}','${user}','${tid}')" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">ไม่มีข้อมูลสต็อกของ Staff</td></tr>';
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim();
    const qty = document.getElementById('s_qty').value;
    const url = `${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ เพิ่มสต็อกแล้ว"); window.loadStockData(); }
};

window.doSupDeduct = async function(mat, user, tid) {
    const qty = document.getElementById(tid).value;
    const url = `${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("✅ หักสต็อกแล้ว"); window.loadStockData(); }
};

/* ===== 5. OTHERS ===== */
window.searchStock = function(query, type) {
    const q = query.toLowerCase();
    const filtered = rows.filter(r => r.Material.toString().toLowerCase().includes(q) || r['Product Name'].toString().toLowerCase().includes(q));
    window.renderTable(filtered, type);
};

window.goBack = () => window.history.back();
window.logout = () => { sessionStorage.clear(); location.href='index.html'; };
