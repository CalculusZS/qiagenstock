const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
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
        alert("Supervisor access granted!");
        location.href = 'supervisor.html'; 
    } else if (p !== null) { 
        alert("Wrong Password!"); 
    }
};

window.goBack = () => { 
    location.href = 'user-select.html'; 
};

/* ===== 3. Data Loading Functions ===== */
// ฟังก์ชันดึงรายชื่อพนักงาน (ใช้ในหน้า user-select.html)
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        return res.success ? res.users : [];
    } catch (e) { 
        console.error("Load users failed", e);
        return []; 
    }
};

// ฟังก์ชันดึงข้อมูลสต็อก (ใช้ทุกหน้า)
window.loadStockData = async function(pageType) {
    try {
        const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.rows;
            // เรนเดอร์ตารางสำหรับหน้าพนักงาน
            if (document.getElementById('data')) {
                renderTable(rows, pageType);
            }
            // รีเฟรชตารางสำหรับหน้า Supervisor
            if (typeof refreshTable === 'function') {
                refreshTable();
            }
        }
    } catch (e) { 
        console.error("Load stock failed", e); 
    }
};

/* ===== 4. Helper Functions ===== */
// ค้นหาสินค้าจากเลข Material (ใช้ทำ Auto-lookup ในหน้า Supervisor)
window.findProductByMaterial = (mat) => {
    if (!rows) return null;
    return rows.find(r => String(r.Material).trim() === String(mat).trim());
};

/* ===== 5. UI Rendering (For Withdraw / Return / Show All) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    container.innerHTML = dataList.map((item, index) => {
        // เลือกจำนวนสต็อกที่จะโชว์
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

/* ===== 6. Core Actions (พนักงาน เบิก-คืน) ===== */
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

/* ===== 7. Supervisor Actions (บันทึก Log เป็น Supervisor) ===== */
// เติมสต็อกเข้าคลังกลาง
window.supAddStock = async function(mat, qty) {
    const url = `${API}?action=addStock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=Supervisor`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) {
        return { success: false, msg: "Network error" };
    }
};

// ตัดยอดออกจากตัวบุคคล (Deduct Used)
window.supDeductUser = async function(mat, user, qty) {
    // ส่ง admin=Supervisor เพื่อลงบันทึก Log การตัดยอด
    const url = `${API}?action=return&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&status=USED&admin=Supervisor`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) {
        return { success: false, msg: "Network error" };
    }
};

/* ===== 8. Search Function (สำหรับช่องค้นหา) ===== */
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
