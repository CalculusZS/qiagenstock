const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";

let rows = []; 

/* ===== 1. Fix Authentication (Global Scope) ===== */
window.login = function() {
    const passInput = document.getElementById('password');
    const passValue = (passInput?.value || '').trim();
    if (passValue === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else {
        alert('Invalid Password!');
    }
};

/* ===== 2. Data Fetching (Users & Stock) ===== */
window.loadUsers = async function() {
    try {
        const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
        const response = await fetch(url);
        const data = await response.json();
        // ตรวจสอบว่าถ้า data.users เป็น Object ให้ดึงเฉพาะค่าที่เป็นชื่อมา
        return data.success ? data.users : [];
    } catch (error) {
        console.error("Fetch Error:", error);
        return [];
    }
};

window.loadStockData = async function(pageType) {
    try {
        const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
            rows = data.rows;
            renderSmartTable(rows, pageType);
        }
    } catch (error) {
        console.error("Error loading stock:", error);
    }
};

/* ===== 3. Rendering Functions (สวยงาม + ครบถ้วน) ===== */
function renderSmartTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    container.innerHTML = dataList.map((item, index) => {
        const stockQty = type === 'withdraw' ? (item['0243'] || 0) : (item[currentUser] || 0);
        return `
            <tr class="item-row">
                <td>
                    <div style="font-size:10px; color:#2563eb; font-weight:bold; text-transform:uppercase;">${item.Instrument || '-'}</div>
                    <div style="font-weight:800; font-size:15px; color:#1e293b;">${item.Material}</div>
                    <div style="font-size:12px; color:#64748b;">${item['Product Name'] || ''}</div>
                </td>
                <td style="text-align:center; font-size:18px; font-weight:bold; color:#1e293b;">${stockQty}</td>
                <td>
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${index}" style="width:55px; height:38px; text-align:center; border:1px solid #ddd; border-radius:8px;" placeholder="0">
                        <button onclick="handleAction('${type}', '${item.Material}', ${index})" 
                                style="background:${type==='withdraw'?'#ef4444':'#22c55e'}; color:white; border:none; padding:0 12px; border-radius:8px; font-weight:bold; cursor:pointer; height:38px;">
                            ${type==='withdraw'?'เบิก':'คืน'}
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

    if (qty <= 0) return alert("กรุณาใส่จำนวน");
    
    input.disabled = true;
    const url = `${API}?action=${type}&password=${encodeURIComponent(PASSWORD)}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result.success) {
            alert("บันทึกสำเร็จ!");
            window.loadStockData(type);
        } else {
            alert("ล้มเหลว: " + result.msg);
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
    renderSmartTable(filtered, type);
};

window.goBack = () => { location.href = 'user-select.html'; };
