/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (FULL VERSION V3.5)
   รวมทุกฟังก์ชัน: เบิก, คืน, ตัดใช้(WO), สต็อกทีม, สต็อกทั้งหมด
========================================================================== */

// 1. CONFIGURATION (ตั้งค่าที่เดียวใช้ทั้งระบบ)
const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec"; 
const MASTER_PASS = "Service";

window.allRows = []; // ที่เก็บข้อมูลสต็อกทั้งหมด

/* ===== 2. AUTH & SESSION ===== */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) { location.href = 'index.html'; return false; }
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
    } catch (e) { console.error("Fetch Error:", e); }
};

window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(item => {
        return String(item.Material).toLowerCase().includes(q) || 
               String(item['Product Name']).toLowerCase().includes(q);
    });
    renderTable(filtered, mode);
};

/* ===== 4. UI RENDERING (จัดการทุกหน้าจอ) ===== */
window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const stockCentral = Number(item['0243'] || 0);
        const stockPersonal = Number(item[user] || 0);
        
        // กรองหน้า Deduct/Return: โชว์เฉพาะของที่ตัวเองมี
        if ((mode === 'deduct' || mode === 'return') && stockPersonal <= 0) return;

        if (mode === 'all') {
            // หน้า Show All
            const statusColor = stockCentral > 5 ? '#16a34a' : (stockCentral > 0 ? '#f59e0b' : '#ef4444');
            html += `<tr>
                <td style="padding:12px;">
                    <div style="font-weight:bold; font-size:14px;">${item.Material}</div>
                    <div style="font-size:11px; color:#64748b;">${item['Product Name']}</div>
                </td>
                <td align="center" style="font-size:16px;"><b>${stockCentral}</b></td>
                <td align="right"><span style="color:${statusColor}; font-weight:bold;">● ${stockCentral > 0 ? 'INSTOCK' : 'EMPTY'}</span></td>
            </tr>`;
        } else if (mode === 'withdraw') {
            // หน้า Withdraw (เบิกจาก 0243)
            html += `<tr>
                <td><div style="font-weight:bold; font-size:14px;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                <td align="center"><b>${stockCentral}</b></td>
                <td align="right">
                    <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                        <input type="number" id="qty_${item.Material}" value="1" min="1" class="qty-input-sm">
                        <button onclick="executeTransaction('withdraw', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                style="background:#003366; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">เบิก</button>
                    </div>
                </td>
            </tr>`;
        } else if (mode === 'deduct') {
            // หน้า Deduct (ตัดใช้จริง บังคับใส่ WO)
            html += `<tr>
                <td><div style="font-weight:bold; font-size:14px;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                <td align="center"><b style="color:#ef4444;">${stockPersonal}</b></td>
                <td align="right">
                    <div style="display:flex; gap:4px; align-items:center;">
                        <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:70px; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        <input type="number" id="qty_${item.Material}" value="1" class="qty-input-sm">
                        <button onclick="handleDeductClick('${item.Material}')" 
                                style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">USE</button>
                    </div>
                </td>
            </tr>`;
        } else if (mode === 'return') {
            // หน้า Return (คืนของเข้า 0243)
            html += `<tr>
                <td><div style="font-weight:bold; font-size:14px;">${item.Material}</div><div style="font-size:11px;">${item['Product Name']}</div></td>
                <td align="center"><b style="color:#16a34a;">${stockPersonal}</b></td>
                <td align="right">
                    <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
                        <input type="number" id="qty_${item.Material}" value="1" class="qty-input-sm">
                        <button onclick="executeTransaction('return', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">คืน</button>
                    </div>
                </td>
            </tr>`;
        }
    });
    tbody.innerHTML = html || '<tr><td colspan="3" align="center" style="padding:20px; color:#94a3b8;">ไม่พบข้อมูล</td></tr>';
};

/* ===== 5. TRANSACTION LOGIC (API CALLS) ===== */

// ฟังก์ชันสำหรับ เบิก (Withdraw) และ คืน (Return)
window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=${type}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ ทำรายการสำเร็จ!"); loadStockData(type); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ"); }
};

// ฟังก์ชันสำหรับ ตัดใช้งาน (Deduct) พร้อมบันทึกเลข Work Order
window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    const qty = document.getElementById('qty_' + mat).value;
    if(!wo) { alert("❌ กรุณาใส่เลข Work Order ก่อนกดยืนยัน"); return; }
    
    const user = sessionStorage.getItem('selectedUser');
    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) { alert("✅ บันทึกการใช้และเลข WO สำเร็จ"); loadStockData('deduct'); }
        else { alert("❌ " + res.msg); }
    } catch (e) { alert("❌ เกิดข้อผิดพลาดในการส่งข้อมูล"); }
};
