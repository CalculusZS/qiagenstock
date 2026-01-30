const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 

/* ===== 1. Authentication & Supervisor (แก้ให้เด้งไปหน้าจัดการ) ===== */
window.login = function() {
    const passInput = document.getElementById('password');
    if (passInput?.value.trim() === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { alert('Invalid Password!'); }
};

window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:"); 
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        alert("Supervisor access granted!");
        // เปลี่ยนหน้าไปยังไฟล์ supervisor.html ที่คุณอัปโหลดไว้
        location.href = 'supervisor.html'; 
    } else if (p !== null) { 
        alert("Wrong Password!"); 
    }
};

/* ===== 2. Data Fetching (ดึงรายชื่อจากคอลัมน์ I-N) ===== */
window.loadUsers = async function() {
    try {
        const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
        return res.success ? res.users : [];
    } catch (e) { return []; }
};

window.loadStockData = async function(pageType) {
    try {
        const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.rows;
            renderTable(rows, pageType);
        }
    } catch (e) { console.error("Error loading data", e); }
};

/* ===== 3. UI Rendering (ข้อมูลครบ: Instrument, Material, Name) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    container.innerHTML = dataList.map((item, index) => {
        // เลือกคอลัมน์สต็อกตามประเภทหน้า
        const stockQty = type === 'withdraw' ? (item['0243'] || 0) : (item[currentUser] || 0);
        
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">
                    <div style="font-size:10px; color:#2563eb; font-weight:bold;">${item.Instrument || '-'}</div>
                    <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                    <div style="font-size:11px; color:#64748b;">${item['Product Name'] || ''}</div>
                </td>
                <td style="text-align:center; font-weight:bold; font-size:16px;">${stockQty}</td>
                <td style="text-align:right;">
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${index}" style="width:50px; text-align:center; border:1px solid #ddd; border-radius:5px;" placeholder="0">
                        <button onclick="handleAction('${type}', '${item.Material}', ${index})" 
                                style="background:${type==='withdraw'?'#ef4444':'#22c55e'}; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">
                            ${type==='withdraw'?'WITHDRAW':'RETURN'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.handleAction = async function(type, material, index) {
    const input = document.getElementById(`qty_${index}`);
    const qty = Number(input.value);
    const user = sessionStorage.getItem('selectedUser');

    if (qty <= 0) return alert("Please enter quantity");
    
    input.disabled = true;
    try {
        const res = await fetch(`${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r => r.json());
        if (res.success) {
            alert("Success!");
            window.loadStockData(type);
        } else {
            alert("Error: " + res.msg);
            input.disabled = false;
        }
    } catch (e) {
        alert("Network Error");
        input.disabled = false;
    }
};

window.searchStock = (k, t) => {
    const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k.toLowerCase())));
    renderTable(filtered, t);
};

window.goBack = () => { location.href = 'user-select.html'; };
