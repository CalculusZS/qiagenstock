/* ========================================================================== 
   QIAGEN INVENTORY - CUSTOM MASTER CONTROL (SYNC WITH BACKEND V7.1)
   ========================================================================== */

const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";

const MASTER_PASS = "Service";
const SUP_PASSWORD = "Qiagen";

const USER_MAP = {
  'KM': 'Kitti', 'TK': 'Tatchai', 'PSO': 'Parinyachat',
  'PK': 'Phurilap', 'PST': 'Penporn', 'PA': 'Phuriwat'
};

window.allRows = [];

/* 1. ฟังก์ชันตรวจสอบการล็อกอินและแสดงชื่อ (แก้ปัญหาชื่อไม่ขึ้น) */
window.checkAuth = function() {
    const user = sessionStorage.getItem('selectedUser');
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.replace('index.html');
        return false;
    }
    
    // อัปเดตชื่อผู้ใช้ในทุกหน้า (รองรับทุก ID ที่คุณเขียนไว้ใน HTML)
    const displayIDs = ['current-user', 'display-user', 'user_display', 'userName'];
    displayIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = user;
    });
    return true;
};

/* 2. ฟังก์ชันดึงข้อมูลสต็อก (รองรับทุกหน้า) */
window.loadStockData = async function(mode) {
    const tbody = document.getElementById('data');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center">⌛ กำลังโหลดข้อมูล...</td></tr>';

    try {
        const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r => r.json());
        if (res && res.success) {
            window.allRows = res.data;
            renderTable(res.data, mode);
        }
    } catch (e) { 
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" align="center" style="color:red;">❌ ไม่สามารถโหลดข้อมูลได้</td></tr>';
    }
};

/* 3. ฟังก์ชันแสดงผลตาราง (แก้ปัญหาข้อมูลไม่โชว์) */
window.renderTable = function(data, mode) {
    const tbody = document.getElementById('data');
    if (!tbody) return;

    const user = sessionStorage.getItem('selectedUser');
    const page = window.location.pathname.toLowerCase();

    // ตัดสินใจว่าจะดึงสต็อก 0243 หรือ สต็อกส่วนตัว
    const isCentral = page.includes('withdraw') || page.includes('showall') || mode === 'all';

    let html = data.map(item => {
        const qty0243 = Number(item['0243'] || 0);
        const qtyUser = Number(item[user] || 0);
        const displayQty = isCentral ? qty0243 : qtyUser;

        // หน้า Return และ Deduct: ถ้าพนักงานไม่มีของชิ้นนั้น ให้ซ่อนแถวไปเลย
        if ((page.includes('return') || page.includes('deduct')) && qtyUser <= 0) return '';

        let actionBtn = "";
        if (page.includes('withdraw')) {
            actionBtn = qty0243 > 0 ? `<button onclick="executeAction('withdraw','${item.Material}',1)" class="btn-primary">Withdraw</button>` : '<span style="color:red">Out of Stock</span>';
        } else if (page.includes('return')) {
            actionBtn = `<button onclick="executeAction('return','${item.Material}',1)" class="btn-success">Return</button>`;
        } else if (page.includes('deduct')) {
            actionBtn = `
                <div style="display:flex; gap:5px;">
                    <input type="text" id="wo_${item.Material}" placeholder="WO#" style="width:60px; padding:5px; border-radius:4px; border:1px solid #ccc;">
                    <button onclick="handleDeductClick('${item.Material}')" class="btn-danger">USE</button>
                </div>`;
        } else if (page.includes('showall')) {
            actionBtn = qty0243 > 0 ? '<span style="color:green">Available</span>' : '<span style="color:red">Empty</span>';
        }

        return `<tr>
            <td style="padding:10px;"><b>${item.Material}</b><br><small>${item['Product Name'] || ''}</small></td>
            <td align="center" style="font-weight:bold; color:${displayQty > 0 ? 'green' : 'red'};">${displayQty}</td>
            <td align="right">${actionBtn}</td>
        </tr>`;
    }).join('');

    tbody.innerHTML = html || '<tr><td colspan="3" align="center">ไม่มีข้อมูล</td></tr>';
};

/* 4. ฟังก์ชันสำหรับการคืนและใช้ของ */
window.executeAction = async function(type, mat, qty) {
    const userKey = sessionStorage.getItem('userKey') || sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=${type}&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=${qty}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ สำเร็จ"); loadStockData(); }
};

window.handleDeductClick = async function(mat) {
    const wo = document.getElementById('wo_' + mat).value.trim();
    if (!wo) return alert("❌ กรุณาใส่เลข Work Order");
    const userKey = sessionStorage.getItem('userKey') || sessionStorage.getItem('selectedUser');
    const res = await fetch(`${API}?action=deduct&user=${encodeURIComponent(userKey)}&material=${encodeURIComponent(mat)}&qty=1&wo=${encodeURIComponent(wo)}&pass=${MASTER_PASS}`).then(r => r.json());
    if (res.success) { alert("✅ ตัดสต็อกสำเร็จ"); loadStockData(); }
};

/* 5. ฟังก์ชันอื่นๆ */
window.searchStock = (q, mode) => {
    const filtered = window.allRows.filter(r => String(r.Material).toLowerCase().includes(q.toLowerCase()) || String(r['Product Name']).toLowerCase().includes(q.toLowerCase()));
    renderTable(filtered, mode);
};
window.goBack = () => history.back();
window.logout = () => { sessionStorage.clear(); location.href='index.html'; };

// เริ่มทำงานเมื่อโหลดหน้า
window.checkAuth();
