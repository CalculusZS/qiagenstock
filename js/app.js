/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbz1gryP18WZJ_nTnDDwIHP7cofuIpeKp8a60wR025wFdvlnGfhvIha6aqAm8iUfES-C/exec"; // <--- นำ URL จาก Google Apps Script มาวางที่นี่
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 15 * 60 * 1000; 

const USER_MAP = {
    "KM": "Kitti", "TK": "Tatchai", "PSO": "Parinyachat", 
    "PK": "Phurilap", "PST": "Penporn", "PA": "Phuriwat"
};

let allRows = []; 

/* ===== 2. Auth System ===== */
window.handleLogin = async function() {
    const userInp = document.getElementById('username').value.trim().toUpperCase();
    const passInp = document.getElementById('password').value.trim();
    
    if (userInp === "ADMIN" && passInp === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('isSupervisor', 'true');
        sessionStorage.setItem('selectedUser', 'Admin');
        sessionStorage.setItem('lastActivity', new Date().getTime());
        location.href = 'supervisor.html';
        return;
    }

    const fullName = USER_MAP[userInp];
    if (!fullName) return alert("❌ ไม่พบชื่อผู้ใช้งานนี้!");

    try {
        const response = await fetch(`${API}?action=checkauth&user=${encodeURIComponent(userInp)}&pass=${encodeURIComponent(passInp)}`);
        const res = await response.json();

        if (res.status === 'FIRST_TIME') {
            document.getElementById('new_user_name').innerText = res.fullName;
            document.getElementById('setupModal').style.display = 'flex';
        } else if (res.success) {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('selectedUser', res.fullName);
            sessionStorage.setItem('lastActivity', new Date().getTime());
            location.href = 'main.html';
        } else {
            alert("❌ " + res.msg);
        }
    } catch (e) { alert("เชื่อมต่อล้มเหลว"); }
};

window.saveNewPassword = async function() {
    const fullName = document.getElementById('new_user_name').innerText;
    const newPass = document.getElementById('new_pass').value;
    const confirmPass = document.getElementById('confirm_pass').value;
    if (newPass.length < 4) return alert("รหัสผ่านต้องมี 4 ตัวอักษรขึ้นไป");
    if (newPass !== confirmPass) return alert("รหัสผ่านไม่ตรงกัน!");

    try {
        const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(fullName)}&newPass=${encodeURIComponent(newPass)}`).then(r => r.json());
        if (res.success) {
            alert("✅ ตั้งรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบ");
            location.reload();
        }
    } catch (e) { alert("Error"); }
};

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) { location.href = 'index.html'; return false; }
    return true;
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

/* ===== 3. Stock Functions (Withdraw, Return, Read) ===== */
window.loadStockData = async function(mode = 'withdraw') {
    const container = document.getElementById('data') || document.getElementById('staff-data');
    if(container) container.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    
    try {
        const res = await fetch(`${API}?action=read&password=${MASTER_PASS}`).then(r => r.json());
        if (res.success) {
            allRows = res.data;
            renderTable(allRows, mode);
        }
    } catch (e) { console.error(e); }
};

function renderTable(data, mode) {
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if(!tbody) return;
    const currentUser = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach((item, idx) => {
        const stock0243 = item['0243'] || 0;
        const myStock = item[currentUser] || 0;

        if (mode === 'all') {
            html += `<tr>
                <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                <td align="center">${stock0243}</td>
                <td><small>${item.Instrument}</small></td>
            </tr>`;
        } else if (mode === 'withdraw' && stock0243 > 0) {
            html += `<tr>
                <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                <td align="center"><span class="badge">${stock0243}</span></td>
                <td align="right">
                    <input type="number" id="qty-${idx}" value="1" min="1" max="${stock0243}" class="qty-input-sm">
                    <button class="btn-action" onclick="doTransaction('${item.Material}', 'withdraw', ${idx})">Get</button>
                </td>
            </tr>`;
        } else if (mode === 'return' && myStock > 0) {
            html += `<tr>
                <td><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
                <td align="center"><span class="badge" style="background:#16a34a">${myStock}</span></td>
                <td align="right">
                    <input type="number" id="qty-${idx}" value="1" min="1" max="${myStock}" class="qty-input-sm">
                    <button class="btn-action" style="background:#16a34a" onclick="doTransaction('${item.Material}', 'return', ${idx})">Return</button>
                </td>
            </tr>`;
        }
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center">No items found.</td></tr>';
}

window.doTransaction = async function(mat, type, idx) {
    const qty = document.getElementById(`qty-${idx}`).value;
    const user = sessionStorage.getItem('selectedUser');
    if(!confirm(`Confirm ${type} ${qty} units?`)) return;

    try {
        const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&password=${MASTER_PASS}`).then(r => r.json());
        if(res.success) { alert("✅ Success!"); location.reload(); }
        else { alert("❌ " + res.msg); }
    } catch(e) { alert("Transaction Failed"); }
};

window.goBack = () => history.back();
