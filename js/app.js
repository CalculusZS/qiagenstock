const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; 

const qs = id => document.getElementById(id);
const resolveUser = () => sessionStorage.getItem('selectedUser') || '';

/* ===== 1. Authentication & Supervisor ===== */
window.login = function() {
    const passValue = qs('password')?.value.trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else { alert('Invalid Password!'); }
};

window.checkSupervisor = function() {
    const p = prompt("Enter Supervisor Password:");
    if (p === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        alert("Supervisor access granted!");
        // สามารถเพิ่มการเปลี่ยนหน้าไปยังหน้า Manage ได้ที่นี่
    } else { alert("Wrong Password!"); }
};

/* ===== 2. Data Fetching (ดึงชื่อคอลัมน์ I-N) ===== */
window.loadUsers = async function() {
    try {
        const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
        const res = await fetch(url).then(r => r.json());
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
    } catch (e) { console.error("Load failed", e); }
};

/* ===== 3. UI Rendering (ข้อมูลครบ: Instrument, Material, Name) ===== */
function renderSmartTable(dataList, type) {
    const container = qs('data');
    if (!container) return;
    const currentUser = resolveUser();

    container.innerHTML = dataList.map((item, index) => {
        // ดึงค่า Stock: '0243' สำหรับ Withdraw และชื่อ User สำหรับ Return
        const currentStock = type === 'withdraw' ? (item['0243'] || 0) : (item[currentUser] || 0);
        return `
            <tr class="item-row">
                <td style="padding: 10px;">
                    <div style="font-size:10px; color:#2563eb; font-weight:bold;">${item.Instrument || '-'}</div>
                    <div style="font-weight:bold; font-size:15px; color:#1e293b;">${item.Material}</div>
                    <div style="font-size:12px; color:#64748b;">${item['Product Name'] || ''}</div>
                </td>
                <td style="text-align:center; font-size:18px; font-weight:bold;">${currentStock}</td>
                <td style="text-align:right; padding-right:10px;">
                    <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                        <input type="number" id="qty_${index}" style="width:55px; height:38px; text-align:center; border:1px solid #ddd; border-radius:8px;" placeholder="0">
                        <button class="${type==='withdraw'?'btn-danger':'btn-success'}" 
                                style="height:38px; border-radius:8px; border:none; color:white; padding:0 12px; font-weight:bold; cursor:pointer;"
                                onclick="handleAction('${type}', '${item.Material}', ${index})">
                            ${type==='withdraw'?'WITHDRAW':'RETURN'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderNormalTable(dataList) {
    const container = qs('data');
    if (!container) return;
    container.innerHTML = dataList.map(item => `
        <tr>
            <td style="padding:10px;">
                <div style="font-size:10px; font-weight:bold; color:#2563eb;">${item.Instrument || '-'}</div>
                <div style="font-weight:bold;">${item.Material}</div>
                <div style="font-size:12px;">${item['Product Name'] || ''}</div>
            </td>
            <td style="text-align:center; font-weight:bold; color:#1e293b;">${item['0243'] || 0}</td>
        </tr>
    `).join('');
}

/* ===== 4. Actions & Search ===== */
window.handleAction = async function(type, material, index) {
    const input = qs(`qty_${index}`);
    const qty = Number(input.value);
    const user = resolveUser();

    if (qty <= 0) return alert("Please enter quantity");
    
    input.disabled = true;
    const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("Success!");
            window.loadStockData(type);
        } else {
            alert("Error: " + res.msg);
            input.disabled = false;
        }
    } catch (err) {
        alert("Network Error");
        input.disabled = false;
    }
};

window.searchStock = function(keyword, type) {
    const k = keyword.toLowerCase();
    const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k)));
    if (type === 'all') renderNormalTable(filtered);
    else renderSmartTable(filtered, type);
};

window.goBack = () => { location.href = 'user-select.html'; };
