/* ไฟล์แยกสำหรับแก้ปุ่ม Admin โดยเฉพาะ ไม่ยุ่งกับ app.js */
window.goToAdmin = function() {
    const pass = prompt("Please enter Supervisor Password:");
    if (pass === "Qiagen") { // รหัสผ่านของพี่
        window.location.href = 'admin.html';
    } else if (pass !== null) {
        alert("❌ Incorrect Password");
    }
};
