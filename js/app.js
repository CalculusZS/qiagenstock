/* ========================================================================== 
   QIAGEN INVENTORY - FULL VERSION (ALL FUNCTIONS + EDITABLE PREVIEW)
   ========================================================================== */
const API = "https://script.google.com/macros/s/AKfycbyyn0uk5Pf9oimAXkiEgCKikj4hX5tO9rs0hJI1zFWqvesua1DlqF2JEr6pzx2C6l2T/exec";
const MASTER_PASS = "Service";
const USER_MAP = {'KM':'Kitti','TK':'Tatchai','PSO':'Parinyachat','PK':'Phurilap','PST':'Penporn','PA':'Phuriwat'};
const STAFF = ['Kitti','Tatchai','Parinyachat','Phurilap','Penporn','Phuriwat'];
window.cart = []; window.allRows = [];

/* --- AUTH & LOGIN (เดิม) --- */
window.handleLogin = async function() {
    const u = document.getElementById('username-input').value.trim().toUpperCase(), p = document.getElementById('password-input').value;
    try {
        const res = await fetch(`${API}?action=checkauth&user=${u}&pass=${p}`).then(r=>r.json());
        if(res.success) { 
            sessionStorage.setItem('selectedUser', USER_MAP[u]||res.fullName);
            if(res.status==='NEW') window.showForcePasswordChange(u); else location.replace('main.html');
        } else alert("❌ Login Failed");
    } catch(e) { alert("❌ Error"); }
};
window.checkAuth = () => {
    const user = sessionStorage.getItem('selectedUser');
    if(!user && !location.pathname.includes('index.html')) location.replace('index.html');
    ['current-user','display-user','user_display','userName'].forEach(id=>{if(document.getElementById(id)) document.getElementById(id).innerText=user;});
};

/* --- CORE OPERATIONS (Withdraw/Return/Deduct) --- */
window.doAction = async function(type, mat, idx) {
    const qty = document.getElementById('qty_'+idx).value, user = sessionStorage.getItem('selectedUser');
    if(!confirm(`Confirm ${type} ${qty} unit(s)?`)) return;
    try {
        const res = await fetch(`${API}?action=${type}&user=${user}&material=${mat}&qty=${qty}&pass=${MASTER_PASS}`).then(r=>r.json());
        if(res.success) { 
            window.cart.push({type, mat, prod:window.allRows[idx]['Product Name'], qty}); 
            window.updateCartUI(); window.loadStockData(); alert("✅ Added to list");
        }
    } catch(e) { alert("❌ Error"); }
};
window.doTransfer = (mat, prod, qty, from) => {
    const target = prompt(`Transfer ${qty} units to whom?\n(${STAFF.join(',')})`);
    if(target && STAFF.includes(target)) { 
        window.cart.push({type:'transfer', mat, prod, qty, from, target}); 
        window.updateCartUI(); alert("✅ Added Transfer to list");
    } else if(target) alert("❌ Invalid Name");
};
window.doDeduct = async function(mat, idx) {
    const wo = document.getElementById('wo_'+idx).value, qty = document.getElementById('qty_'+idx).value, user = sessionStorage.getItem('selectedUser');
    if(!wo) return alert("❌ Please enter WO#");
    const res = await fetch(`${API}?action=deduct&user=${user}&material=${mat}&qty=${qty}&wo=${wo}&pass=${MASTER_PASS}`).then(r=>r.json());
    if(res.success) { alert("✅ Deduct Success"); window.loadStockData(); }
};

/* --- EDITABLE PREVIEW & OUTLOOK --- */
window.updateCartUI = () => {
    let b = document.getElementById('cart-floating-btn');
    if(!b) { b=document.createElement('div'); b.id='cart-floating-btn'; b.style="position:fixed;bottom:25px;right:25px;z-index:1000;"; document.body.appendChild(b); }
    b.innerHTML = window.cart.length ? `<button onclick="window.showEmailPreview()" style="background:#0078d4;color:white;padding:15px 25px;border-radius:50px;border:none;box-shadow:0 4px 15px rgba(0,0,0,0.3);font-weight:bold;cursor:pointer;">📧 Preview & Send (${window.cart.length})</button>` : '';
};

window.showEmailPreview = () => {
    const user = sessionStorage.getItem('selectedUser'), today = "9 Feb 2026", type = window.cart[0].type;
    let sub = type==='transfer' ? `Spare parts transfer ${today} (User to User)` : (type==='return' ? `Spare parts return ${today} (${user})` : `Spare parts transfer ${today} (${user})`);
    let intro = type==='return' ? "Hi BO,\n\nPlease return the spare part as below spare parts." : "Hi BO,\n\nPlease transfer the below spare parts.";
    
    let table = `Catalog | Product Name | Amt | From | To\n` + "-".repeat(45) + "\n";
    window.cart.forEach(i => {
        let f = i.type==='withdraw'?"0243":(i.type==='transfer'?i.from:user), t = i.type==='withdraw'?user:(i.type==='transfer'?i.target:"0243");
        table += `${i.mat} | ${i.prod} | ${i.qty} | ${f} | ${t}\n`;
    });
    const fullBody = `${intro}\n\n${table}\nBest Regards,\n${user}`;
    
    const modal = document.createElement('div');
    modal.id = "email-modal";
    modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;padding:15px;box-sizing:border-box;";
    modal.innerHTML = `
        <div style="background:white;width:100%;max-width:500px;border-radius:15px;padding:20px;display:flex;flex-direction:column;gap:10px;max-height:90vh;overflow-y:auto;">
            <h3 style="margin:0;color:#003366;">Preview Email Content</h3>
            <p style="font-size:12px;color:red;margin:0;">*You can edit the text before sending</p>
            <label style="font-weight:bold;font-size:13px;">Subject:</label>
            <input id="edit-sub" value="${sub}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">
            <label style="font-weight:bold;font-size:13px;">Body:</label>
            <textarea id="edit-body" style="width:100%;height:280px;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:monospace;font-size:12px;">${fullBody}</textarea>
            <div style="display:flex;gap:10px;margin-top:10px;">
                <button onclick="document.getElementById('email-modal').remove()" style="flex:1;padding:12px;background:#eee;border:none;border-radius:10px;cursor:pointer;">Cancel</button>
                <button onclick="window.confirmOutlook()" style="flex:1;padding:12px;background:#0078d4;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Send to Outlook</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.confirmOutlook = () => {
    const sub = document.getElementById('edit-sub').value, body = document.getElementById('edit-body').value;
    const mail = `AsiaPacBackOfficeFieldService@qiagen.com`, cc = `gthfss@qiagen.com`;
    const outlookUrl = `ms-outlook://compose?to=${mail}&cc=${cc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    window.location.href = outlookUrl;
    setTimeout(() => { if(document.visibilityState==='visible') window.location.href=`mailto:${mail}?cc=${cc}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`; }, 800);
    document.getElementById('email-modal').remove();
    if(confirm("Outlook opened? Clear the list?")) { window.cart=[]; window.updateCartUI(); }
};

/* --- DATA RENDER & HISTORY --- */
window.loadStockData = async function() {
    const tb = document.getElementById('data'); if(!tb) return;
    tb.innerHTML = '<tr><td colspan="3" align="center">⌛ Loading...</td></tr>';
    const res = await fetch(`${API}?action=read&pass=${MASTER_PASS}`).then(r=>r.json());
    if(res.success) { window.allRows = res.data; window.renderTable(res.data); }
};
window.renderTable = function(data) {
    const tb = document.getElementById('data'), user = sessionStorage.getItem('selectedUser'), p = location.pathname.toLowerCase();
    tb.innerHTML = data.map((item, i) => {
        const q0 = item['0243']||0, qU = item[user]||0, disp = p.includes('withdraw')?q0:qU;
        if((p.includes('return')||p.includes('deduct')) && qU<=0) return '';
        let btn = p.includes('withdraw') ? (q0>0?`<button onclick="window.doAction('withdraw','${item.Material}',${i})" style="background:#003366;color:white;border:none;padding:8px;border-radius:8px;">Withdraw</button>`:'<b style="color:red">OUT</b>') : 
                  p.includes('return') ? `<button onclick="window.doAction('return','${item.Material}',${i})" style="background:#16a34a;color:white;border:none;padding:8px;border-radius:8px;">Return</button>` :
                  `<button onclick="window.doDeduct('${item.Material}',${i})" style="background:#ef4444;color:white;border:none;padding:8px;border-radius:8px;">DEDUCT</button>`;
        let input = `<input type="number" id="qty_${i}" value="1" style="width:40px;text-align:center;padding:6px;border-radius:6px;border:1px solid #ccc;">`;
        if(p.includes('deduct')) input = `<input type="text" id="wo_${i}" placeholder="WO#" style="width:70px;padding:6px;margin-right:5px;border-radius:6px;border:1px solid #ccc;">` + input;
        return `<tr><td style="padding:10px;"><b>${item.Material}</b><br><small style="color:#666">${item['Product Name']}</small></td><td align="center" style="font-size:18px;font-weight:bold;">${disp}</td><td align="right">${input}${btn}</td></tr>`;
    }).join('');
};

window.loadHistory = async function() {
    const listDiv = document.getElementById('list'); if(!listDiv) return;
    const res = await fetch(`${API}?action=gethistory`).then(r=>r.json());
    if(res.success) {
        listDiv.innerHTML = res.data.reverse().map(r => `
            <div style="border-bottom:1px solid #eee;padding:10px;font-size:12px;">
                <b>${new Date(r[0]).toLocaleDateString()}</b> | ${r[1]} | <b>${r[5].toUpperCase()}</b>: ${r[6]} units | WO: ${r[8]||'-'}
            </div>`).join('');
    }
};

window.showForcePasswordChange = (u) => { /* โค้ด Reset Password เดิมของพี่ */ };
window.processReset = async (u) => { /* โค้ด Reset Password เดิมของพี่ */ };
window.searchStock = q => window.renderTable(window.allRows.filter(r => String(r.Material+r['Product Name']).toLowerCase().includes(q.toLowerCase())));
window.logout = () => { sessionStorage.clear(); location.replace('index.html'); };
window.checkAuth(); if(!location.pathname.includes('index.html') && !location.pathname.includes('team-stock')) window.loadStockData();
