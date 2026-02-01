/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbwd2Db27tpGfv1STLX8N6I6tBv5CDYkAM4bHbsxQDJ8wgRLqP_f3kvwkleemCH9DrEf/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes Timeout

let rows = []; 

/* ===== 2. Auth & Auto Logout ===== */
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
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = new Date().getTime();

    if (!isLoggedIn || !lastActivity || (now - lastActivity > TIMEOUT_MS)) {
        alert("⏰ Session Expired - Please login again.");
        window.logout();
        return false;
    }
    sessionStorage.setItem('lastActivity', now); 
    return true;
};

window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { window.history.back(); };

/* ===== 3. Data Loading & Rendering (โชว์บรรทัดเดียวเหมือนเดิม) ===== */
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
        // ปรับตรงนี้ให้แสดง Material และ Name ในบรรทัดเดียว หรือเว้นวรรคนิดหน่อยตาม UI เดิม
        const info = `<div style="font-weight:600; font-size:14px;">${mat}</div><div style="font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${r['Product Name']}</div>`;

        if (type === 'all') {
            return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="right">${s0243 > 0 ? '✅' : '❌'}</td></tr>`;
        }
        
        if (type === 'withdraw') {
            return `<tr><td>${info}</td><td align="center"><b>${s0243}</b></td><td align="right">
                <div class="action-cell">
                    <input type="number" id="q_${mat}" value="1" class="qty-inline">
                    <button onclick="doAction('${mat}','withdraw')" class="btn-action" style="background:#1e2937; color:white;">Withdraw</button>
                </div>
            </td></tr>`;
        }

        if (type === 'return') {
            return `<tr><td>${info}</td><td align="center"><b>${sUser}</b></td><td align="right">
                <div class="action-cell">
                    <input type="number" id="q_${mat}" value="1" class="qty-inline">
                    <button onclick="doAction('${mat}','return')" class="btn-action" style="background:#22c55e; color:white;">Return</button>
                </div>
            </td></tr>`;
        }
    }).join('');
};

/* ===== 4. Actions & Search ===== */
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

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material).toLowerCase().includes(keyword.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};
