/* ===== 1. Configuration & Global Variables ===== */
const API = "https://script.google.com/macros/s/AKfycbzh1wzSuCKFX8xR7kURgLDTkMIJcSfX7saw4zp1lhJ5Bvvz5ZABziJuGu4FjYxVoZJTQg/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
let rows = []; 
let logoutTimer;

/* ===== 2. Auto Logout System (Original Function) ===== */
function resetLogoutTimer() {
    clearTimeout(logoutTimer);
    if (sessionStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isSupervisor') === 'true') {
        logoutTimer = setTimeout(() => {
            alert("Session Timeout. Please login again.");
            window.logout();
        }, 300000); // 5 Minutes
    }
}
window.onload = resetLogoutTimer;
window.onmousemove = resetLogoutTimer;
window.onclick = resetLogoutTimer;

/* ===== 3. Login & Authentication (Original Function) ===== */
window.login = function() {
    const passInput = document.getElementById('password');
    if (passInput && passInput.value.trim() === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else {
        alert('Incorrect Password!');
    }
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

/* ===== 4. Data Loading (Staff & Stock) ===== */
window.loadUsers = async function() {
    sessionStorage.removeItem('selectedUser'); 
    try {
        const response = await fetch(`${API}?action=users&password=${PASSWORD}`);
        const res = await response.json();
        return res.success ? res.users : [];
    } catch (e) {
        console.error("User loading error:", e);
        return [];
    }
};

window.loadStockData = async function(pageType) {
    try {
        const response = await fetch(`${API}?action=list2&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.rows;
            if (document.getElementById('data')) renderTable(rows, pageType);
        }
    } catch (e) {
        console.error("Stock loading error:", e);
    }
};

/* ===== 5. UI Rendering (Including I-N Product Name & Instrument) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    let displayList = (type === 'return') ? dataList.filter(item => (item[currentUser] || 0) > 0) : dataList;

    container.innerHTML = displayList.map((item, index) => {
        // ดึงข้อมูล Material, Description และเพิ่ม Product Name (I-N), Instrument ตามต้องการ
        const mat = item['Material'] || '-';
        const desc = item['Material Description'] || '-';
        const prodName = item['Product Name'] || '-'; // ดึงข้อมูลจากคอลัมน์ I-N
        const inst = item['Instrument'] || '-';       // ดึงข้อมูลจาก Instrument
        
        const qty = (type === 'withdraw' || type === 'all') ? (item['0243'] || 0) : (item[currentUser] || 0);
        const style = qty === 0 ? 'color: red; font-weight: bold;' : 'font-weight: bold;';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">
                    <div style="display: flex; flex-direction: column;">
                        <b style="color: #2563eb;">${mat}</b>
                        <span style="font-size: 13px;">${prodName}</span>
                        <small style="color: #64748b;">${desc}</small>
                        <small style="color: #64748b;"><b>Instrument:</b> ${inst}</small>
                    </div>
                </td>
                <td style="text-align: center; ${style}">${qty}</td>
                <td style="text-align: right;">
                    ${type !== 'all' ? `
                    <div style="display: flex; gap: 5px; justify-content: flex-end;">
                        <input type="number" id="qty_${index}" style="width: 45px; text-align: center;" placeholder="0">
                        <button onclick="handleAction('${type}', '${mat}', ${index})" 
                                style="background: ${type === 'withdraw' ? '#ef4444' : '#22c55e'}; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
                            ${type.toUpperCase()}
                        </button>
                    </div>` : '<span style="color: #94a3b8; font-size: 11px;">View Only</span>'}
                </td>
            </tr>`;
    }).join('');
}

/* ===== 6. Supervisor & Actions (Original Function) ===== */
window.handleAction = async function(type, material, index) {
    const input = document.getElementById(`qty_${index}`);
    const qty = Number(input.value);
    const user = sessionStorage.getItem('selectedUser');
    if (qty <= 0) return alert("Please enter quantity");
    
    input.disabled = true;
    try {
        const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("Success!");
            window.loadStockData(type);
        } else {
            alert("Action Failed!");
            input.disabled = false;
        }
    } catch (e) {
        alert("Connection Error");
        input.disabled = false;
    }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(keyword.toLowerCase())));
    renderTable(filtered, type);
};

window.openSupModal = () => { document.getElementById('supModal').style.display = 'flex'; };
window.closeSupModal = () => { document.getElementById('supModal').style.display = 'none'; };
window.submitSupLogin = () => {
    if(document.getElementById('sup_pass_input').value === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else { alert("Incorrect Password"); }
};
window.goBack = () => { location.href = 'user-select.html'; };
