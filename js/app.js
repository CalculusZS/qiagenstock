/* ==========================================================================
   QIAGEN INVENTORY MANAGEMENT SYSTEM - app.js (V3.0 FULL)
   Description: จัดการ Logic หน้าบ้าน, เชื่อมต่อ API, และระบบ Auth
========================================================================== */

// 1. CONFIGURATION (ใส่ URL ที่ได้จากการ Deploy Apps Script ของคุณ)
const API = "https://script.google.com/macros/s/AKfycbzxXCnWLgfQTNlqucIsYNyDwNvkcA5nK4j9biFlvzowIw3XQOZ9g_JUaWjSotOEQpQf/exec";           
const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";
const TIMEOUT_MS = 30 * 60 * 1000; // 30 นาที

window.allRows = []; // เก็บข้อมูลสต็อกทั้งหมด

/* ===== 2. AUTHENTICATION & SESSION ===== */

// ตรวจสอบการ Login
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = new Date().getTime();

    if (!user || !lastActivity || (now - lastActivity > TIMEOUT_MS)) {
        sessionStorage.clear();
        location.href = 'index.html';
        return false;
    }
    sessionStorage.setItem('lastActivity', now); // Refresh activity
    return true;
};

// ออกจากระบบ
window.logout = function() {
    sessionStorage.clear();
    location.href = 'index.html';
};

// กลับหน้าก่อนหน้า
window.goBack = () => history.back();

/* ===== 3. DATA LOADING & SEARCH ===== */

// โหลดข้อมูลสต็อกทั้งหมดจาก Google Sheets
window.loadStockData = async function(mode) {
    try {
        const response = await fetch(`${API}?action=read&pass=${MASTER_PASS}`);
        const res = await response.json();
        if (res.success) {
            window.allRows = res.data;
            // ถ้าอยู่ในหน้าที่มีฟังก์ชัน renderTable ให้ทำการวาดตาราง
            if (typeof renderTable === "function") {
                renderTable(res.data, mode);
            }
        } else {
            console.error("API Error:", res.msg);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
};

// ฟังก์ชันค้นหาในสต็อก
window.searchStock = function(query, mode) {
    const q = query.toLowerCase().trim();
    const filtered = window.allRows.filter(item => {
        return String(item.Material).toLowerCase().includes(q) || 
               String(item['Product Name']).toLowerCase().includes(q) ||
               String(item['Instrument']).toLowerCase().includes(q);
    });
    if (typeof renderTable === "function") {
        renderTable(filtered, mode);
    }
};

/* ===== 4. CORE TRANSACTIONS (Withdraw, Return, Deduct) ===== */

// ฟังก์ชันเบิกของ (Withdraw) และ คืนของ (Return)
window.executeTransaction = async function(type, mat, qty) {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) return alert("User not found!");

    const action = type.toLowerCase(); // 'withdraw' หรือ 'return'
    const url = `${API}?action=${action}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`;

    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert(`✅ ${type} Successful!`);
            window.loadStockData(action); // โหลดข้อมูลใหม่
        } else {
            alert(`❌ Error: ${res.msg}`);
        }
    } catch (e) {
        alert("❌ Network Error: ติดต่อเซิร์ฟเวอร์ไม่ได้");
    }
};

// ฟังก์ชันตัดของใช้งาน (Deduct Part) พร้อม Work Order (WO)
window.executeDeduct = async function(mat, qty, wo) {
    const user = sessionStorage.getItem('selectedUser');
    if (!user) return alert("User not found!");
    if (!wo) return alert("กรุณาระบุเลข Work Order");

    const url = `${API}?action=deduct&user=${encodeURIComponent(user)}&material=${encodeURIComponent(mat)}&qty=${qty}&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`;

    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ บันทึกการตัดอะไหล่เรียบร้อยแล้ว");
            return { success: true };
        } else {
            alert("❌ " + res.msg);
            return { success: false };
        }
    } catch (e) {
        alert("❌ Network Error");
        return { success: false };
    }
};

/* ===== 5. SUPERVISOR FUNCTIONS ===== */

// เติมของเข้าคลังกลาง (Add Stock to 0243)
window.doSupAdd = async function() {
    const mat = document.getElementById('s_mat').value.trim();
    const qty = document.getElementById('s_qty').value;
    
    if (!mat || !qty) return alert("กรุณากรอก Material และจำนวน");

    const url = `${API}?action=add&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${SUP_PASSWORD}`;
    try {
        const res = await fetch(url).then(r => r.json());
        if (res.success) {
            alert("✅ เติมสต็อกกลางสำเร็จ");
            location.reload();
        } else {
            alert("❌ " + res.msg);
        }
    } catch (e) { alert("Error"); }
};

/* ===== 6. HELPER FUNCTIONS ===== */

// จัดการการแสดงผลตาราง (แบบรวมศูนย์)
window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;
    
    const user = sessionStorage.getItem('selectedUser');
    let html = '';

    data.forEach(item => {
        const stockCentral = item['0243'] || 0;
        const stockPersonal = item[user] || 0;
        
        html += `
            <tr>
                <td>
                    <div style="font-weight:bold; color:#1e2937;">${item.Material}</div>
                    <div style="font-size:12px; color:#64748b;">${item['Product Name']}</div>
                    <div style="font-size:11px; color:#94a3b8;">Inst: ${item['Instrument'] || '-'}</div>
                </td>
                <td align="center">
                    <span style="font-size:16px; font-weight:bold; color:${mode === 'withdraw' ? '#003366' : '#16a34a'};">
                        ${mode === 'withdraw' ? stockCentral : stockPersonal}
                    </span>
                </td>
                <td align="right">
                    <div style="display:flex; gap:5px; justify-content:flex-end;">
                        <input type="number" id="qty_${item.Material}" value="1" min="1" class="qty-input-sm" style="width:40px; text-align:center;">
                        <button onclick="executeTransaction('${mode}', '${item.Material}', document.getElementById('qty_${item.Material}').value)" 
                                class="${mode === 'withdraw' ? 'btn-danger' : 'btn-success'}" 
                                style="padding:8px 12px; border:none; border-radius:6px; color:white; font-weight:bold; cursor:pointer; background:${mode === 'withdraw' ? '#003366' : '#16a34a'};">
                            ${mode === 'withdraw' ? 'เบิก' : 'คืน'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="3" align="center">ไม่พบข้อมูล</td></tr>';
};
