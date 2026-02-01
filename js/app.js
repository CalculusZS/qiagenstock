/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbwd2Db27tpGfv1STLX8N6I6tBv5CDYkAM4bHbsxQDJ8wgRLqP_f3kvwkleemCH9DrEf/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
const TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes

let rows = []; 

/* ===== 2. Authentication & Session Timeout ===== */
window.login = function() {
    const passInput = document.getElementById('password').value.trim();
    const now = new Date().getTime();

    if (passInput === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('lastActivity', now);
        location.href = 'user-select.html';
    } else if (passInput === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('isSupervisor', 'true');
        sessionStorage.setItem('lastActivity', now);
        location.href = 'supervisor.html';
    } else { 
        alert('❌ Incorrect Password!'); 
    }
};

window.checkAuth = function() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = new Date().getTime();

    if (!isLoggedIn || !lastActivity || (now - lastActivity > TIMEOUT_MS)) {
        alert("⏰ Session Expired - Please login again (5-minute timeout).");
        window.logout();
        return false;
    }
    // Update last activity time
    sessionStorage.setItem('lastActivity', now);
    return true;
};

window.logout = () => { 
    sessionStorage.clear(); 
    location.href = 'index.html'; 
};

window.goBack = () => { 
    if(window.location.pathname.includes('main.html')) location.href = 'user-select.html';
    else window.history.back();
};

/* ===== 3. Data Loading & Rendering ===== */
window.loadStockData = async function(type) {
    if (!window.checkAuth()) return;

    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading Data...</td></tr>';
    
    try {
        const response = await fetch(`${API}?action=read&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.data;
            window.renderTable(rows, type);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Network Error</td></tr>';
    }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const s0243 = Number(r['0243'] || 0);
        const sUser = Number(r[user] || 0);
        const info = `<b>${r.Material}</b><br><small style="color:#64748b;">${r['Product Name']}</small>`;

        if (type === 'all') {
            return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="right">${s0243 > 0 ? '✅' : '❌'}</td></tr>`;
        }
        
        if (type === 'withdraw') {
            return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="right">
                <div class="action-cell">
                    <input type="number" id="q_${r.Material}" value="1" class="qty-inline">
                    <button onclick="doAction('${r.Material}','withdraw')" class="btn-action btn-withdraw">Withdraw</button>
                </div>
            </td></tr>`;
        }

        if (type === 'return') {
            if (sUser <= 0) return ''; 
            return `<tr><td>${info}</td><td align="center">${sUser}</td><td align="right">
                <div class="action-cell">
                    <input type="number" id="q_${r.Material}" value="1" class="qty-inline">
                    <button onclick="doAction('${r.Material}','return')" class="btn-action btn-return">Return</button>
                </div>
            </td></tr>`;
        }
    }).join('');
};

/* ===== 4. Transaction Actions ===== */
window.doAction = async function(mat, mode) {
    if (!window.checkAuth()) return;
    const user = sessionStorage.getItem('selectedUser');
    const qtyInput = document.getElementById(`q_${mat}`);
    const qty = qtyInput ? qtyInput.value : 0;
    
    if (qty <= 0) return alert("Please enter a valid quantity.");

    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { 
            alert("✅ Transaction Successful!"); 
            await window.loadStockData(mode); 
        } else { 
            alert("❌ Error: " + res.msg); 
        }
    } catch (e) { alert("Network Error"); }
};

/* ===== 5. Supervisor & Search ===== */
window.supAddStock = async (mat, qty) => fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
window.supDeductUser = async (mat, user, qty) => fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material).toLowerCase().includes(keyword.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};
