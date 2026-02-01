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
        alert("⏰ Session Expired. Please login again.");
        sessionStorage.clear();
        location.href = 'index.html';
        return false;
    }
    sessionStorage.setItem('lastActivity', now);
    return true;
};

window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { 
    const isSup = sessionStorage.getItem('isSupervisor');
    location.href = (isSup === 'true') ? 'supervisor.html' : 'user-select.html';
};

/* ===== 3. Rendering Logic (Full Width + Red 0 Stock) ===== */
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
            if (document.getElementById('staff-data')) window.renderStaffInventory(rows);
        }
    } catch (e) { console.error("Error:", e); }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    const container = document.querySelector('.container');
    if(container) container.style.maxWidth = '100%';

    let displayData = data;
    if (type === 'return') {
        displayData = data.filter(r => Number(r[user] || 0) > 0);
    }

    tbody.innerHTML = displayData.map(r => {
        const s0243 = Number(r['0243'] || 0);
        const sUser = Number(r[user] || 0);
        const mat = r.Material;
        const name = r['Product Name'] || '';
        const stockStyle = s0243 === 0 ? 'color: #ef4444; font-weight: bold;' : 'color: #1e293b; font-weight: bold;';

        const info = `<div style="display:flex; align-items:center; gap:12px; white-space:nowrap; overflow:hidden;">
                        <b style="color:#003366; min-width:85px; font-size:15px;">${mat}</b>
                        <span style="color:#64748b; font-size:14px; text-overflow:ellipsis; overflow:hidden;">${name}</span>
                      </div>`;

        if (type === 'all') {
            return `<tr><td style="width:75%;">${info}</td><td align="center"><span style="${stockStyle}">${s0243}</span></td><td align="right" style="padding-right:15px;">${s0243 > 0 ? '✅' : '❌'}</td></tr>`;
        }
        
        if (type === 'withdraw') {
            return `<tr><td style="width:65%;">${info}</td><td align="center"><span style="${stockStyle}">${s0243}</span></td><td align="right">
                <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                    <input type="number" id="q_${mat}" value="1" style="width:35px; height:32px; border:1px solid #cbd5e1; border-radius:6px; text-align:center;">
                    <button onclick="doAction('${mat}','withdraw')" style="background:#003366; color:white; border:none; padding:10px 16px; border-radius:8px; font-weight:bold; cursor:pointer; min-width:105px;">Withdraw</button>
                </div></td></tr>`;
        }

        if (type === 'return') {
            return `<tr><td style="width:65%;">${info}</td><td align="center"><b>${sUser}</b></td><td align="right">
                <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                    <input type="number" id="q_${mat}" value="1" style="width:35px; height:32px; border:1px solid #cbd5e1; border-radius:6px; text-align:center;">
                    <button onclick="doAction('${mat}','return')" style="background:#22c55e; color:white; border:none; padding:10px 16px; border-radius:8px; font-weight:bold; cursor:pointer; min-width:90px;">Return</button>
                </div></td></tr>`;
        }
    }).join('');
};

/* ===== 4. Supervisor Actions (English) ===== */
window.renderStaffInventory = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
    let html = '';

    data.forEach(row => {
        STAFF_LIST.forEach(user => {
            const val = Number(row[user] || 0);
            if (val > 0) {
                const tid = `ed_${row.Material}_${user}`;
                html += `<tr class="staff-row">
                    <td><div style="display:flex; flex-direction:column;"><b style="color:#003366;">${row.Material}</b><span style="font-size:11px; color:#64748b;">${row['Product Name'] || ''}</span></div></td>
                    <td><span class="badge-user">${user}</span></td>
                    <td align="center"><input type="number" id="${tid}" value="${val}" style="width:40px; text-align:center;"></td>
                    <td align="right"><button onclick="doSupDeduct('${row.Material}','${user}','${tid}')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">Deduct</button></td>
                </tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff stock found</td></tr>';
};

window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value;
    const qty = document.getElementById('s_qty').value;
    if(!mat || !qty) return alert("Please enter Material and Quantity");
    
    const product = rows.find(r => String(r.Material) === String(mat));
    const prodName = product ? product['Product Name'] : "Unknown Item";

    if(!confirm(`Confirm Add Stock:\nMaterial: ${mat}\nName: ${prodName}\nQty: ${qty}`)) return;

    try {
        const res = await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
        if (res.success) { alert("✅ Stock Added Successfully!"); location.reload(); } 
        else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("❌ Server connection failed"); }
};

window.doSupDeduct = async function(mat, user, tid) {
    const qty = document.getElementById(tid).value;
    if(!confirm(`Confirm deduct ${qty} units from ${user}?`)) return;
    
    try {
        const res = await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
        if (res.success) { alert("✅ Deducted successfully!"); location.reload(); } 
        else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("❌ Server connection failed"); }
};

/* ===== 5. General Actions ===== */
window.doAction = async function(mat, mode) {
    if (!window.checkAuth()) return;
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { alert("✅ Success!"); await window.loadStockData(mode); } 
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => 
        String(r.Material).toLowerCase().includes(keyword.toLowerCase()) || 
        String(r['Product Name']).toLowerCase().includes(keyword.toLowerCase())
    );
    window.renderTable(filtered, type);
};
