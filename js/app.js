const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];

const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return sessionStorage.getItem('selectedUser') || ''; }

/* ===== 1. Authentication (แก้ Login) ===== */
window.login = function() {
  const passField = qs('password');
  const passValue = (passField?.value || '').trim();
  if (passValue === PASSWORD) {
    location.href = 'user-select.html';
  } else {
    alert('รหัสผ่านไม่ถูกต้อง (Hint: S ตัวใหญ่)');
  }
};

function supAuth(p){ 
  if(p === SUP_PASSWORD){ 
    sessionStorage.setItem('isSupervisor','1'); 
    return true; 
  } 
  return false; 
}

/* ===== 2. Data Loading ===== */
async function loadUsers() {
  try {
    const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
    const res = await fetch(url).then(r => r.json());
    return res.success ? res.users : [];
  } catch (e) { return []; }
}

async function loadAllWithSchema(pageType){
  try {
    const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
    const res = await fetch(url).then(r => r.json());
    if(res.success) {
      rows = res.rows;
      renderSmartTable(rows, pageType); 
    }
  } catch(e) { console.error("Load failed", e); }
}

/* ===== 3. Smart Renderer (หน้าตาสวย + ทำงานในแถวเดียว) ===== */
function renderSmartTable(list, type) {
  const tb = qs('data'); if(!tb) return;
  const user = resolveUser();
  
  tb.innerHTML = list.map((r, index) => {
    const stockVal = type === 'withdraw' ? (r['0243'] || 0) : (r[user] || 0);
    const btnClass = type === 'withdraw' ? 'btn-danger' : 'btn-success';

    return `
      <tr class="item-row">
        <td>
          <div class="inst-tag">${r.Instrument || '-'}</div>
          <div class="mat-code">${r.Material}</div>
          <div class="prod-name">${r['Product Name'] || ''}</div>
        </td>
        <td class="stock-cell">${stockVal}</td>
        <td>
          <div class="inline-action">
            <input type="number" id="qty_${index}" class="qty-input-sm" placeholder="0">
            <button class="${btnClass} btn-action-sm" onclick="handleRowAction('${type}', '${r.Material}', ${index})">
              ${type === 'withdraw' ? 'เบิก' : 'คืน'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ===== 4. Action Handler ===== */
async function handleRowAction(type, material, index) {
  const qtyInput = qs(`qty_${index}`);
  const qty = Number(qtyInput.value);
  const user = resolveUser();

  if (qty <= 0) return alert("กรุณาระบุจำนวน");
  
  qtyInput.disabled = true;
  const url = `${API}?action=${type}&password=${encodeURIComponent(PASSWORD)}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`;
  
  try {
    const res = await fetch(url).then(r => r.json());
    if (res.success) {
      alert("สำเร็จ!");
      loadAllWithSchema(type);
    } else {
      alert("ล้มเหลว: " + res.msg);
      qtyInput.disabled = false;
    }
  } catch(e) { alert("Error connecting to server"); qtyInput.disabled = false; }
}

function searchAll(keyword, type){
  const k = (keyword || '').toLowerCase();
  const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k)));
  renderSmartTable(filtered, type);
}

function goBack(){ location.href = 'user-select.html'; }
