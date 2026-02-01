/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbwd2Db27tpGfv1STLX8N6I6tBv5CDYkAM4bHbsxQDJ8wgRLqP_f3kvwkleemCH9DrEf/exec";           
       
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 5 * 60 * 1000; 

let rows = []; 

/* ===== 2. Authentication & Navigation ===== */
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

// ฟังก์ชันปุ่มย้อนกลับ
window.goBack = () => { 
    if (document.referrer.includes('index.html') || !document.referrer) {
        location.href = 'user-select.html';
    } else {
        window.history.back();
    }
};

/* ===== 3. Rendering Logic (ปรับปรุง UI ตามโจทย์) ===== */
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
    } catch (e) { console.error("Error:", e); }
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

        // UI บรรทัดเดียว: ขยายหน้ากว้างเต็มพื้นที่
        const info = `<div style="display:flex; align-items:center; gap:12px; white-space:nowrap; overflow:hidden;">
                        <b style="color:#1e293b; min-width:85px;">${mat}</b>
                        <span style="color:#64748b; font-size:13px; text-overflow:ellipsis; overflow:hidden;">${name}</span>
                      </div>`;

        if (type === 'all') {
            return `<tr>
                <td style="width:75%;">${info}</td>
                <td align="center"><b>${s0243}</b></td>
                <td align="right" style="padding-right:15px;">${s0243 > 0 ? '✅' : '❌'}</td>
            </tr>`;
        }
        
        if (type === 'withdraw') {
            return `<tr>
                <td style="width:65%;">${info}</td>
                <td align="center"><b>${s0243}</b></td>
                <td align="right">
                    <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                        <input type="number" id="q_${mat}" value="1" style="width:35px; padding:7px; border:1px solid #cbd5e1; border-radius:6px; text-align:center;">
                        <button onclick="doAction('${mat}','withdraw')" style="background:#003366; color:white; border:none; padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer; min-width:95px;">Withdraw</button>
                    </div>
                </td>
            </tr>`;
        }

        if (type === 'return') {
            return `<tr>
                <td style="width:65%;">${info}</td>
                <td align="center"><b>${sUser}</b></td>
                <td align="right">
                    <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                        <input type="number" id="q_${mat}" value="1" style="width:35px; padding:7px; border:1px solid #cbd5e1; border-radius:6px; text-align:center;">
                        <button onclick="doAction('${mat}','return')" style="background:#22c55e; color:white; border:none; padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer; min-width:85px;">Return</button>
                    </div>
                </td>
            </tr>`;
        }
    }).join('');
};

/* ===== 4. Core Actions ===== */
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
