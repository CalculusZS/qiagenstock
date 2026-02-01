/* ===== 1. Configuration & Global Variables ===== */
const API = "https://script.google.com/macros/s/AKfycbxQVNIf-QRiQVibH601ijLM57fBSjAlZJcEfzNhFn5X8VjTukJQXkv5vtib-jzaybImnw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 
let logoutTimer;

/* ===== 2. Auto Logout System (ฟังก์ชันดั้งเดิมของคุณ) ===== */
function resetLogoutTimer() {
    clearTimeout(logoutTimer);
    if (sessionStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isSupervisor') === 'true') {
        logoutTimer = setTimeout(() => {
            alert("Session Timeout. Please login again.");
            window.logout();
        }, 300000); // 5 minutes
    }
}
window.onload = resetLogoutTimer;
window.onmousemove = resetLogoutTimer;
window.onclick = resetLogoutTimer;
window.onkeypress = resetLogoutTimer;

/* ===== 3. Authentication & Navigation ===== */
window.login = function() {
    const passInput = document.getElementById('password');
    if (passInput && passInput.value.trim() === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'user-select.html';
    } else {
        alert('Incorrect Password!');
    }
};

window.logout = function() {
    sessionStorage.clear();
    window.location.href = 'index.html';
};

window.goBack = () => {
    window.location.href = 'user-select.html';
};

/* ===== 4. Data Loading (Staff & Stock) ===== */
window.loadUsers = async function() {
    try {
        const response = await fetch(`${API}?action=users&password=${PASSWORD}`);
        const res = await response.json();
        // ตรวจสอบทั้ง res.users และข้อมูลที่อาจจะมาในรูปแบบ array โดยตรง
        if (res.success && res.users) return res.users;
        return Array.isArray(res) ? res : [];
    } catch (e) {
        console.error("User Load Error:", e);
        return [];
    }
};

window.loadStockData = async function(pageType) {
    const container = document.getElementById('data');
    if (container) container.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading Inventory...</td></tr>';
    
    try {
        const response = await fetch(`${API}?action=list2&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.rows;
            renderTable(rows, pageType);
        }
    } catch (e) {
        console.error("Stock Load Error:", e);
        if (container) container.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Error loading data.</td></tr>';
    }
};

/* ===== 5. UI Rendering & Search ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    // กรองข้อมูลกรณีคืนของ (Return) ให้โชว์เฉพาะของที่ User นั้นมีอยู่
    let displayList = (type === 'return') ? dataList.filter(item => (item[currentUser] || 0) > 0) : dataList;

    container.innerHTML = displayList.map((item, index) => {
        const mat = item['Material'] || '-';
        const desc = item['Material Description'] || '-';
        const prod = item['Product Name'] || '-'; // คอลัมน์ I-N
        const inst = item['Instrument'] || '-';
        
        // กำหนดจำนวนสต็อกที่จะโชว์
        const qty = (type === 'withdraw' || type === 'all') ? (item['0243'] || 0) : (item[currentUser] || 0);
        const style = qty <= 0 ? 'color: red; font-weight: bold;' : 'font-weight: bold;';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">
                    <div style="display: flex; flex-direction: column;">
                        <b style="color: #2563eb;">${mat}</b>
                        <span style="font-size: 13px; font-weight: 500;">${prod}</span>
                        <small style="color: #64748b;">${desc}</small>
                        <small style="color: #64748b;">Inst: ${inst}</small>
                    </div>
                </td>
                <td style="text-align: center; ${style}">${qty}</td>
                <td style="text-align: right;">
                    ${type !== 'all' ? `
                    <div style="display: flex; gap: 5px; justify-content: flex-end;">
                        <input type="number" id="qty_${index}" style="width: 50px; text-align: center; border: 1px solid #ccc; border-radius: 4px;" placeholder="0">
                        <button onclick="handleAction('${type}', '${mat}', ${index})" 
                                style="background: ${type === 'withdraw' ? '#ef4444' : '#22c55e'}; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
                            ${type.toUpperCase()}
                        </button>
                    </div>` : '<span style="color: #94a3b8; font-size: 11px;">READ ONLY</span>'}
                </td>
            </tr>`;
    }).join('');
}

window.searchStock = function(keyword, type) {
    const filtered = rows.filter(r => 
        Object.values(r).some(v => String(v).toLowerCase().includes(keyword.toLowerCase()))
    );
    renderTable(filtered, type);
};

/* ===== 6. Stock Actions (Withdraw / Return) ===== */
window.handleAction = async function(type, material, index) {
    const input = document.getElementById(`qty_${index}`);
    const qty = Number(input.value);
    const user = sessionStorage.getItem('selectedUser');
    
    if (qty <= 0) return alert("Please enter a valid quantity.");
    if (!user && type !== 'all') return alert("No user selected.");

    input.disabled = true;
    try {
        const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("Success!");
            window.loadStockData(type);
        } else {
            alert("Action Failed: " + (res.message || "Unknown error"));
            input.disabled = false;
        }
    } catch (e) {
        alert("Network Error. Please try again.");
        input.disabled = false;
    }
};

/* ===== 7. Supervisor System ===== */
window.openSupModal = () => { document.getElementById('supModal').style.display = 'flex'; };
window.closeSupModal = () => { document.getElementById('supModal').style.display = 'none'; };
window.submitSupLogin = () => {
    const pass = document.getElementById('sup_pass_input').value;
    if(pass === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        window.location.href = 'supervisor.html';
    } else {
        alert("Incorrect Supervisor Password");
    }
};
