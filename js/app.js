/* ===== 1. Configuration & Global Variables ===== */
const API = "https://script.google.com/macros/s/AKfycbwo6dwFjysW-4jdUtkOoImfyw2fjCGurNO0zmSbFfNkvXoTB7ZkXTnvtUjea7xl-LRznA/exec";    
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
let rows = []; 

/* ===== 2. User & Stock Loading ===== */
window.loadUsers = async function() {
    try {
        const response = await fetch(`${API}?action=users&password=${PASSWORD}`);
        const res = await response.json();
        return res.success ? res.users : [];
    } catch (e) { return []; }
};

window.loadStockData = async function(pageType) {
    const container = document.getElementById('data');
    if (container) container.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading Data...</td></tr>';
    try {
        const response = await fetch(`${API}?action=list2&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.rows;
            renderTable(rows, pageType);
        }
    } catch (e) { console.error("API Error"); }
};

/* ===== 3. Rendering Table (แสดง Instrument + Product Name I-N) ===== */
function renderTable(dataList, type) {
    const container = document.getElementById('data');
    if (!container) return;
    const currentUser = sessionStorage.getItem('selectedUser') || '';

    let displayList = (type === 'return') ? dataList.filter(item => (item[currentUser] || 0) > 0) : dataList;

    container.innerHTML = displayList.map((item, index) => {
        const mat = item['Material'] || '-';
        const prod = item['Product Name'] || item['Material Description'] || 'N/A';
        const inst = item['Instrument'] || '-';
        const typeInfo = item['Type'] || '-';
        
        const qty = (type === 'withdraw' || type === 'all') ? (item['0243'] || 0) : (item[currentUser] || 0);
        const style = qty === 0 ? 'color: red; font-weight: bold;' : 'font-weight: bold;';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <b style="color: #2563eb;">${mat}</b>
                            <span style="font-size: 13px;">${prod}</span>
                        </div>
                        <small style="color: #64748b;">${inst} | ${typeInfo}</small>
                    </div>
                </td>
                <td style="text-align: center; ${style}">${qty}</td>
                <td style="text-align: right;">
                    ${type !== 'all' ? `
                    <div style="display: flex; gap: 5px; justify-content: flex-end;">
                        <input type="number" id="qty_${index}" style="width: 45px;" placeholder="0">
                        <button onclick="handleAction('${type}', '${mat}', ${index})" 
                                style="background: ${type === 'withdraw' ? '#ef4444' : '#22c55e'}; color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                            ${type}
                        </button>
                    </div>` : '<span style="color: #94a3b8; font-size: 11px;">View Only</span>'}
                </td>
            </tr>`;
    }).join('');
}

/* ===== 4. Core Logic & Supervisor ===== */
window.handleAction = async function(type, material, index) {
    const qty = Number(document.getElementById(`qty_${index}`).value);
    const user = sessionStorage.getItem('selectedUser');
    if (qty <= 0) return alert("Please enter quantity");
    try {
        const url = `${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("Success!"); window.loadStockData(type); }
    } catch (e) { alert("Failed"); }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(keyword.toLowerCase())));
    renderTable(filtered, type);
};

window.openSupModal = () => { document.getElementById('supModal').style.display = 'flex'; };
window.closeSupModal = () => { document.getElementById('supModal').style.display = 'none'; };
window.submitSupLogin = () => {
    if(document.getElementById('sup_pass_input').value === SUP_PASSWORD) {
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else { alert("Wrong Password"); }
};
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { location.href = 'user-select.html'; };
