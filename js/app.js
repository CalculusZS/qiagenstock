/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbyL887e7XHftaD8e8lIRIxN3MA90t1GFvka0GiIa4hZQ-Jh5zGlHZG5QKkqa9NqmfeWIA/exec";     
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
let rows = []; 

/* ===== 2. Authentication & Navigation ===== */
window.login = () => {
    const v = document.getElementById('password')?.value.trim();
    if (v === PASSWORD) { sessionStorage.setItem('isLoggedIn', 'true'); location.href = 'user-select.html'; }
    else { alert('รหัสผ่านไม่ถูกต้อง!'); }
};
window.goBack = () => { location.href = 'user-select.html'; };
window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };

/* ===== 3. Data Loader ===== */
window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ กำลังโหลดข้อมูล...</td></tr>';
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; 
            window.renderTable(rows, type);
        }
    } catch (e) { if(tbody) tbody.innerHTML = '<tr><td colspan="3">การเชื่อมต่อขัดข้อง</td></tr>'; }
};

/* ===== 4. Rendering (ทุกหน้าเป็นบรรทัดเดียว) ===== */
window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;
        
        // ข้อมูลบรรทัดเดียว: [Material] Product Name
        const itemDisplayName = `<strong>${r.Material}</strong> | <span style="font-size:12px; color:#555;">${r['Product Name']}</span>`;

        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:10px;">${itemDisplayName}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" style="background:${isOut?'#ccc':'#2563eb'}; color:white; border:none; padding:6px 12px; border-radius:4px;" ${isOut ? 'disabled' : ''}>Withdraw</button>
                </td>
            </tr>`;
        }
        if (type === 'return') {
            if (userStock <= 0) return ''; // ถ้าพนักงานไม่มีของ ไม่ต้องโชว์ในหน้า Return
            return `<tr>
                <td style="padding:10px;">${itemDisplayName}</td>
                <td style="text-align:center; font-weight:bold;">${userStock}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" style="width:40px; text-align:center;">
                    <button onclick="doAction('${r.Material}', 'return')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:4px;">Return</button>
                </td>
            </tr>`;
        }
        if (type === 'all') {
            return `<tr>
                <td style="padding:10px;">${itemDisplayName}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; padding-right:15px;"><span style="color:${isOut?'red':'green'}; font-size:12px; font-weight:bold;">${isOut?'OUT':'AVAILABLE'}</span></td>
            </tr>`;
        }
    }).join('');
};

/* ===== 5. Actions ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const input = document.getElementById(`q_${mat}`);
    const qty = input.value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { alert("ดำเนินการสำเร็จ!"); await window.loadStockData(mode); }
        else { alert("ผิดพลาด: " + res.msg); }
    } catch (e) { alert("เครือข่ายขัดข้อง"); }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};

window.findProductByMat = (mat) => rows.find(r => String(r.Material).trim() === String(mat).trim());
window.supAddStock = async (mat, qty) => fetch(`${API}?action=addstock&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r=>r.json());
window.supDeductUser = async (mat, user, qty) => fetch(`${API}?action=return&status=USED&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
