/* ===== 1. Configuration ===== */
// หมายเหตุ: อย่าลืมเปลี่ยน API URL เป็นตัวล่าสุดที่คุณ Deploy จาก Apps Script
const API = "https://script.google.com/macros/s/AKfycbz1r6sNyuVeIr5tWrOnEduVtzzNmWIrFPwLgs6UchX24U2wVspNIZoU2lxnLa74tVDI/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 10 * 60 * 1000; // เพิ่มเป็น 10 นาที

let rows = []; 

/* ===== 2. Auth & Navigation ===== */
window.login = function() {
    const passInput = document.getElementById('password');
    if (!passInput) return;
    const val = passInput.value.trim();
    if (val === PASSWORD || val === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('lastActivity', new Date().getTime());
        if (val === SUP_PASSWORD) {
            sessionStorage.setItem('isSupervisor', 'true');
            location.href = 'supervisor.html';
        } else {
            location.href = 'user-select.html';
        }
    } else { alert('❌ Incorrect Password!'); }
};

window.checkAuth = function() {
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = new Date().getTime();
    if (!sessionStorage.getItem('isLoggedIn')) {
        location.href = 'index.html';
        return false;
    }
    if (lastActivity && (now - lastActivity > TIMEOUT_MS)) {
        alert("⏰ Session Expired!");
        sessionStorage.clear();
        location.href = 'index.html';
        return false;
    }
    sessionStorage.setItem('lastActivity', now);
    return true;
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

/* ===== 3. Global Lookup (ระบบค้นหาอัตโนมัติทุกหน้า) ===== */
window.setupGlobalLookup = function() {
    // ดักฟังการพิมพ์ในช่อง input ที่มีคำว่า 'mat' ใน id ทั้งหมด
    const matInputs = document.querySelectorAll('input[id*="mat"]');
    matInputs.forEach(input => {
        input.addEventListener('input', function() {
            const val = this.value.trim();
            // หาจุดแสดงชื่อ โดยเริ่มจาก s_name_display หรือ id ที่สัมพันธ์กัน
            const display = document.getElementById('s_name_display') || 
                            document.getElementById(this.id.replace('mat', 'name_display')) ||
                            document.getElementById('name_display');

            if (display) {
                const item = rows.find(r => String(r.Material) === val);
                if (item) {
                    display.innerText = "Product: " + item['Product Name'];
                    display.style.color = "#003366";
                    display.style.fontWeight = "bold";
                } else {
                    display.innerText = val === "" ? "" : "❌ Material not found";
                    display.style.color = "#ef4444";
                }
            }
        });
    });
};

/* ===== 4. Data Loading & Rendering ===== */
window.loadStockData = async function(type) {
    if (!window.checkAuth()) return;
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="5" align="center">⌛ Loading Latest Data...</td></tr>';
    
    try {
        const response = await fetch(`${API}?action=read&password=${PASSWORD}&_t=${new Date().getTime()}`);
        const res = await response.json();
        if (res.success) {
            rows = res.data;
            if (document.getElementById('data')) window.renderTable(rows, type);
            if (document.getElementById('staff-data')) window.renderStaffInventory(rows);
            
            // เปิดใช้งานระบบค้นหาทันทีที่โหลดข้อมูลเสร็จ
            window.setupGlobalLookup();
        }
    } catch (e) { console.error("Error:", e); }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    let html = '';
    data.forEach(row => {
        const stock0243 = row['0243'] || 0;
        const userStock = row[user] || 0;
        html += `<tr>
            <td><b>${row.Material}</b><br><small>${row['Product Name']}</small></td>
            <td align="center">${stock0243}</td>
            <td align="center">${userStock}</td>
            <td><input type="number" id="q_${row.Material}" value="1" min="1" style="width:40px;"></td>
            <td>
                <button onclick="window.doAction('${row.Material}','withdraw')" class="btn-in">Withdraw</button>
                <button onclick="window.doAction('${row.Material}','return')" class="btn-out">Return</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.renderStaffInventory = function(data) {
    const tbody = document.getElementById('staff-data');
    const users = ['Kitti','Tatchai','Parinyachat','Phurilap','Penporn','Phuriwat'];
    let html = '';
    users.forEach(user => {
        data.forEach(row => {
            const val = row[user] || 0;
            if (val > 0) {
                const tid = `sup_${user}_${row.Material}`;
                html += `<tr>
                    <td>${user}</td>
                    <td><b>${row.Material}</b><br><small>${row['Product Name']}</small></td>
                    <td><input type="number" id="${tid}" value="${val}" style="width:40px;"></td>
                    <td align="right">
                        <button onclick="window.doSupDeduct('${row.Material}','${user}','${tid}')" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">Deduct</button>
                    </td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

/* ===== 5. Actions (ครบทุก Function) ===== */
window.doAction = async function(mat, mode) {
    if (!window.checkAuth()) return;
    const user = sessionStorage.getItem('selectedUser');
    const qtyInput = document.getElementById(`q_${mat}`);
    const qty = qtyInput ? qtyInput.value : 1;
    
    if (qty <= 0) { alert("Please enter valid quantity"); return; }

    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&_t=${new Date().getTime()}`).then(r=>r.json());
        if (res.success) { 
            alert("✅ Success!"); 
            window.loadStockData(); 
        } else { 
            alert("❌ Error: " + res.msg); 
        }
    } catch (e) { alert("Network Error"); }
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim();
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) { alert("Fill all fields"); return; }
    try {
        const res = await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&_t=${new Date().getTime()}`).then(r=>r.json());
        if(res.success) { alert("✅ Stock Added"); location.reload(); } else { alert("❌ " + res.msg); }
    } catch(e) { alert("Error"); }
};

window.doSupDeduct = async function(mat, user, tid) {
    const qty = document.getElementById(tid).value;
    try {
        const res = await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}&_t=${new Date().getTime()}`).then(r => r.json());
        if (res.success) { alert("✅ Deducted Successfully"); window.loadStockData(); } else { alert("❌ " + res.msg); }
    } catch (e) { alert("Error"); }
};

window.doTransfer = async function() {
    const mat = document.getElementById('t_mat').value.trim();
    const from = document.getElementById('t_from').value;
    const to = document.getElementById('t_to').value;
    const qty = document.getElementById('t_qty').value;
    
    if(!mat || from === to || !qty) { alert("Check your inputs"); return; }
    
    try {
        const res = await fetch(`${API}?action=transfer&password=${PASSWORD}&material=${encodeURIComponent(mat)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&qty=${qty}&_t=${new Date().getTime()}`).then(r=>r.json());
        if(res.success) { alert("✅ Transfer Success"); location.reload(); } else { alert("❌ " + res.msg); }
    } catch(e) { alert("Error"); }
};
