/* แก้ไข API URL เป็นของคุณ */
const API = "https://script.google.com/macros/s/AKfycbySlzv4oof_Mf0NcA2dW2Zz7mC_Z7g69InCYOpaElmGW90iwQWEd03WKYsGozmK70ImLQ/exec";
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

async function loadAllWithSchema(){
  const res = await fetch(`${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`).then(r=>r.json());
  if(res.success) rows = res.rows;
}

// ฟังก์ชันตัดยอดบุคคล (เพิ่มการส่ง status 'USED')
async function supSetUserQty({ material, user, qty, status = 'SET' }){
  try{
    const url = `${API}?action=sup_set_user_qty`
      + `&password=${encodeURIComponent(PASSWORD)}`
      + `&sup_password=${encodeURIComponent(SUP_PASSWORD)}`
      + `&material=${encodeURIComponent(material)}`
      + `&user=${encodeURIComponent(user)}`
      + `&qty=${encodeURIComponent(qty)}`
      + `&status=${encodeURIComponent(status)}`; // สำคัญมาก
    return await fetch(url).then(r => r.json());
  }catch(e){ return { success:false, msg:String(e) }; }
}

async function supAddStock(material, qty){
  const url = `${API}?action=sup_add_stock&password=${encodeURIComponent(PASSWORD)}&sup_password=${encodeURIComponent(SUP_PASSWORD)}&material=${encodeURIComponent(material)}&qty=${encodeURIComponent(qty)}`;
  return await fetch(url).then(r => r.json());
}
