/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbx6YxykZ_JYerudSjfSODxhr4dSpfpKxohja91yEubrDTMl413FZTpgbmmT3WERGdZ9/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 5 * 60 * 1000; 

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
    if (lastActivity && (now - lastActivity > TIMEOUT_MS)) {
        alert("⏰ Session Expired!");
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

/* ===== 3. Loading & Rendering ===== */
window.loadStockData = async function(type) {
    if (!window.checkAuth()) return;
    const tbody = document.getElementById('data') || document.getElementById('staff-data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="4" align="center">⌛ Loading Data...</td></tr>';
    
    try {
        // FIX: Added timestamp to prevent browser caching old data
        const response = await fetch(`${API}?action=read&password=${PASSWORD}&_t=${new Date().getTime()}`);
        const res = await response.json();
        if (res.success) {
            rows = res.data;
            if (document.getElementById('data')) window.renderTable(rows, type);
            if (document.getElementById('staff-data')) window.renderStaffInventory(rows);
            if (document.getElementById('s_mat')) window.setupAdminLookup();
        }
    } catch (e) { console.error("Error:", e); }
};

window.initTeamStock = () => window.loadStockData('all');

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const user = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    let displayData = (type === 'return') ? data.filter(r => Number(r[user] || 0) > 0) : data;

    tbody.innerHTML = displayData.map(r => {
        const s0243 = Number(r['0243'] || 0);
        const sUser = Number(r[user] || 0);
        const mat = r.Material;
        const name = r['Product Name'] || '';
        const stockStyle = s0243 === 0 ? 'color: #ef4444; font-weight: bold;' : 'font-weight: bold;';

        const info = `<div class="p-info" style="display:flex; align-items:center; gap:12px;">
                        <b class="p-mat" style="color:#003366; min-width:85px;">${mat}</b>
                        <span class="p-name" style="color:#64748b; font-size:13px;">${name}</span>
                      </div>`;

        if (type === 'withdraw') {
            return `<tr><td class="td-product">${info}</td><td align="center"><span style="${stockStyle}">${s0243}</span></td>
                <td align="right"><div class="action-box" style="display:flex; gap:6px; justify-content:flex-end;">
                    <input type="number" id="q_${mat}" value="1" style="width:40px; text-align:center;">
                    <button onclick="window.doAction('${mat}','withdraw')" style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Withdraw</button>
                </div></td></tr>`;
        }
        if (type === 'return') {
            return `<tr><td class="td-product">${info}</td><td align="center"><b>${sUser}</b></td>
                <td align="right"><div class="action-box" style="display:flex; gap:6px; justify-content:flex-end;">
                    <input type="number" id="q_${mat}" value="1" style="width:40px; text-align:center;">
                    <button onclick="window.doAction('${mat}','return')" style="background:#22c55e; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Return</button>
                </div></td></tr>`;
        }
        return `<tr><td class="td-product">${info}</td><td align="center"><span style="${stockStyle}">${s0243}</span></td><td align="right">${s0243 > 0 ? '✅' : '❌'}</td></tr>`;
    }).join('');
};

window.renderStaffInventory = function(data) {
    const tbody = document.getElementById('staff-data');
    if (!tbody) return;
    
    // STAFF_LIST matching columns I-N in Sheet
    const STAFF_LIST = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat']; 
    let html = '';
    
    data.forEach(row => {
        STAFF_LIST.forEach(user => {
            const val = Number(row[user] || 0); 
            if (val > 0) {
                const tid = `ed_${row.Material}_${user}`;
                html += `<tr><td><b style="color:#003366;">${row.Material}</b><br><small>${row['Product Name']}</small></td>
                    <td align="center"><b>${user}</b></td>
                    <td align="center"><input type="number" id="${tid}" value="${val}" style="width:40px;"></td>
                    <td align="right"><button onclick="window.doSupDeduct('${row.Material}','${user}','${tid}')" style="background:#ef4444; color:white; border:none; padding:6px; border-radius:6px; cursor:pointer;">Deduct</button></td></tr>`;
            }
        });
    });
    tbody.innerHTML = html || '<tr><td colspan="4" align="center">No staff inventory found</td></tr>';
};

window.doAction = async function(mat, mode) {
    if (!window.checkAuth()) return;
    const user = sessionStorage.getItem('selectedUser');
    const qtyInput = document.getElementById(`q_${mat}`);
    const qty = qtyInput ? qtyInput.value : 1;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}&_t=${new Date().getTime()}`).then(r=>r.json());
        if (res.success) { alert("✅ Success!"); window.loadStockData(mode); } else { alert("❌ Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

window.doSupDeduct = async function(mat, user, tid) {
    const qty = document.getElementById(tid).value;
    try {
        const res = await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}&_t=${new Date().getTime()}`).then(r => r.json());
        if (res.success) { alert("✅ Success!"); window.loadStockData(); } else { alert("❌ Error"); }
    } catch (e) { alert("Error"); }
};

window.setupAdminLookup = function() {
    const matInput = document.getElementById('s_mat');
    const nameDisplay = document.getElementById('s_name_display');
    if (matInput && nameDisplay) {
        matInput.addEventListener('input', function() {
            const val = this.value.trim();
            const item = rows.find(r => String(r.Material) === val);
            if (item) {
                nameDisplay.innerText = "Product: " + item['Product Name'];
                nameDisplay.style.color = "#003366";
            } else {
                nameDisplay.innerText = val === "" ? "" : "❌ Material not found";
                nameDisplay.style.color = "#ef4444";
            }
        });
    }
};
