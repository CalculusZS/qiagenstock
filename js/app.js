const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];

// --- LOGIN FUNCTION ---
window.login = function() {
  const pass = (document.getElementById('password')?.value || '').trim();
  if (pass === PASSWORD) {
    location.href = 'user-select.html';
  } else {
    alert('รหัสผ่านไม่ถูกต้อง');
  }
};
// เพิ่ม/ตรวจสอบส่วนนี้ใน Code.gs
function handleUsers() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET_NAME);
  var h = getHeaderMap_(sh);
  
  // รายชื่อต้องสะกดให้ตรงกับหัวคอลัมน์ใน Excel ของคุณ
  var USER_WHITELIST = ['Kitti','Tatchai','Parinyachat','Phurilap','Penporn','Phuriwat'];
  
  var activeUsers = USER_WHITELIST.map(function(name) {
    return {
      header: name,
      colIndex: h[name] || -1
    };
  }).filter(function(u) { return u.colIndex > 0; }); // จะส่งไปเฉพาะชื่อที่มีหัวคอลัมน์อยู่จริงใน Sheet

  return json({success: true, users: activeUsers});
}
// --- DATA LOADING ---
async function loadAllWithSchema(){
  try {
    const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
    if(res.success) {
      rows = res.rows;
      if (document.getElementById('data')) renderTable(rows);
      if (document.getElementById('materialSel')) renderSelect(rows);
    }
  } catch(e) { console.error(e); }
}

// --- CORE FUNCTIONS (ไม่ตัดออก) ---
async function transactionV2({type, material, qty, user}){
  const url = `${API}?action=${type}&password=${PASSWORD}&material=${material}&qty=${qty}&user=${user}`;
  return await fetch(url).then(r => r.json());
}

async function supSetUserQty({ material, user, qty, status = 'SET' }){
  const url = `${API}?action=sup_set_user_qty&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${material}&user=${user}&qty=${qty}&status=${status}`;
  return await fetch(url).then(r => r.json());
}

async function supAddStock(material, qty){
  const url = `${API}?action=sup_add_stock&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${material}&qty=${qty}`;
  return await fetch(url).then(r => r.json());
}

// --- NAVIGATION ---
function goBack(){ if (document.referrer) history.back(); else location.href = 'user-select.html'; }
function supAuth(p){ if(p === SUP_PASSWORD){ sessionStorage.setItem('isSupervisor','1'); return true; } return false; }
