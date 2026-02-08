/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbz1r6sNyuVeIr5tWrOnEduVtzzNmWIrFPwLgs6UchX24U2wVspNIZoU2lxnLa74tVDI/exec";           
      
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
        const response = await fetch(`${API}?action=read&password=${PASSWORD}&_t=${new Date().getTime()}`);
        const res = await response.json();
        if (res.success) {
            rows = res.data;
            if (document.getElementById('data')) window.renderTable(rows, type);
            if (document.getElementById('staff-data')) window.renderStaffInventory(rows);
            
            // Activate Auto-Lookup for Supervisor/Transfer
            window.setupAdminLookup(); 
        }
    } catch (e) { console.error("Error:", e); }
};

window.initTeamStock = () => window.loadStockData('all');

// ฟังก์ชันค้นหาในหน้าตาราง (Showall, Withdraw, Return)
window.searchStock = function(query, type) {
    const q = query.toLowerCase().trim();
    const filtered = rows.filter(r => {
        return String(r.Material).toLowerCase().includes(q) || 
               String(r['Product Name']).toLowerCase().includes(q) ||
               String(r['Instrument']).toLowerCase().includes(q);
    });
    window.renderTable(filtered, type);
};

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

/* ===== 4. Actions ===== */
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

window.doSupAdd = async function() {
    const matInput = document.getElementById('s_mat');
    const qtyInput = document.getElementById('s_qty');
    if(!matInput || !qtyInput) return;
    const mat = matInput.value.trim();
    const qty = qtyInput.value;
    if(!mat || !qty) { alert("Please fill all fields"); return; }
    try {
        const res = await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&_t=${new Date().getTime()}`).then(r=>r.json());
        if(res.success) { alert("✅ Stock Added!"); location.reload(); } else { alert("❌ " + res.msg); }
    } catch(e) { alert("Error"); }
};

window.doSupDeduct = async function(mat, user, tid) {
    const qty = document.getElementById(tid).value;
    try {
        const res = await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}&_t=${new Date().getTime()}`).then(r => r.json());
        if (res.success) { alert("✅ Success!"); window.loadStockData(); } else { alert("❌ Error"); }
    } catch (e) { alert("Error"); }
};

window.doTransfer = async function() {
    const mat = document.getElementById('t_mat').value.trim();
    const from = document.getElementById('t_from').value;
    const to = document.getElementById('t_to').value;
    const qty = document.getElementById('t_qty').value;
    if(!mat || from === to || !qty) { alert("Invalid Transfer Data"); return; }
    try {
        const res = await fetch(`${API}?action=transfer&password=${PASSWORD}&material=${encodeURIComponent(mat)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&qty=${qty}&_t=${new Date().getTime()}`).then(r=>r.json());
        if(res.success) { alert("✅ Transfer Success!"); location.reload(); } else { alert("❌ " + res.msg); }
    } catch(e) { alert("Error"); }
};

/* ===== 5. Lookup Logic (Auto-Search Name) ===== */
window.setupAdminLookup = function() {
    const config = [
        { inputId: 's_mat', displayId: 's_name_display' }, // Supervisor Add Stock
        { inputId: 't_mat', displayId: 't_name_display' }  // Transfer
    ];

    config.forEach(cfg => {
        const matInput = document.getElementById(cfg.inputId);
        const nameDisplay = document.getElementById(cfg.displayId);
        if (matInput && nameDisplay) {
            matInput.oninput = function() {
                const val = this.value.trim();
                const item = rows.find(r => String(r.Material) === val);
                if (item) {
                    nameDisplay.innerText = "Product: " + item['Product Name'];
                    nameDisplay.style.color = "#003366";
                } else {
                    nameDisplay.innerText = val === "" ? "" : "❌ Material not found";
                    nameDisplay.style.color = "#ef4444";
                }
            };
        }
    });
};
    } catch(e) { alert("Error"); }
};
