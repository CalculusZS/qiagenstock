/* ===== 1. Configuration & Global Variables ===== */
const API = "https://script.google.com/macros/s/AKfycbzh1wzSuCKFX8xR7kURgLDTkMIJcSfX7saw4zp1lhJ5Bvvz5ZABziJuGu4FjYxVoZJTQg/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 
let logoutTimer;

/* ===== 2. Auto Logout System (ฟังก์ชันดั้งเดิม) ===== */
function resetLogoutTimer() {
    clearTimeout(logoutTimer);
    if (sessionStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isSupervisor') === 'true') {
        logoutTimer = setTimeout(() => {
            alert("หมดเวลาเชื่อมต่อ กรุณาล็อกอินใหม่");
            window.logout();
        }, 300000); 
    }
}
window.onload = resetLogoutTimer;
window.onmousemove = resetLogoutTimer;
window.onclick = resetLogoutTimer;

/* ===== 3. Login & Navigation (ฟังก์ชันหลัก) ===== */
window.login = function() {
    const passInput = document.getElementById('password');
    if (passInput && passInput.value.trim() === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { alert('รหัสผ่านไม่ถูกต้อง'); }
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 4. Load Data (ดึงรายชื่อพนักงานและข้อมูล Sheets) ===== */
window.loadUsers = async function() {
    sessionStorage.removeItem('selectedUser'); 
    try {
        const response = await fetch(`${API}?action=users&password=${PASSWORD}`);
        const res = await response.json();
        return res.success ? res.users : [];
    } catch (e) { return []; }
};

window.loadStockData = async function(pageType) {
    try {
        const response = await fetch(`${API}?action=list2&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.rows;
            if (document.getElementById('data')) renderTable(rows, pageType);
        }
    } catch (e) { console.error("Load Stock Error"); }
};

/* ===== 5. UI Rendering (แสดงผลคอลัมน์ I-N และ Instrument) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    let displayList = (type === 'return') ? dataList.filter(item => (item[currentUser] || 0) > 0) : dataList;

    container.innerHTML = displayList.map((item, index) => {
        // ดึงข้อมูลจากคอลัมน์ Material, Product Name (I-N), และ Instrument
        const mat = item['Material'] || '-';
        const prod = item['Product Name'] || item['Material Description'] || 'N/A';
        const inst = item['Instrument'] || '-';
        const typeInfo = item['Type'] || '-';
        
        // สต็อกคอลัมน์ 0243
        const qty = (type === 'withdraw' || type === 'all') ? (item['0243'] || 0) : (item[currentUser] || 0);
        const style = qty === 0 ? 'color: red; font-weight: bold;' : 'font-weight: bold;';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <b style="color: #2563eb;">${mat}</b>
                            <span style="font-size: 13px;">${prod}</span>
                        </div>
                        <small style="color: #64748b;">Inst: ${inst} | Type: ${typeInfo}</small>
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
                    </div>` : '<span style="color: #94a3b8; font-size: 11px;">VIEW ONLY</span>'}
                </td>
            </tr>`;
    }).join('');
}

/* ===== 6. Supervisor & Actions (คงเดิม) ===== */
window.handleAction = async function(type, material, index) {
    const qty = Number(document.getElementById(`qty_${index}`).value);
    const user = sessionStorage.getItem('selectedUser');
    if (qty <= 0) return alert("ระบุจำนวน");
    try {
        const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("สำเร็จ!"); window.loadStockData(type); }
    } catch (e) { alert("เกิดข้อผิดพลาด"); }
};

window.openSupModal = () => { document.getElementById('supModal').style.display = 'flex'; };
window.closeSupModal = () => { document.getElementById('supModal').style.display = 'none'; };
window.submitSupLogin = () => {
    if(document.getElementById('sup_pass_input').value === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else { alert("รหัสผ่านไม่ถูกต้อง"); }
};
