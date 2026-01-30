const API = "https://script.google.com/macros/s/AKfycbxULIePeRJeIantdR1SLWRfqE9RxVSPI7SCz_FC7vjlIHKGDvN2Q5pi8uh_UYBRgZpmeg/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];

async function loadAllWithSchema(){
  const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
  const res = await fetch(url).then(r => r.json());
  if(res.success) rows = res.rows;
}

// ฟังก์ชันเบิก
async function withdrawMaterial(user, material, qty){
  const url = `${API}?action=withdraw&password=${encodeURIComponent(PASSWORD)}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(material)}&qty=${encodeURIComponent(qty)}`;
  return await fetch(url).then(r => r.json());
}

// ฟังก์ชันคืน
async function returnMaterial(user, material, qty){
  const url = `${API}?action=return&password=${encodeURIComponent(PASSWORD)}&user=${encodeURIComponent(user)}&material=${encodeURIComponent(material)}&qty=${encodeURIComponent(qty)}`;
  return await fetch(url).then(r => r.json());
}

// ฟังก์ชันตัดยอดของ Supervisor (หัวใจสำคัญที่ทำให้ยอด Phurilap ลดลง)
async function supSetUserQty({ material, user, qty, status = 'SET' }){
  try{
    const url = `${API}?action=sup_set_user_qty`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&user=${encodeURIComponent(user)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&status=${encodeURIComponent(status)}`;
    return await fetch(url).then(r => r.json());
  }catch(e){ return { success:false, msg:String(e) }; }
}

async function supAddStock(material, qty){
  const url = `${API}?action=sup_add_stock&password=${encodeURIComponent(PASSWORD)}&sup_password=${encodeURIComponent(SUP_PASSWORD)}&material=${encodeURIComponent(material)}&qty=${encodeURIComponent(qty)}`;
  return await fetch(url).then(r => r.json());
}

function goBack(){ if (document.referrer) history.back(); else location.href = 'user-select.html'; }
