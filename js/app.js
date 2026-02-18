/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (V3.1 FULL VERSION)
   Features: Personal Stock Filter, WO Inline Support, Auth System
========================================================================== */

// 1. CONFIGURATION
const API = "https://script.google.com/macros/s/AKfycbz1r6sNyuVeIr5tWrOnEduVtzzNmWIrFPwLgs6UchX24U2wVspNIZoU2lxnLa74tVDI/exec"; 
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

window.allRows = []; // เก็บข้อมูลสต็อกที่โหลดมา

/* ===== 2. AUTHENTICATION & SESSION ===== */

window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) {
        location.href = 'index.html';
        return false;
    }
    return true;
};

window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

/* ===== 3. DATA LOADING & FILTERING ===== */

window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(item => {
        return String(item.Material).toLowerCase().includes(q) || 
               String(item['Product Name']).toLowerCase().includes(q);
    });
    renderTable(filtered, mode);
};

/* ===== 4. UI RENDERING (ตารางแบบบรรทัดเดียว) ===== */

window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const stockCentral = Number(item['0243'] || 0);
        const stockPersonal = Number(item[user] || 0);
        
        // เงื่อนไข: หน้า Deduct และ Return จะโชว์เฉพาะอะไหล่ที่ตัวเองมี (Stock > 0)
        if ((mode === 'deduct' || mode === 'return') && stockPersonal <= 0) return;

        if (mode === 'deduct') {
            // โครงสร้างบรรทัดเดียวสำหรับหน้า Deduct
            html += `
                <tr>
                    <td>
                        <div style="font-weight:bold; font-size:14px; color:#1e293b;">${item.Material}</div>
                        <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                    </td>
                    <td align="center">
                        <b style="color:#ef4444; font-size:16px;">${stockPersonal}</b>
                    </td>
                    <td align="right">
                        <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center;">
                            <input type="text" id="wo_${item.Material}" class="wo-input" placeholder="WO#">
                            <input type="number" id="qty_${item.Material}" value="1" min="1" max="${stockPersonal}" class="qty-input-sm">
                            <button onclick="handleDeductClick('${item.Material}')" class="btn-deduct">USE</button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (mode === 'return') {
            // โครงสร้างสำหรับหน้า Return
            html += `
                <tr>
                    <td>
                        <div style="font-weight:bold; font-size:14px; color:#1e293b;">${item.Material}</div>
                        <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                    </td>
                    <td align="center">
                        <b style="color:#16a34a; font-size:16px;">${stockPersonal}</b>
                    </td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                            <input type="number" id="qty_${item.Material}" value="1" min="1" max="${stockPersonal}" class="qty-input-sm">
                            <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                    style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">คืน</button>
                        </div>
                    </td>
                </tr>
            `;
        } else if (mode === 'withdraw') {
            // โครงสร้างสำหรับหน้า Withdraw (เบิกจากสต็อกกลาง 0243)
            html += `
                <tr>
                    <td>
                        <div style="font-weight:bold; font-size:14px; color:#1e293b;">${item.Material}</div>
                        <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                    </td>
                    <td align="center">
                        <b style="color:#003366; font-size:16px;">${stockCentral}</b>
                    </td>
                    <td align="right">
                        <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                            <input type="number" id="qty_${item.Material}" value="1" min="1" class="qty-input-sm">
                            <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                    style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">เบิก</button>
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:30px; color:#94a3b8;">No items found in your stock.</td></tr>';
};

/* ===== 5. TRANSACTION LOGIC (API CALLS) ===== */

// สำหรับ Withdraw และ Return
window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;

    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert(`✅ ${type === 'withdraw' ? 'เบิก' : 'คืน'}สำเร็จ!`);
            loadStockData(type);
        } else {
            alert("❌ Error: " + res.msg);
        }
    } catch (e) {
        alert("❌ Network Error");
    }
};

// สำหรับ Deduct (Used) พร้อมเลข Work Order
window.executeDeduct = async function(mat, qty, wo) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;

    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ ตัดสต็อกและบันทึก WO เรียบร้อยแล้ว");
            return { success: true };
        } else {
            alert("❌ Error: " + res.msg);
            return { success: false };
        }
    } catch (e) {
        alert("❌ Network Error");
        return { success: false };
    }
};
