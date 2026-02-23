/* ========================================================================== 
   QIAGEN INVENTORY - CUSTOM MASTER CONTROL (SYNC WITH BACKEND V7.1)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

// แมพตัวย่อเป็นชื่อคอลัมน์ใน Google Sheet (ต้องสะกดให้ตรงกับหัวตาราง)
const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.allRows = [];

/* ===== 1. AUTH & FORCE PASSWORD CHANGE ===== */
window.handleLogin = async function() {
    const uInput = document.getElementById('username-input');
    const pInput = document.getElementById('password-input');
    if (!uInput || !pInput) return;

    const userKey = uInput.value.trim().toUpperCase();
    const passVal = pInput.value.trim();

    // Supervisor Login
    if (passVal === SUP_PASSWORD || userKey === 'SUPERVISOR') {
        sessionStorage.setItem('userKey', 'Supervisor');
        sessionStorage.setItem('selectedUser', 'Supervisor');
        location.href = 'supervisor.html';
        return;
    }

    try {
        const url = `${API}?action=checkauth&user=${encodeURIComponent(userKey)}&pass=${encodeURIComponent(passVal)}`;
        const res = await fetch(url).then(r => r.json());
        
        if (res && res.success) {
            sessionStorage.setItem('userKey', userKey);
            sessionStorage.setItem('selectedUser', res.fullName || USER_MAP[userKey]);

            if (res.status === 'NEW') {
                showForcePasswordChange(userKey);
            } else {
                location.href = 'main.html';
            }
        } else {
            alert("❌ Login Failed: " + (res.msg || "Invalid Credentials"));
        }
    } catch (e) { alert("❌ Connection Error"); }
};

function showForcePasswordChange(userKey) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:9999;";
    overlay.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;text-align:center;width:320px;">
            <h2 style="color:#003366">Set New Password</h2>
            <p style="font-size:12px;color:red;">First time login require password change</p>
            <input type="password" id="new-p1" placeholder="New Password" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:8px;">
            <input type="password" id="new-p2" placeholder="Confirm Password" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:8px;">
            <button onclick="processReset('${userKey}')" style="width:100%;padding:12px;background:#003366;color:white;border:none;border-radius:10px;font-weight:bold;margin-top:10px;">Update & Login</button>
        </div>`;
    document.body.appendChild(overlay);
}

window.processReset = async function(userKey) {
    const p1 = document.getElementById('new-p1').value;
    const p2 = document.getElementById('new-p2').value;
    if (!p1 || p1 !== p2) return alert("❌ Passwords do not match!");

    const res = await fetch(`${API}?action=setpassword&user=${encodeURIComponent(userKey)}&newPass=${encodeURIComponent(p1)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) {
        alert("✅ Password Updated!");
        location.href = 'main.html';
    } else {
        alert("❌ Error updating password");
    }
};

/* ===== 2. DATA RENDERING (WITHDRAW / RETURN / DEDUCT / SHOWALL) ===== */
window.loadStockData = async function(mode) {
    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) { console.error(e); }
};

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    const user = sessionStorage.getItem('selectedUser');
    
    // ตั้งค่าคอลัมน์ที่ต้องการดึงข้อมูล
    const isCentralMode = (mode === 'withdraw' || mode === 'all');
    
    tbody.innerHTML = data.map(item => {
        const stock0243 = Number(item['0243'] || 0);
        const userStock = Number(item[user] || 0);
        
        const displayQty = isCentralMode ? stock0243 : userStock;

        // เงื่อนไข Return & Deduct: โชว์เฉพาะของที่มีติดตัว
        if ((mode === 'return' || mode === 'deduct') && userStock <= 0) return '';

        // จัดการหน้าตาของ Stock
        let qtyStyle = "font-weight:bold;";
        let actionBtn = "";

        if (mode === 'withdraw') {
            if (stock0243 <= 0) {
                qtyStyle += "color:red;"; // ของหมดแสดงสีแดง
                actionBtn = `<span style="color:red;font-size:12px;font-weight:bold;">OUT OF STOCK</span>`;
            } else {
                actionBtn = `<button onclick="executeAction('withdraw','${item.Material}',1)" class="btn-primary">Withdraw</button>`;
            }
        } else if (mode === 'return') {
            actionBtn = `<button onclick="executeAction('return','${item.Material}',1)" class="btn-success">Return</button>`;
        } else if (mode === 'deduct') {
            actionBtn = `<button onclick="handleDeduct('${item.Material}')" class="btn-danger">USE (DEDUCT)</button>`;
        } else if (mode === 'all') {
            qtyStyle += (stock0243 <= 0) ? "color:red;" : "color:green;";
            actionBtn = (stock0243 <= 0) ? "Empty" : "Available";
        }

        return `<tr>
            <td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name']}</small></td>
            <td align="center" style="${qtyStyle}">${displayQty}</td>
            <td align="right">${actionBtn}</td>
        </tr>`;
    }).join('');
};

/* ===== 3. CORE OPERATIONS (WITH WO# ENFORCEMENT) ===== */
window.handleDeduct = async function(mat) {
    const user = sessionStorage.getItem('userKey'); // ใช้ ID (KM, PK) ในการส่งหา API
    const wo = prompt("⚠️ REQUIRE: Enter Work Order (WO#) before deduct:");
    if (!wo) return alert("❌ Action cancelled. WO# is required.");

    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) {
        alert("✅ Deduct Success");
        loadStockData('deduct');
    }
};

window.executeAction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('userKey');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) {
        alert(`✅ ${type} Success`);
        loadStockData(type);
    }
};

/* ===== 4. HISTORY (SYNC WITH TRANSACTION_LOG) ===== */
window.loadHistory = async function() {
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    try {
        const res = await fetch(`${API}?action=gethistory`).then(r => r.json());
        if (res.success) {
            // หัวคอลัมน์จากชีต: Date/Material/Instrument/Product Name/Transaction Type/Qty/User/Work Order
            listDiv.innerHTML = res.data.map(row => `
                <div class="history-row" style="display:flex;font-size:12px;border-bottom:1px solid #eee;padding:8px;">
                    <div style="flex:1;">${new Date(row[0]).toLocaleString()}</div>
                    <div style="flex:0.5;">${row[1]}</div>
                    <div style="flex:1;">${row[3]}</div>
                    <div style="flex:0.5;font-weight:bold;">${row[4]}</div>
                    <div style="flex:0.3;text-align:center;">${row[5]}</div>
                    <div style="flex:0.5;text-align:right;">${row[6]}</div>
                    <div style="flex:0.5;text-align:right;color:blue;">${row[7] || '-'}</div>
                </div>`).join('');
        }
    } catch (e) { console.error(e); }
};

/* ===== 5. UI UTILS ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
    }
    const display = document.getElementById('user_display') || document.getElementById('current-user');
    if (display) display.innerText = user;
};

window.logout = () => { sessionStorage.clear(); location.replace('index.html'); };
window.goBack = () => { history.back(); };
window.searchStock = function(q, mode) {
    const filter = window.allRows.filter(r => 
        String(r.Material).toLowerCase().includes(q.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(q.toLowerCase())
    );
    renderTable(filter, mode);
};

window.checkAuth();
