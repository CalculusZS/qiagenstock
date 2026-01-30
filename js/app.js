/* ===== 1. Configuration & Global Variables ===== */
const API = "https://script.google.com/macros/s/AKfycbwo6dwFjysW-4jdUtkOoImfyw2fjCGurNO0zmSbFfNkvXoTB7ZkXTnvtUjea7xl-LRznA/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; // ตัวแปรหลักสำหรับเก็บข้อมูลสต็อก

/* ===== 2. Authentication & Navigation ===== */
window.login = function() {
    const passValue = document.getElementById('password')?.value.trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { 
        alert('Invalid Password!'); 
    }
};

window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html'; 
    } else if (p !== null) { 
        alert("Wrong Password!"); 
    }
};

window.goBack = () => { 
    location.href = 'user-select.html'; 
};

/* ===== 3. Data Loading Functions ===== */
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        return res.success ? res.users : [];
    } catch (e) { 
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
            // เรียกฟังก์ชันรีเฟรชตารางในหน้า Supervisor (ถ้ามี)
            if (typeof refreshTable === 'function') {
                refreshTable();
            }
        }
    } catch (e) { 
        console.error("Load failed", e); 
    }
};

/* ===== 4. Helper Function ===== */
window.findProductByMaterial = (mat) => {
    if (!rows) return null;
    return rows.find(r => String(r.Material).trim() === String(mat).trim());
};

/* ===== 5. UI Rendering (สำหรับหน้าพนักงานเบิก-คืน) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    container.innerHTML = dataList.map((item, index) => {
        // เลือกยอดสต็อกตามประเภทหน้า: Withdraw ดูจาก H(0243), Return ดูจากชื่อพนักงาน
        const stockQty = type === 'withdraw' ? (item['0243'] || 0) : 
                         type === 'return' ? (item[currentUser] || 0) : (item['0243'] || 0);
        
        const actionUI = (type === 'withdraw' || type === 'return') ? `
            <div style="display:flex; gap:5px; justify-content:flex-end;">
                <input type="number" id="qty_${index}" style="width:55px; text-align:center;" placeholder="0">
                <button onclick="handleAction('${type}', '${item.Material}', ${index})" 
                        style="background:${type==='withdraw'?'#ef4444':'#22c55e'}; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">
                    ${type.toUpperCase()}
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

/* ===== 6. Core User Actions (พนักงาน) ===== */
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

/* ===== 7. Supervisor Exclusive Actions ===== */

// เพิ่มของเข้าคลัง 0243 (คอลัมน์ H)
window.supAddStock = async function(mat, qty) {
    const url = `${API}?action=addstock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) {
        return { success: false, msg: "Network error" };
    }
};

// ตัดยอดพนักงานทิ้ง (Deduct Used) - ไม่คืนคลัง H
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
    if (document.getElementById('data')) {
        renderTable(filtered, type);
    }
    if (typeof refreshTable === 'function') {
        refreshTable(filtered);
    }
};
/* === ส่วนที่ต้องเพิ่ม/แก้ไขใน app.js === */

// 1. ฟังก์ชัน Logout (ล้างค่าทุกอย่างและกลับไปหน้าแรก)
window.logout = function() {
    sessionStorage.clear(); // ล้างข้อมูลการ Login และ User ที่เลือกไว้
    location.href = 'index.html'; // กลับไปหน้าใส่ Password แรกสุด
};

// 2. ฟังก์ชัน Login Supervisor (ให้เรียกใช้เหมือนหน้าแรก)
window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html'; 
    } else if (p !== null) { 
        alert("Wrong Password!"); 
    }
};

// 3. ฟังก์ชันดึงรายชื่อพนักงาน (สำหรับแสดงผลในหน้า user-select.html)
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            return res.users;
        } else {
            console.error("API Error:", res.msg);
            return [];
        }
    } catch (e) { 
        console.error("Fetch Error:", e);
        return []; 
    }
};

// 4. ฟังก์ชันสำหรับการเลือก User
window.selectUser = function(name) {
    sessionStorage.setItem('selectedUser', name);
    location.href = 'main.html'; // เมื่อเลือกเสร็จให้ไปหน้าหลัก
};
