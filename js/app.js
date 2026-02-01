/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbwd2Db27tpGfv1STLX8N6I6tBv5CDYkAM4bHbsxQDJ8wgRLqP_f3kvwkleemCH9DrEf/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes Auto Logout

let rows = []; 

/* ===== 2. Authentication & Session Security ===== */
window.login = function() {
    const passInput = document.getElementById('password').value.trim();
    if (passInput === PASSWORD || passInput === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('lastActivity', new Date().getTime());
        if (passInput === SUP_PASSWORD) {
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
    if (lastActivity && (now - lastActivity > TIMEOUT_MS)) {
        alert("⏰ Session Expired - Please login again.");
        sessionStorage.clear();
        location.href = 'index.html';
        return false;
    }
    sessionStorage.setItem('lastActivity', now);
    return true;
};

window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { window.history.back(); };

/* ===== 3. Data Loading & Rendering (UI เหมือนเดิมเป๊ะ) ===== */
window.loadStockData = async function(type) {
    if (!window.checkAuth()) return;
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    
    try {
        const response = await fetch(`${API}?action=read&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.data;
            window.renderTable(rows, type);
        }
    } catch (e) { console.error("API Error:", e); }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const s0243 = Number(r['0243'] || 0);
        const sUser = Number(r[user] || 0);
        const mat = r.Material;
        const name = r['Product Name'] || '';

        // --- UI บรรทัดเดียว (Material | Name) ---
        // ใช้ <b> สำหรับ Material และ <span> สำหรับชื่อสินค้า เพื่อให้อยู่บรรทัดเดียวกัน
        const info = `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:300px;">
                        <b style="color:#1e293b;">${mat}</b> 
                        <span style="color:#64748b; font-size:13px; margin-left:8px;">${name}</span>
                      </div>`;

        if (type === 'all') {
            return `<tr>
                <td>${info}</td>
                <td align="center"><b>${s0243}</b></td>
                <td align="right" style="padding-right:15px;">${s0243 > 0 ? '✅' : '❌'}</td>
            </tr>`;
        }
        
        if (type === 'withdraw') {
            return `<tr>
                <td>${info}</td>
                <td align="center"><b>${s0243}</b></td>
                <td align="right">
                    <div class="action-cell">
                        <input type="number" id="q_${mat}" value="1" class="qty-inline">
                        <button onclick="doAction('${mat}','withdraw')" class="btn-action" style="background:#1e2937; color:white;">Withdraw</button>
                    </div>
                </td>
            </tr>`;
        }

        if (type === 'return') {
            return `<tr>
                <td>${info}</td>
                <td align="center"><b>${sUser}</b></td>
                <td align="right">
                    <div class="action-cell">
                        <input type="number" id="q_${mat}" value="1" class="qty-inline">
                        <button onclick="doAction('${mat}','return')" class="btn-action" style="background:#22c55e; color:white;">Return</button>
                    </div>
                </td>
            </tr>`;
        }
    }).join('');
};

/* ===== 4. Core Actions & Supervisor ===== */
window.doAction = async function(mat, mode) {
    if (!window.checkAuth()) return;
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { 
            alert("✅ Success!"); 
            await window.loadStockData(mode); 
        } else { alert("❌ " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

window.supAddStock = async function(mat, qty) {
    if (!window.checkAuth()) return;
    return await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
};

window.supDeductUser = async function(mat, user, qty) {
    if (!window.checkAuth()) return;
    return await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material).toLowerCase().includes(keyword.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};
