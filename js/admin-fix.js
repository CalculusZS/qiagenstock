/* admin-fix.js: ไฟล์แก้ปุ่ม Admin แยกต่างหาก ไม่ยุ่งกับไฟล์หลัก */
window.goToAdmin = function() {
    // แสดง Modal สำหรับใส่รหัส Admin
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        // ถ้าหา Modal ไม่เจอ ให้ใช้ prompt พื้นฐานแทน
        const pass = prompt("Please enter Supervisor Password:");
        if (pass === "Qiagen") { 
            window.location.href = 'admin.html';
        } else if (pass !== null) {
            alert("❌ Incorrect Password");
        }
    }
};

// ฟังก์ชันสำหรับกดปุ่ม Login ใน Modal ของพี่
window.submitAdminPass = function() {
    const passInput = document.getElementById('admin-pass-input');
    if (passInput && passInput.value === "Qiagen") {
        window.location.href = 'admin.html';
    } else {
        alert("❌ Incorrect Password");
        if (passInput) passInput.value = "";
    }
};
