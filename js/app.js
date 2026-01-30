const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec";  
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];

const qs = id => document.getElementById(id);
function resolveUser(){ return sessionStorage.getItem('selectedUser') || ''; }

/* ===== 1. Fix Login ===== */
window.login = function() {
  const passValue = qs('password')?.value.trim();
  if (passValue === PASSWORD) {
    location.href = 'user-select.html';
  } else {
    alert('รหัสผ่านไม่ถูกต้อง');
  }
};

/* ===== 2. Data Loading & Search ===== */
async function loadAllWithSchema(type){
  const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
  if(res.success) {
    rows = res.rows;
    renderSmartTable(rows, type);
  }
}

function renderSmartTable(list, type) {
  const tb = qs('data'); if(!tb) return;
  const user = resolveUser();
  
  tb.innerHTML = list.map((r, index) => {
    const stockVal = type === 'withdraw' ? (r['0243'] || 0) : (r[user] || 0);
    return `
      <tr class="item-row">
        <td>
          <div style="font-size:10px; color:#2563eb; font-weight:bold;">${r.Instrument || '-'}</div>
          <div style="font-weight:bold; font-size:15px;">${r.Material}</div>
          <div style="font-size:12px; color:#64748b;">${r['Product Name'] || ''}</div>
        </td>
        <td style="text-align:center; font-size:18px; font-weight:bold; color:#1e293b;">${stockVal}</td>
        <td>
          <div style="display:flex; gap:5px; justify-content:flex-end; align-items:center;">
            <input type="number" id="qty_${index}" style="width:55px; height:38px; text-align:center; border-radius:8px; border:1px solid #ddd;" placeholder="0">
            <button class="${type==='withdraw'?'btn-danger':'btn-success'}" style="height:38px; border-radius:8px; border:none; color:#fff; padding:0 12px; font-weight:bold;" onclick="handleAction('${type}', '${r.Material}', ${index})">
              ${type==='withdraw'?'เบิก':'คืน'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleAction(type, material, index) {
  const qtyInput = qs(`qty_${index}`);
  const qty = Number(qtyInput.value);
  const user = resolveUser();
  if (qty <= 0) return alert("กรุณาใส่จำนวน");
  
  qtyInput.disabled = true;
  const res = await fetch(`${API}?action=${type}&password=${PASSWORD}&material=${encodeURIComponent(material)}&qty=${qty}&user=${encodeURIComponent(user)}`).then(r => r.json());
  
  if (res.success) {
    alert("สำเร็จ!");
    loadAllWithSchema(type);
  } else {
    alert("ล้มเหลว: " + res.msg);
    qtyInput.disabled = false;
  }
}

function searchAll(keyword, type){
  const k = keyword.toLowerCase();
  const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k)));
  renderSmartTable(filtered, type);
}

function goBack(){ location.href = 'user-select.html'; }
