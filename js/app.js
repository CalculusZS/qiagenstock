/* ===== 1. Configuration & Global Variables ===== */
const API = "https://script.google.com/macros/s/AKfycbwo6dwFjysW-4jdUtkOoImfyw2fjCGurNO0zmSbFfNkvXoTB7ZkXTnvtUjea7xl-LRznA/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 

/* ===== 2. Authentication & Navigation ===== */
// ฟังก์ชัน Login หน้าแรก
window.login = function() {
    const passValue = document.getElementById('password')?.value.trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { 
        alert('Invalid Password!'); 
    }
};

// ฟังก์ชัน Login Supervisor (ใช้ได้ทั้งหน้าแรกและหน้า User Select)
window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        alert("Supervisor access granted!");
        location.href = 'supervisor.html'; 
    } else if (p !== null) { 
        alert("Wrong Password!"); 
    }
};

// ฟังก์ชัน Logout: ล้างค่าทุกอย่างและกลับหน้าแรก
window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

window.goBack = () => { 
    location.href = 'user-select.html'; 
};

/* ===== 3. Data Loading Functions ===== */
window.loadUsers = async function() {
    try {
        // บังคับล้างค่า User ที่เคยเลือกไว้ทันทีที่โหลดหน้ารายชื่อ [โจทย์: ไม่จำค่าเก่า]
        sessionStorage.removeItem('selectedUser');
        
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        return res.success ? res.users : [];
    } catch (e) { 
        console.error("Load users failed", e);
        return []; 
    }
};

window.loadStockData = async function(pageType) {
    try {
        const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.rows;
            if (document.getElementById('data')) {
                renderTable(rows, pageType);
            }
            if (typeof refreshTable === 'function') {
                refreshTable();
            }
        }
    } catch (e) { 
        console.error("Load stock failed", e); 
    }
};

/* ===== 4. Helper Functions ===== */
window.findProductByMaterial = (mat) => {
    if (!rows) return null;
    return rows.find(r => String(r.Material).trim() === String(mat).trim());
};

/* ===== 5. UI Rendering (หน้าพนักงาน) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    container.innerHTML = dataList.map((item, index) => {
        const stockQty = type === 'withdraw' ? (item['0243'] || 0) : 
                         type === 'return' ? (item[currentUser] || 0) : (item['0243'] || 0);
        
        const actionUI = (type === 'withdraw' || type === 'return') ? `
            <div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" style="width:55px; text-align:center; border:1px solid #ddd; border-radius:5px;" placeholder="0">
                <button onclick="handleAction('${type}', '${item.Material}', ${index})" 
                        style="background:${type==='withdraw'?'#ef4444':'#22c55e'}; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">
                    ${type==='withdraw'?'WITHDRAW':'RETURN'}
                </button>
            </div>` : '';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">
                    <div style="font-size:10px; color:#2563eb; font-weight:bold;">${item.Instrument || '-'}</div>
                    <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                    <div style="font-size:11px; color:#64748b;">${item['Product Name'] || ''}</div>
                </td>
                <td style="text-align:center; font-weight:bold;">${stockQty}</td>
                <td style="text-align:right;">${actionUI}</td>
            </tr>
        `;
    }).join('');
}

/* ===== 6. Core Actions (พนักงาน) ===== */
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
            alert("Failed: " + res.msg);
            input.disabled = false;
        }
    } catch (e) { 
        alert("Network Error"); 
        input.disabled = false; 
    }
};

/* ===== 7. Supervisor Actions ===== */
window.supAddStock = async function(mat, qty) {
    const url = `${API}?action=addStock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=Supervisor`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) {
        return { success: false, msg: "Network error" };
    }
};

window.supDeductUser = async function(mat, user, qty) {
    const url = `${API}?action=return&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&status=USED&admin=Supervisor`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) {
        return { success: false, msg: "Network error" };
    }
};

/* ===== 8. Search Function ===== */
window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        Object.values(r).some(v => String(v).toLowerCase().includes(keyword.toLowerCase()))
    );
    if (document.getElementById('data')) renderTable(filtered, type);
    if (typeof refreshTable === 'function') refreshTable(filtered); 
};
/* ===== ปรับปรุงส่วนที่ 5. UI Rendering ใน app.js ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    // กรองข้อมูล: ถ้าเป็นโหมด Return ให้โชว์เฉพาะรายการที่พนักงานคนนั้นมีของ > 0 [โจทย์: โชว์เฉพาะอะไหล่ที่ตัวเองมี]
    let displayList = dataList;
    if (type === 'return') {
        displayList = dataList.filter(item => (item[currentUser] || 0) > 0);
    }

    container.innerHTML = displayList.map((item, index) => {
        // ดึงจำนวนสต็อกตามโหมด
        const stockQty = type === 'withdraw' ? (item['0243'] || 0) : (item[currentUser] || 0);
        
        // กำหนดสี: ถ้าจำนวนเป็น 0 ให้เป็นสีแดง [โจทย์: ถ้าจำนวนเป็น 0 ให้ตัวหนังสือเป็นสีแดง]
        const qtyStyle = stockQty === 0 ? 'color: #ef4444; font-weight: bold;' : 'font-weight: bold;';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-size: 13px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #2563eb; font-weight: bold; min-width: 80px;">${item.Material}</span>
                        <span style="color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${item['Product Name'] || ''}</span>
                        <span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${item.Instrument || '-'}</span>
                    </div>
                </td>
                <td style="text-align: center; width: 60px; ${qtyStyle}">${stockQty}</td>
                <td style="text-align: right; width: 150px;">
                    <div style="display: flex; gap: 5px; justify-content: flex-end;">
                        <input type="number" id="qty_${index}" style="width: 50px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" placeholder="0">
                        <button onclick="handleAction('${type}', '${item.Material}', ${index})" 
                                style="background: ${type === 'withdraw' ? '#ef4444' : '#22c55e'}; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
                            ${type.toUpperCase()}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
/* ส่วนอื่นๆ ของ app.js ให้คงเดิมตาม Full Version ที่ส่งให้ก่อนหน้า */
