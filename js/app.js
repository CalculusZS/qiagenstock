/* ===== 1. Configuration & Global Variables ===== */
const API = "https://script.google.com/macros/s/AKfycbwo6dwFjysW-4jdUtkOoImfyw2fjCGurNO0zmSbFfNkvXoTB7ZkXTnvtUjea7xl-LRznA/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 
let logoutTimer;

/* ===== 2. Auto Logout System (5 Minutes) ===== */
function resetLogoutTimer() {
    clearTimeout(logoutTimer);
    if (sessionStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isSupervisor') === 'true') {
        logoutTimer = setTimeout(() => {
            alert("Session expired due to inactivity.");
            window.logout();
        }, 300000); 
    }
}
window.onload = resetLogoutTimer;
window.onmousemove = resetLogoutTimer;
window.onclick = resetLogoutTimer;

/* ===== 3. Authentication & Navigation ===== */
window.login = function() {
    const passValue = document.getElementById('password')?.value.trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { alert('Invalid Password!'); }
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 4. Data Loading (แก้ไขให้รองรับคอลัมน์ I-N และดึงข้อมูลสำเร็จ) ===== */
window.loadUsers = async function() {
    sessionStorage.removeItem('selectedUser'); 
    try {
        const response = await fetch(`${API}?action=users&password=${PASSWORD}`);
        const res = await response.json();
        return res.success ? res.users : [];
    } catch (e) {
        console.error("API Error (Users):", e);
        return [];
    }
};

window.loadStockData = async function(pageType) {
    try {
        // เพิ่ม Loader ระหว่างรอข้อมูล
        const container = document.getElementById('data');
        if (container) container.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">กำลังโหลดข้อมูลสต็อก...</td></tr>';

        const response = await fetch(`${API}?action=list2&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.rows;
            if (container) renderTable(rows, pageType);
            if (typeof refreshTable === 'function') refreshTable(); 
        } else {
            if (container) container.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">โหลดข้อมูลไม่สำเร็จ</td></tr>';
        }
    } catch (e) { 
        console.error("API Error (Stock):", e); 
    }
};

/* ===== 5. UI Rendering (แสดงชื่ออะไหล่จากคอลัมน์ I-N และเลข 0 สีแดง) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    let displayList = (type === 'return') ? dataList.filter(item => (item[currentUser] || 0) > 0) : dataList;

    container.innerHTML = displayList.map((item, index) => {
        // ดึงชื่ออะไหล่จากคอลัมน์ Product Name (I-N) หรือ Material Description
        const productName = item['Product Name'] || item['Material Description'] || 'N/A';
        const instrument = item['Instrument'] || '-';
        
        const stockQty = (type === 'withdraw' || type === 'all') ? (item['0243'] || 0) : (item[currentUser] || 0);
        const qtyStyle = stockQty === 0 ? 'color: #ef4444; font-weight: bold;' : 'font-weight: bold;';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <b style="color: #2563eb; min-width: 80px; font-size: 14px;">${item.Material}</b>
                            <span style="font-size: 13px; color: #334155;">${productName}</span>
                        </div>
                        <small style="color: #94a3b8;">${instrument}</small>
                    </div>
                </td>
                <td style="text-align: center; ${qtyStyle}">${stockQty}</td>
                <td style="text-align: right; padding-right:10px;">
                    ${type !== 'all' ? `
                    <div style="display: flex; gap: 5px; justify-content: flex-end;">
                        <input type="number" id="qty_${index}" style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 5px;" placeholder="0">
                        <button onclick="handleAction('${type}', '${item.Material}', ${index})" 
                                style="background: ${type === 'withdraw' ? '#ef4444' : '#22c55e'}; color: white; border: none; padding: 7px 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">
                            ${type.toUpperCase()}
                        </button>
                    </div>` : '<span style="color: #94a3b8; font-size: 11px; font-weight: bold;">VIEW ONLY</span>'}
                </td>
            </tr>`;
    }).join('');
}

/* ===== 6. Core Actions เดิม (เบิก/คืน/ค้นหา) ===== */
window.handleAction = async function(type, material, index) {
    const input = document.getElementById(`qty_${index}`);
    const qty = Number(input.value);
    const user = sessionStorage.getItem('selectedUser');
    if (qty <= 0) return alert("Please enter quantity");
    input.disabled = true;
    try {
        const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("Success!"); window.loadStockData(type); }
        else { alert("Failed: " + res.msg); input.disabled = false; }
    } catch (e) { alert("Error"); input.disabled = false; }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(keyword.toLowerCase())));
    renderTable(filtered, type);
};

/* ===== 7. Supervisor ออปชั่นเดิมที่ทำสำเร็จ (ห้ามตัดออก) ===== */
window.openSupModal = () => { document.getElementById('supModal').style.display = 'flex'; };
window.closeSupModal = () => { document.getElementById('supModal').style.display = 'none'; };
window.submitSupLogin = () => {
    if(document.getElementById('sup_pass_input').value === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else { alert("Wrong Password!"); }
};
window.findProductByMaterial = (mat) => rows.find(r => String(r.Material).trim() === String(mat).trim());
window.supAddStock = async function(mat, qty) {
    const url = `${API}?action=addStock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=Supervisor`;
    return await fetch(url).then(r => r.json());
};
window.supDeductUser = async function(mat, user, qty) {
    const url = `${API}?action=return&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&status=USED&admin=Supervisor`;
    return await fetch(url).then(r => r.json());
};
