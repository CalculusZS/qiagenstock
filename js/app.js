const API = "https://script.google.com/macros/s/AKfycbw7Eg3Z0JuePwx2mXA-rAGLaN_Agwyb2ROGE3JPmFRNR1oF5G7yTe2PvdgbFWCZewAYmw/exec"; 
const PASSWORD = "Service";
const SUP_PASSWORD = "Qiagen";

let rows = []; // สำหรับเก็บข้อมูลสต็อกทั้งหมด

// Helper ฟังก์ชัน
const qs = id => document.getElementById(id);
function getQS(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function resolveUser(){ return getQS('user') || sessionStorage.getItem('selectedUser') || ''; }

/* ===== 2. Authentication & Login ===== */
window.login = function() {
  const pass = (qs('password')?.value || '').trim();
  if (pass === PASSWORD) {
    location.href = 'user-select.html';
  } else {
    alert('รหัสผ่านไม่ถูกต้อง');
  }
};

function supAuth(p){ 
  if(p === SUP_PASSWORD){ 
    sessionStorage.setItem('isSupervisor','1'); 
    return true; 
  } 
  return false; 
}

function goBack(){ 
  if (document.referrer) history.back(); 
  else location.href = 'user-select.html'; 
}

/* ===== 3. Data Loading (รายชื่อ และ สต็อก) ===== */

// ดึงรายชื่อพนักงาน (Whitelist) มาสร้างปุ่มในหน้า user-select.html
async function loadUsers() {
  try {
    const url = `${API}?action=users&password=${encodeURIComponent(PASSWORD)}`;
    const res = await fetch(url).then(r => r.json());
    return res.success ? res.users : [];
  } catch (e) {
    console.error("Error loading users:", e);
    return [];
  }
}

// ดึงข้อมูลสต็อกทั้งหมด
async function loadAllWithSchema(pageType){
  try {
    const url = `${API}?action=list2&password=${encodeURIComponent(PASSWORD)}`;
    const res = await fetch(url).then(r => r.json());
    if(!res.success){ console.error(res.msg); return; }
    
    rows = res.rows || [];
    
    // ถ้าหน้าจอมีตารางให้แสดงผล (หน้า All Stock หรือหน้าเบิก/คืนแบบใหม่)
    if (qs('data')) {
      if (pageType === 'withdraw' || pageType === 'return') {
        renderSmartTable(rows, pageType); // เรนเดอร์แบบมีช่องใส่จำนวน
      } else {
        renderTable(rows); // เรนเดอร์แบบตารางธรรมดา (หน้า All)
      }
    }
    
    // ถ้าหน้าจอยังใช้ Dropdown แบบเก่า (กันพลาด)
    if (qs('materialSel')) renderSelect(rows);
    
    return rows;
  } catch(e) {
    console.error('Error loading data:', e);
  }
}

/* ===== 4. UI Renderers (Smart Table & Standard Table) ===== */

// แบบ Smart Table: มีช่องใส่จำนวนและปุ่มกดในแถวเดียว (สำหรับ Withdraw/Return)
function renderSmartTable(list, type) {
  const tb = qs('data'); if(!tb) return;
  const user = resolveUser();
  
  tb.innerHTML = list.map((r, index) => {
    // หน้าเบิกโชว์ยอดคลังกลาง 0243 / หน้าคืนโชว์ยอดที่ User ถืออยู่
    const stockVal = type === 'withdraw' ? (r['0243'] || 0) : (r[user] || 0);
    const btnClass = type === 'withdraw' ? 'btn-danger' : 'btn-success';
    const btnText = type === 'withdraw' ? 'เบิก' : 'คืน';

    return `
      <tr class="item-row">
        <td>
          <div style="font-size:10px; color:#2563eb; font-weight:bold;">${r.Instrument || '-'}</div>
          <div style="font-weight:800; font-size:15px; color:#1e293b;">${r.Material}</div>
          <div style="font-size:12px; color:#64748b;">${r['Product Name'] || ''}</div>
        </td>
        <td style="text-align:center; font-size:18px; font-weight:bold;">${stockVal}</td>
        <td>
          <div style="display:flex; gap:5px; justify-content:flex-end;">
            <input type="number" id="qty_${index}" class="qty-input-inline" placeholder="0" style="width:60px; text-align:center; border-radius:8px; border:1px solid #ccc;">
            <button class="${btnClass}" style="padding:5px 10px; border-radius:8px;" onclick="handleRowAction('${type}', '${r.Material}', ${index})">
              ${btnText}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// แบบตารางธรรมดา (สำหรับหน้า All Stock)
function renderTable(list){
  const tb = qs('data'); if(!tb) return;
  tb.innerHTML = list.map(r => `
    <tr>
      <td>${r.Instrument || ''}</td>
      <td><b>${r.Material}</b></td>
      <td>${r['Product Name'] || ''}</td>
      <td>${r.Type || ''}</td>
      <td style="color:var(--accent); font-weight:bold;">${r['0243'] || 0}</td>
    </tr>
  `).join('');
}

function renderSelect(list){
  const sel = qs('materialSel'); if(!sel) return;
  sel.innerHTML = '<option value="">-- เลือก Material --</option>' + 
    list.map(r => `<option value="${r.Material}">${r.Material} | ${r['Product Name']}</option>`).join('');
}

/* ===== 5. Transaction Handlers ===== */

// รับคำสั่งเบิก/คืนจากปุ่มในแถว
async function handleRowAction(type, material, index) {
  const qtyInput = qs(`qty_${index}`);
  const qty = Number(qtyInput.value);
  const user = resolveUser();

  if (qty <= 0) return alert("กรุณาใส่จำนวน");
  
  qtyInput.disabled = true;
  const res = await transactionV2({ type, material, qty, user });
  
  if (res.success) {
    alert("บันทึกสำเร็จ");
    loadAllWithSchema(type); // รีโหลดตาราง
  } else {
    alert("ผิดพลาด: " + res.msg);
    qtyInput.disabled = false;
  }
}

async function transactionV2({type, material, qty, user}){
  try {
    const url = `${API}?action=${type}&password=${PASSWORD}&material=${material}&qty=${qty}&user=${user}`;
    return await fetch(url).then(r => r.json());
  } catch(e) { return { success: false, msg: String(e) }; }
}

/* ===== 6. Supervisor Functions ===== */

async function supAddStock(material, qty){
  const url = `${API}?action=sup_add_stock&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${material}&qty=${qty}`;
  return await fetch(url).then(r => r.json());
}

async function supSetUserQty({ material, user, qty, status = 'SET' }){
  const url = `${API}?action=sup_set_user_qty&password=${PASSWORD}&sup_password=${SUP_PASSWORD}&material=${material}&user=${user}&qty=${qty}&status=${status}`;
  return await fetch(url).then(r => r.json());
}

/* ===== 7. Search ===== */
function searchAll(keyword, pageType){
  const k = (keyword || '').toLowerCase();
  const filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(k)));
  if (pageType === 'withdraw' || pageType === 'return') {
    renderSmartTable(filtered, pageType);
  } else {
    renderTable(filtered);
  }
}
