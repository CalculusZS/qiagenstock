const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = [];

const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== Data Loading & Rendering ===== */
async function loadUsers() {
  const res = await fetch(`${API}?action=users&password=${PASSWORD}`).then(r => r.json());
  return res.success ? res.users : [];
}

async function loadAllWithSchema(type){
  const res = await fetch(`${API}?action=list2&password=${PASSWORD}`).then(r => r.json());
  if(res.success) {
    rows = res.rows;
    renderTableWithInputs(rows, type); // เรียกใช้ตัว Render แบบใหม่
  }
}

// ตัว Render แบบใหม่: มีช่องใส่จำนวนและปุ่มกดในทุกแถว
function renderTableWithInputs(list, type) {
  const tb = qs('data'); if(!tb) return;
  const user = resolveUser();
  
  tb.innerHTML = list.map((r, index) => {
    const stockVal = type === 'withdraw' ? (r['0243'] || 0) : (r[user] || 0);
    const btnClass = type === 'withdraw' ? 'btn-danger' : 'btn-success';
    const btnText = type === 'withdraw' ? 'เบิก' : 'คืน';

    return `
      <tr>
        <td>
          <div style="font-size:12px; color:#64748b;">${r.Instrument || ''}</div>
          <div style="font-weight:bold;">${r.Material}</div>
          <div style="font-size:12px;">${r['Product Name'] || ''}</div>
        </td>
        <td style="text-align:center; font-weight:bold; color:#2563eb;">${stockVal}</td>
        <td>
          <div class="action-cell">
            <input type="number" id="qty_${index}" placeholder="0" class="qty-inline">
            <button class="${btnClass} btn-sm" onclick="handleRowAction('${type}', '${r.Material}', ${index})">${btnText}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ฟังก์ชันจัดการการกดปุ่มจากในแถว
async function handleRowAction(type, material, index) {
  const qtyInput = qs(`qty_${index}`);
  const qty = Number(qtyInput.value);
  const user = resolveUser();

  if (qty <= 0) return alert("กรุณาใส่จำนวนที่มากกว่า 0");
  
  qtyInput.disabled = true; // ป้องกันกดซ้ำ
  const ok = await transactionV2({ type, material, qty, user });
  
  if (ok.success) {
    alert("สำเร็จ!");
    loadAllWithSchema(type); // รีโหลดข้อมูลใหม่
  } else {
    alert("ล้มเหลว: " + ok.msg);
    qtyInput.disabled = false;
  }
}

async function transactionV2({type, material, qty, user}){
  const url = `${API}?action=${type}&password=${PASSWORD}&material=${material}&qty=${qty}&user=${user}`;
  return await fetch(url).then(r => r.json());
}

function searchAll(keyword, type){
  const k = (keyword || '').toLowerCase();
  const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k)));
  renderTableWithInputs(filtered, type);
}

function goBack(){ location.href = 'user-select.html'; }
