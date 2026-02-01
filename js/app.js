/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbwd2Db27tpGfv1STLX8N6I6tBv5CDYkAM4bHbsxQDJ8wgRLqP_f3kvwkleemCH9DrEf/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes

let rows = []; 

/* ===== 2. Authentication & Timeout Logic ===== */
window.login = function() {
    const passInput = document.getElementById('password').value.trim();
    const now = new Date().getTime();

    if (passInput === PASSWORD || passInput === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('lastActivity', now); // Store initial login time
        
        if (passInput === SUP_PASSWORD) {
            sessionStorage.setItem('isSupervisor', 'true');
            location.href = 'supervisor.html';
        } else {
            location.href = 'user-select.html';
        }
    } else { 
        alert('❌ Incorrect Password!'); 
    }
};

// Function to check if session is still valid
window.checkAuth = function() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = new Date().getTime();

    if (!isLoggedIn || !lastActivity || (now - lastActivity > TIMEOUT_MS)) {
        alert("⏰ Session Expired - Please login again.");
        window.logout();
        return false;
    }
    sessionStorage.setItem('lastActivity', now); // Refresh activity time
    return true;
};

window.logout = () => { 
    sessionStorage.clear(); 
    location.href = 'index.html'; 
};

window.goBack = () => { 
    window.history.back();
};

/* ===== 3. Data Loading & Rendering ===== */
window.loadStockData = async function(type) {
    if (!window.checkAuth()) return;

    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading Data...</td></tr>';
    
    try {
        const response = await fetch(`${API}?action=read&password=${PASSWORD}`);
        const res = await response.json();
        if (res.success) {
            rows = res.data;
            window.renderTable(rows, type);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map(r => {
        const s0243 = Number(r['0243'] || 0);
        const sUser = Number(r[user] || 0);
        const mat = r.Material;
        const info = `<b>${mat}</b><br><small>${r['Product Name']}</small>`;

        if (type === 'all') {
            return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="right">${s0243 > 0 ? '✅' : '❌'}</td></tr>`;
        }
        
        if (type === 'withdraw') {
            return `<tr><td>${info}</td><td align="center">${s0243}</td><td align="right">
                <div class="action-cell">
                    <input type="number" id="q_${mat}" value="1" class="qty-inline">
                    <button onclick="doAction('${mat}','withdraw')" class="btn-action">Withdraw</button>
                </div>
            </td></tr>`;
        }

        if (type === 'return') {
            return `<tr><td>${info}</td><td align="center">${sUser}</td><td align="right">
                <div class="action-cell">
                    <input type="number" id="q_${mat}" value="1" class="qty-inline">
                    <button onclick="doAction('${mat}','return')" class="btn-action" style="background:#22c55e;">Return</button>
                </div>
            </td></tr>`;
        }
    }).join('');
};

/* ===== 4. Transaction Actions ===== */
window.doAction = async function(mat, mode) {
    if (!window.checkAuth()) return;
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { 
            alert("✅ Success!"); 
            await window.loadStockData(mode); 
        } else { 
            alert("❌ Error: " + res.msg); 
        }
    } catch (e) { alert("Network Error"); }
};

/* ===== 5. Search & Supervisor ===== */
window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material).toLowerCase().includes(keyword.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};

window.supAddStock = async (mat, qty) => fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
window.supDeductUser = async (mat, user, qty) => fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
