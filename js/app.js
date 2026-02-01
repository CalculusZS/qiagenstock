/* ===== 1. Configuration ===== */
const API = "https://script.google.com/macros/s/AKfycbz4N1gAk0h_lf0qiPdnFpL18jwKz5gvNmEVl31Bg7YmdM6gFdvpvpOl4BWeQ0aAObizVg/exec";           
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";
const STAFF_NAMES = ['Kitti', 'Tatchai', 'Parinyachat', 'Phurilap', 'Penporn', 'Phuriwat'];
let rows = []; 

/* ===== 2. Authentication ===== */
window.login = function() {
    const passInput = document.getElementById('password').value.trim();
    if (passInput === PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.href = 'user-select.html';
    } else if (passInput === SUP_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('isSupervisor', 'true');
        location.href = 'supervisor.html';
    } else { alert('Incorrect Password!'); }
};

window.logout = () => { sessionStorage.clear(); location.href = 'index.html'; };
window.goBack = () => { location.href = 'user-select.html'; };

/* ===== 3. Data Loading & Rendering ===== */
window.loadStockData = async function(type) {
    const tbody = document.getElementById('data');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">⌛ Loading...</td></tr>';
    
    try {
        const res = await fetch(`${API}?action=read&password=${PASSWORD}`).then(r => r.json());
        if (res.success) {
            rows = res.data; 
            window.renderTable(rows, type);
        }
    } catch (e) { 
        if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">❌ Connection Error</td></tr>'; 
    }
};

window.renderTable = function(data, type) {
    const tbody = document.getElementById('data');
    const currentUser = sessionStorage.getItem('selectedUser');
    if(!tbody) return;

    tbody.innerHTML = data.map((r) => {
        const stock0243 = Number(r['0243'] || 0);
        const userStock = Number(r[currentUser] || 0);
        const isOut = stock0243 <= 0;
        
        // ข้อมูลบรรทัดเดียวตามต้องการ
        const itemInfo = `<div style="font-weight:bold;">${r.Material} <span style="font-weight:normal; font-size:12px; color:#64748b;">| ${r['Product Name']}</span></div>`;

        // หน้า showall.html
        if (type === 'all') {
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:center;"><span style="color:${isOut?'#ef4444':'#16a34a'}">${isOut?'OUT':'IN STOCK'}</span></td>
            </tr>`;
        }

        // หน้า main.html - Withdraw (สีน้ำเงิน)
        if (type === 'withdraw') {
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${stock0243}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center; border-radius:4px; border:1px solid #ddd;">
                    <button onclick="doAction('${r.Material}', 'withdraw')" 
                        style="background:${isOut?'#cbd5e1':'#003366'}; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer;">Withdraw</button>
                </td>
            </tr>`;
        }

        // หน้า main.html - Return (สีเขียว)
        if (type === 'return') {
            if (userStock <= 0) return '';
            return `<tr>
                <td style="padding:12px;">${itemInfo}</td>
                <td style="text-align:center; font-weight:bold;">${userStock}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <input type="number" id="q_${r.Material}" value="1" min="1" style="width:40px; text-align:center; border-radius:4px; border:1px solid #ddd;">
                    <button onclick="doAction('${r.Material}', 'return')" 
                        style="background:#16a34a; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer;">Return</button>
                </td>
            </tr>`;
        }
    }).join('');
};

/* ===== 4. Transaction Actions ===== */
window.doAction = async function(mat, mode) {
    const user = sessionStorage.getItem('selectedUser');
    const qty = document.getElementById(`q_${mat}`).value;
    try {
        const res = await fetch(`${API}?action=${mode}&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r=>r.json());
        if (res.success) { alert("Success!"); await window.loadStockData(mode); }
        else { alert("Error: " + res.msg); }
    } catch (e) { alert("Network Error"); }
};

/* ===== 5. Supervisor Actions ===== */
window.supAddStock = async function(mat, qty) {
    return await fetch(`${API}?action=add&password=${PASSWORD}&material=${encodeURIComponent(mat)}&qty=${qty}`).then(r => r.json());
};

window.supDeductUser = async function(mat, user, qty) {
    // ส่งข้อมูลไป Script โดย Script จะบันทึก log เป็น Supervisor อัตโนมัติ
    return await fetch(`${API}?action=deduct&password=${PASSWORD}&material=${encodeURIComponent(mat)}&user=${encodeURIComponent(user)}&qty=${qty}`).then(r => r.json());
};

window.findProductByMat = (m) => rows.find(r => String(r.Material) === String(m));

window.searchStock = (keyword, type) => {
    const filtered = rows.filter(r => String(r.Material + r['Product Name']).toLowerCase().includes(keyword.toLowerCase()));
    window.renderTable(filtered, type);
};
/* ===== 7. Auto Logout Function ===== */
let idleTimer;
const IDLE_TIMEOUT = 5 * 60 * 1000; // ตั้งเวลาไว้ที่ 5 นาที (หน่วยเป็นมิลลิวินาที)

function resetIdleTimer() {
    // ล้างค่า Timer เดิม
    clearTimeout(idleTimer);
    
    // ถ้าผู้ใช้ล็อกอินอยู่ ให้เริ่มนับถอยหลังใหม่
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        idleTimer = setTimeout(() => {
            alert("Session expired due to inactivity. Logging out...");
            window.logout(); // เรียกใช้ฟังก์ชัน logout ที่มีอยู่แล้ว
        }, IDLE_TIMEOUT);
    }
}

// ตรวจจับเหตุการณ์ต่างๆ (ขยับเมาส์, กดคีย์บอร์ด, ทัชหน้าจอ)
window.onload = resetIdleTimer;
window.onmousemove = resetIdleTimer;
window.onmousedown = resetIdleTimer; // สำหรับคลิก
window.ontouchstart = resetIdleTimer; // สำหรับมือถือ
window.onclick = resetIdleTimer; 
window.onkeydown = resetIdleTimer;

// เริ่มการนับถอยหลังทันทีที่หน้าเว็บโหลด
resetIdleTimer();
