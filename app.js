// Mock Data
const MOCK_SALES_ORDERS = [
    { id: 'JOB-2404-001', customer: 'บริษัท แสนสิริ จำกัด', product: 'ใบปลิว A4', qty: 5000, status: 'progress', date: '2026-04-18' },
    { id: 'JOB-2404-002', customer: 'ร้านกาแฟนายใจ', product: 'โบรชัวร์ พับ 3', qty: 1000, status: 'pending', date: '2026-04-18' },
    { id: 'JOB-2404-003', customer: 'คุณสมชายใจดี', product: 'กล่องอาร์ตการ์ด', qty: 2500, status: 'done', date: '2026-04-17' },
    { id: 'JOB-2404-004', customer: 'Line: @sweet_bakery', product: 'ปฏิทินตั้งโต๊ะ', qty: 300, status: 'progress', date: '2026-04-17' },
];

const MOCK_CUSTOMERS_CHAT = [
    { name: "คุณกิ๊ก (Line)", msg: "อยากสั่งพิมพ์กล่องเค้ก 1000 ใบค่ะ", time: "11:45", active: true },
    { name: "บ. คลีนสเปซ", msg: "ใบเสนอราคาแก้ไขหรือยังครับ?", time: "10:30", active: false },
    { name: "น้องมายด์", msg: "ขอบคุณมากค่ะ ได้รับปฏิทินแล้ว สวยมาก", time: "เมื่อวาน", active: false },
    { name: "พี่เอก รับเหมา", msg: "ขอรีพีทนามบัตร 5 กล่อง", time: "เมื่อวาน", active: false }
];

const MOCK_BANK_FEED = [
    { date: '18/04 11:30', amount: '1,500.00', ref: 'KBANK xxxx1234' },
    { date: '18/04 09:15', amount: '12,500.00', ref: 'SCB xxxx9999' },
];

const MOCK_UNMATCHED = [
    { doc: 'INV-2404-12', cust: 'คุณกิ๊ก', amount: '1,500.00' },
    { doc: 'INV-2404-10', cust: 'บ. คลีนสเปซ', amount: '12,500.00' },
];

const MOCK_CREDIT = [
    { job: 'JOB-2404-022', cust: 'บริษัท แสนสิริ (เครดิต 30 วัน)', amount: '45,000.00', remain: '120,000.00' }
];

// App State
let currentView = 'dashboard';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    renderDashboardTable();
    renderChatList();
    renderProductionTable();
    renderAccountingData();
});

// View Navigation Logic
function switchView(viewId) {
    // Update nav links
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${viewId}`).classList.add('active');

    // Update views
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');

    // Update title
    const titles = {
        'dashboard': 'ภาพรวม (Dashboard)',
        'adweb': 'Ad Web (ติดต่อลูกค้า)',
        'sales': 'เสนอราคา/ขาย',
        'production': 'ฝ่ายผลิต (Production)',
        'accounting': 'บัญชีการเงิน (Accounting)'
    };
    document.getElementById('pageTitle').innerText = titles[viewId];
    currentView = viewId;

    // Close side bar on mobile if open
    if(window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// Role Changing logic
function changeRole() {
    const role = document.getElementById('roleSelect').value;
    
    // Map roles to default view
    let targetView = 'dashboard';
    if(role === 'hr') targetView = 'dashboard'; // Assuming HR stays on dashboard for now or has HR view
    if(role === 'sales') targetView = 'sales';
    if(role === 'prod') targetView = 'production';
    if(role === 'acc') targetView = 'accounting';

    switchView(targetView);
    alert(`เปลี่ยนมุมมองสิทธิ์การใช้งานเป็น: ${document.getElementById('roleSelect').options[document.getElementById('roleSelect').selectedIndex].text}`);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// -------------------------------------------------------------
// Renders
// -------------------------------------------------------------

function renderDashboardTable() {
    const tbody = `
        <thead>
            <tr>
                <th>เลข Order</th>
                <th>ลูกค้า</th>
                <th>สินค้า</th>
                <th>สถานะ</th>
            </tr>
        </thead>
        <tbody>
            ${MOCK_SALES_ORDERS.map(o => `
                <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${o.customer}</td>
                    <td>${o.product} (${o.qty})</td>
                    <td><span class="status-badge status-${o.status}">${getStatusText(o.status)}</span></td>
                </tr>
            `).join('')}
        </tbody>
    `;
    document.getElementById('ceo-table').innerHTML = tbody;
}

function renderChatList() {
    const listHtml = MOCK_CUSTOMERS_CHAT.map((c, i) => `
        <div class="chat-item ${c.active ? 'active' : ''}" onclick="selectChat(${i})">
            <div class="avatar" style="background:#e2e8f0; color:#333; width:40px; height:40px; flex-shrink:0;">${c.name.charAt(0)}</div>
            <div style="overflow:hidden;">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${c.name}</strong>
                    <small style="color:var(--text-muted);">${c.time}</small>
                </div>
                <p style="font-size:0.8rem; margin-top:0.2rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${c.msg}</p>
            </div>
        </div>
    `).join('');
    document.getElementById('chat-list').innerHTML = listHtml;
    
    // Default mock chat
    selectChat(0);
}

function selectChat(index) {
    const items = document.querySelectorAll('.chat-item');
    items.forEach(el => el.classList.remove('active'));
    if(items[index]) items[index].classList.add('active');

    const customer = MOCK_CUSTOMERS_CHAT[index];
    document.getElementById('chat-customer-name').innerText = `สนทนากับ: ${customer.name}`;

    const chatHtml = `
        <div class="message msg-client">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.2rem;">${customer.name}</div>
            ${customer.msg}
        </div>
        ${index === 0 ? `
            <div class="message msg-admin">
                ค่ะ ยินดีให้บริการค่ะ ต้องการขนาดกว้างยาวเท่าไหร่คะ?
            </div>
            <div class="message msg-client" style="margin-top:-0.5rem">
                กว้าง 10 ยาว 15 สูง 5 cm ค่ะ ใช้กระดาษแบบไหนได้บ้าง
            </div>
        ` : ''}
    `;
    document.getElementById('chat-messages').innerHTML = chatHtml;
}

// -------------------------------------------------------------
// Interactive Functions Exposed to Global
// -------------------------------------------------------------

window.sendMockMessage = () => {
    const input = document.getElementById('line-reply-input');
    if(!input.value.trim()) return;

    const msgHtml = `
        <div class="message msg-admin animated fadeIn">
            ${input.value}
        </div>
    `;
    document.getElementById('chat-messages').insertAdjacentHTML('beforeend', msgHtml);
    input.value = '';
    
    // scroll bottom
    const box = document.getElementById('chat-messages');
    box.scrollTop = box.scrollHeight;
};

window.createOrderFromChat = () => {
    switchView('sales');
    // Pre-fill some data could happen here
    alert("ดึงข้อมูลจากแชทเพื่อสร้างใบเสนอราคา");
};

window.calculatePrice = () => {
    const priceMap = { 'leaflet': 0.8, 'brochure': 2.5, 'box': 5.0, 'calendar': 35.0, 'card': 15.0 };
    const type = document.getElementById('product-type').value;
    const qty = parseInt(document.getElementById('order-qty').value) || 0;
    
    const unitPrice = priceMap[type] || 1;
    document.getElementById('unit-price').value = unitPrice.toFixed(2);
    
    const base = unitPrice * qty;
    const vat = base * 0.07;
    const total = base + vat;

    document.getElementById('summary-price').innerText = base.toLocaleString('th-TH', {minimumFractionDigits: 2}) + ' บาท';
    document.getElementById('summary-vat').innerText = vat.toLocaleString('th-TH', {minimumFractionDigits: 2}) + ' บาท';
    document.getElementById('summary-total').innerText = total.toLocaleString('th-TH', {minimumFractionDigits: 2}) + ' บาท';
};

window.submitSalesOrder = () => {
    alert("สร้างใบสั่งผลิต (Job Order) เรียบร้อย! ข้อมูลถูกส่งไปฝ่ายผลิตและบัญชีแล้ว");
    // Add mock logic to push to arrays in a real scenario
    switchView('production');
};

function renderProductionTable() {
    const tbody = `
        <thead>
            <tr>
                <th>เลข Order</th>
                <th>รายละเอียด</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
            </tr>
        </thead>
        <tbody id="prod-tbody">
            ${MOCK_SALES_ORDERS.filter(o => o.status !== 'done').map((o, i) => `
                <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${o.customer} - ${o.product} (${o.qty})</td>
                    <td><span class="status-badge status-${o.status}">${getStatusText(o.status)}</span></td>
                    <td>
                        <button class="btn btn-outline" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="viewProdDetail('${o.id}')">
                            <i class="fa-solid fa-list-check"></i> จัดการผลิต
                        </button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    document.getElementById('production-table').innerHTML = tbody;
}

window.viewProdDetail = (id) => {
    document.getElementById('prod-detail').style.display = 'block';
    document.getElementById('pd-job-id').innerText = id;
    
    // scroll to bottom
    document.querySelector('.view-container').scrollTop = document.querySelector('.view-container').scrollHeight;
}

window.startProduction = () => {
    alert("เบิกวัตถุดิบสำเร็จ! อัปเดตสถานะเป็นกำลังพิมพ์");
    document.getElementById('prod-detail').style.display = 'none';
}

function renderAccountingData() {
    // Bank feed
    const bankHtml = MOCK_BANK_FEED.map(b => `
        <tr>
            <td>${b.date}</td>
            <td class="text-success" style="font-weight:600;">+${b.amount}</td>
            <td>${b.ref}</td>
            <td><button class="btn btn-primary" style="padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="matchInvoice()">Match ใบแจ้งหนี้</button></td>
        </tr>
    `).join('');
    document.getElementById('bank-feed-table').innerHTML = bankHtml;

    // Unmatched
    const unmatchedHtml = MOCK_UNMATCHED.map(u => `
        <tr>
            <td>${u.doc}</td>
            <td>${u.cust}</td>
            <td style="font-weight:600;">${u.amount}</td>
        </tr>
    `).join('');
    document.getElementById('unmatched-table').innerHTML = unmatchedHtml;

    // Credit
    const creditHtml = MOCK_CREDIT.map(c => `
        <tr>
            <td><strong>${c.job}</strong></td>
            <td>${c.cust}</td>
            <td>${c.amount}</td>
            <td class="text-success">${c.remain}</td>
            <td><button class="btn btn-outline" style="padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="approveCredit()"><i class="fa-solid fa-check"></i> ปล่อยงาน</button></td>
        </tr>
    `).join('');
    document.getElementById('credit-table').innerHTML = creditHtml;
}

window.matchInvoice = () => {
    alert("กระทบยอด (Reconcile) สำเร็จ! สถานะการเงินอัปเดตไปที่ Dashboard และ Sales แล้ว");
}

window.approveCredit = () => {
    alert("อนุมัติปล่อยผลิตแบบเครดิตแล้ว ใบสั่งงานถูกส่งต่อไปยังฝ่ายผลิตทันที");
}

function getStatusText(status) {
    if(status === 'pending') return 'รอดำเนินการ';
    if(status === 'progress') return 'กำลังพิมพ์/ผลิต';
    if(status === 'done') return 'เสร็จสิ้น/จัดส่งจัดเก็บ';
    return status;
}
