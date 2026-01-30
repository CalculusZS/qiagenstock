const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 

/* ===== 1. Authentication ===== */
window.login = function() {
    const passValue = document.getElementById('password')?.value.trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { alert('Invalid Password!'); }
};

/* ===== 2. Data Fetching (ดึงชื่อจากคอลัมน์ที่กำหนด) ===== */
window.loadUsers = async function() {
    try {
        const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
        const res = await fetch(url).then(r => r.json());
        // ตรวจสอบข้อมูลชื่อพนักงาน (I-N)
        return res.success ? res.users : [];
    } catch (e) { return []; }
};

window.loadStockData = async function(pageType) {
    try {
        const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            rows = res.rows;
            if (pageType === 'all') renderNormalTable(rows);
            else renderSmartTable(rows, pageType);
        }
    } catch (e) { console.error(e); }
};

/* ===== 3. Rendering Table (กู้คืนหน้าตาเดิมและข้อมูลครบ) ===== */
function renderSmartTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    container.innerHTML = dataList.map((item, index) => {
        // ดึง Stock จากคอลัมน์ 0243 (เบิก) หรือชื่อพนักงาน (คืน)
        const stockQty = type === 'withdraw' ? (item['0243'] || 0) : (item[currentUser] || 0);
        return `
            <tr class="item-row">
                <td>
                    <div class="inst-tag" style="font-size:10px; color:#2563eb; font-weight:bold;">${item.Instrument || '-'}</div>
                    <div style="font-weight:800; font-size:15px;">${item.Material}</div>
                    <div style="font-size:12px; color:#64748b;">${item['Product Name'] || ''}</div>
                </td>
                <td style="text-align:center; font-size:18px; font-weight:bold;">${stockQty}</td>
                <td>
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${index}" style="width:50px; text-align:center; border-radius:5px; border:1px solid #ddd;" placeholder="0">
                        <button onclick="handleAction('${type}', '${item.Material}', ${index})" 
                                style="background:${type==='withdraw'?'#ef4444':'#22c55e'}; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">
                            ${type==='withdraw'?'เบิก':'คืน'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderNormalTable(dataList) {
    const container = document.getElementById('data');
    if (!container) return;
    container.innerHTML = dataList.map(item => `
        <tr>
            <td style="font-size:12px;">${item.Instrument || '-'}</td>
            <td><b>${item.Material}</b></td>
            <td style="font-size:12px;">${item['Product Name'] || ''}</td>
            <td style="text-align:center; font-weight:bold; color:#2563eb;">${item['0243'] || 0}</td>
        </tr>
    `).join('');
}

/* ===== 4. Actions & Search ===== */
window.handleAction = async function(type, material, index) {
    const input = document.getElementById(`qty_${index}`);
    const qty = Number(input.value);
    const user = sessionStorage.getItem('selectedUser');
    if (qty <= 0) return alert("กรุณาระบุจำนวน");
    
    input.disabled = true;
    const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("สำเร็จ!"); window.loadStockData(type); }
    else { alert("ล้มเหลว: " + res.msg); input.disabled = false; }
};

window.searchStock = function(keyword, type) {
    const k = keyword.toLowerCase();
    const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k)));
    if (type === 'all') renderNormalTable(filtered);
    else renderSmartTable(filtered, type);
};

window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 5. Supervisor Login ===== */
window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        alert("Supervisor access granted!");
        // สามารถเพิ่มการเปลี่ยนหน้าไปหน้าจัดการสต็อกได้ที่นี่
    } else { alert("Wrong Password!"); }
};
