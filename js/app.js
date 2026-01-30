const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";

/* ===== 1. Fix Authentication (Global Scope) ===== */
window.login = function() {
    const passInput = document.getElementById('password');
    const passValue = (passInput?.value || '').trim();
    
    if (passValue === PASSWORD) {
        // บันทึกสถานะว่าล็อกอินแล้ว (เผื่อใช้ตรวจสอบ)
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else {
        alert('Invalid Password! (Hint: Service)');
    }
};

/* ===== 2. Data Fetching Functions ===== */
window.loadUsers = async function() {
    try {
        const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.success ? data.users : [];
    } catch (error) {
        console.error("Fetch Error:", error);
        return [];
    }
};

// ... (ฟังก์ชันอื่นๆ เช่น loadStockData, handleTransaction ให้คงไว้ตามเดิม แต่เพิ่ม window. นำหน้าชื่อฟังก์ชัน)

async function loadStockData(pageType) {
    try {
        const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
            rows = data.rows;
            // Render either Smart Table (Withdraw/Return) or Normal Table (All Stock)
            if (pageType === 'withdraw' || pageType === 'return') {
                renderSmartTable(rows, pageType);
            } else {
                renderNormalTable(rows);
            }
        }
    } catch (error) {
        console.error("Error loading stock data:", error);
    }
}

/* ===== 5. UI Renderers (Smart Inline & Normal) ===== */

// Smart Table for Withdraw/Return with Inline Inputs
function renderSmartTable(dataList, type) {
    const container = qs('data');
    if (!container) return;
    const currentUser = resolveUser();

    container.innerHTML = dataList.map((item, index) => {
        // Show stock from '0243' for withdraw, or user's column for return
        const currentStock = type === 'withdraw' ? (item['0243'] || 0) : (item[currentUser] || 0);
        const btnClass = type === 'withdraw' ? 'btn-danger' : 'btn-success';
        const btnLabel = type === 'withdraw' ? 'Withdraw' : 'Return';

        return `
            <tr class="item-row">
                <td>
                    <div class="inst-tag" style="font-size:10px; color:#2563eb; font-weight:bold;">${item.Instrument || '-'}</div>
                    <div class="mat-code" style="font-weight:bold; font-size:15px; color:#1e293b;">${item.Material}</div>
                    <div class="prod-name" style="font-size:12px; color:#64748b;">${item['Product Name'] || ''}</div>
                </td>
                <td class="stock-cell" style="text-align:center; font-size:18px; font-weight:bold;">${currentStock}</td>
                <td>
                    <div class="inline-action" style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${index}" class="qty-input-sm" placeholder="0" min="1" 
                               style="width:55px; height:38px; text-align:center; border:1px solid #ddd; border-radius:8px;">
                        <button class="${btnClass}" 
                                style="height:38px; border-radius:8px; border:none; color:white; padding:0 12px; font-weight:bold; cursor:pointer;"
                                onclick="handleTransaction('${type}', '${item.Material}', ${index})">
                            ${btnLabel}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Normal Table for All Stock Page
function renderNormalTable(dataList) {
    const container = qs('data');
    if (!container) return;
    container.innerHTML = dataList.map(item => `
        <tr>
            <td>${item.Instrument || ''}</td>
            <td><b>${item.Material}</b></td>
            <td>${item['Product Name'] || ''}</td>
            <td>${item.Type || ''}</td>
            <td style="color:#2563eb; font-weight:bold; text-align:center;">${item['0243'] || 0}</td>
        </tr>
    `).join('');
}

/* ===== 6. Transaction Handlers ===== */
async function handleTransaction(type, material, index) {
    const input = qs(`qty_${index}`);
    const qty = Number(input.value);
    const user = resolveUser();

    if (qty <= 0) {
        alert("Please enter a valid quantity");
        return;
    }
    
    input.disabled = true; // Prevent double click
    const url = `${API}?action=${type}&password=${encodeURIComponent(PASSWORD)}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result.success) {
            alert("Transaction Successful!");
            loadStockData(type); // Refresh data
        } else {
            alert("Error: " + result.msg);
            input.disabled = false;
        }
    } catch (err) {
        alert("Network Error, please try again.");
        input.disabled = false;
    }
}

/* ===== 7. Supervisor Functions ===== */
async function supAddStock(material, qty) {
    const url = `${API}?action=sup_add_stock&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}`;
    return await fetch(url).then(r => r.json());
}

async function supSetUserQty({ material, user, qty, status = 'SET' }) {
    const url = `${API}?action=sup_set_user_qty&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${encodeURIComponent(material)}&user=${encodeURIComponent(user)}&qty=${qty}&status=${status}`;
    return await fetch(url).then(r => r.json());
}

/* ===== 8. Search & Filtering ===== */
function searchStock(keyword, pageType) {
    const k = (keyword || '').toLowerCase();
    const filtered = rows.filter(r => 
        Object.values(r).some(v => String(v).toLowerCase().includes(k))
    );
    if (pageType === 'withdraw' || pageType === 'return') {
        renderSmartTable(filtered, pageType);
    } else {
        renderNormalTable(filtered);
    }
}
