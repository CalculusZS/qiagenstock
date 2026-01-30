/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
let rows = []; 

/* ===== 2. Authentication & Navigation ===== */
window.login = function() {
    const p = document.getElementById('password')?.value.trim();
    if (p === PASSWORD) { sessionStorage.setItem('isLoggedIn', 'true'); location.href = 'user-select.html'; }
    else { alert('Invalid Password!'); }
};

window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:");
    if (p === SUP_PASSWORD) { sessionStorage.setItem('isSupervisor', 'true'); location.href = 'supervisor.html'; }
    else if (p !== null) { alert("Wrong Password!"); }
};

window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 3. Data Loading ===== */
window.loadStockData = async function(type) {
    try {
        const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.rows;
            if (document.getElementById('data')) renderTable(rows, type);
            if (typeof refreshTable === 'function') refreshTable(); 
        }
    } catch (e) { console.error("Load failed", e); }
};

// ฟังก์ชันหาชื่อสินค้าเพื่อโชว์อัตโนมัติ
window.findProductByMaterial = (mat) => {
    if (!rows) return null;
    return rows.find(r => String(r.Material).trim() === String(mat).trim());
};

/* ===== 4. Supervisor Actions (เพิ่มเข้าคลัง 0243 และ Log เป็น Supervisor) ===== */
window.supAddStock = async function(mat, qty) {
    // ระบุ user=Supervisor เพื่อให้ระบบบวกเลขเข้าคอลัมน์ H (0243)
    const url = `${API}?action=addStock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=Supervisor`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) { return { success: false, msg: "Network error" }; }
};

window.supDeductUser = async function(mat, user, qty) {
    // ระบุ admin=Supervisor เพื่อบันทึกชื่อผู้ทำรายการใน Log
    const url = `${API}?action=return&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&status=USED&admin=Supervisor`;
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (e) { return { success: false, msg: "Network error" }; }
};

/* ===== 5. Common Actions & Search ===== */
window.handleAction = async function(type, material, index) {
    const qty = Number(document.getElementById(`qty_${index}`).value);
    const user = sessionStorage.getItem('selectedUser');
    if (qty <= 0) return alert("Enter quantity");
    const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) { alert("Success!"); window.loadStockData(type); }
};

window.searchStock = (k, t) => {
    const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k.toLowerCase())));
    if (document.getElementById('data')) renderTable(filtered, t);
    if (typeof refreshTable === 'function') refreshTable(filtered);
};

// ฟังก์ชันเรนเดอร์ตารางพนักงาน
function renderTable(data, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const user = sessionStorage.getItem('selectedUser') || '';
    container.innerHTML = data.map((item, i) => {
        const qty = type === 'withdraw' ? (item['0243'] || 0) : (type === 'return' ? (item[user] || 0) : (item['0243'] || 0));
        return `<tr><td style="padding:10px;"><div style="font-size:10px;color:#2563eb;font-weight:bold;">${item.Instrument||'-'}</div><div style="font-weight:bold;">${item.Material}</div><div style="font-size:11px;color:#64748b;">${item['Product Name']||''}</div></td>
        <td style="text-align:center;font-weight:bold;">${qty}</td>
        <td style="text-align:right;">${(type==='withdraw'||type==='return')?`<input type="number" id="qty_${i}" style="width:50px;text-align:center;"><button onclick="handleAction('${type}','${item.Material}',${i})" style="background:${type==='withdraw'?'#ef4444':'#22c55e'};color:white;border:none;padding:8px;border-radius:5px;">${type.toUpperCase()}</button>`:''}</td></tr>`;
    }).join('');
}
