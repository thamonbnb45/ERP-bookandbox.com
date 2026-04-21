import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const CATEGORIES = [
  'หนังสือ', 'ใบปลิว/แผ่นพับ', 'ถุงกระดาษ/ถุงหิ้ว', 'สายคาด/ป้ายไฟ/ป้ายแท๊ก',
  'บิล/ใบเสร็จ', 'ด้วย/แก้ว/บรรจุภัณฑ์อาหาร', 'บัตรพลาสติก', 'คูปอง/บัตร',
  'อินดี้/งานพิเศษ', 'กล่อง/แพคเกจจิ้ง', 'ปฏิทิน', 'นามบัตร', 'สติกเกอร์', 'อื่นๆ'
];

const URGENCY = { normal: '🟢 ปกติ', urgent: '🟡 ด่วน', critical: '🔴 ด่วนมาก' };

export default function Estimator() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('search');

  // Tab 1: Search
  const [catalog, setCatalog] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchCat, setSearchCat] = useState('');
  const [interpQty, setInterpQty] = useState('');
  const [interpResult, setInterpResult] = useState(null);

  // Tab 2: Request
  const [reqForm, setReqForm] = useState({ category: 'ใบปลิว/แผ่นพับ', customer_name: '', specs: '', urgency: 'normal' });

  // Tab 3: Pricing Desk
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [deskFilter, setDeskFilter] = useState('all');

  // Admin: Add price
  const [priceForm, setPriceForm] = useState({ category: 'ใบปลิว/แผ่นพับ', product_name: '', paper: '', quantity: '', price_per_unit: '', total_price: '' });

  useEffect(() => { fetchCatalog(); fetchRequests(); }, []);

  const fetchCatalog = async () => {
    try {
      const params = {};
      if (searchQ) params.search = searchQ;
      if (searchCat) params.category = searchCat;
      const res = await axios.get(`${API_URL}/price_catalog`, { params });
      setCatalog(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/price_requests`);
      setRequests(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (reqId) => {
    try {
      const res = await axios.get(`${API_URL}/price_messages/${reqId}`);
      setMessages(res.data);
    } catch (e) { console.error(e); }
  };

  // AI Linear Interpolation
  const interpolatePrice = (productName) => {
    const items = catalog.filter(c => c.product_name === productName).sort((a, b) => a.quantity - b.quantity);
    const qty = Number(interpQty);
    if (!qty || items.length < 2) { setInterpResult(null); return; }

    // Exact match
    const exact = items.find(i => i.quantity === qty);
    if (exact) { setInterpResult({ price_per_unit: exact.price_per_unit, total: exact.total_price, method: 'ราคาตรงจากตาราง' }); return; }

    // Find bounds
    let lower = null, upper = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].quantity <= qty) lower = items[i];
      if (items[i].quantity >= qty && !upper) upper = items[i];
    }

    if (lower && upper && lower.id !== upper.id) {
      const ratio = (qty - lower.quantity) / (upper.quantity - lower.quantity);
      const interpolatedPrice = lower.price_per_unit + ratio * (upper.price_per_unit - lower.price_per_unit);
      const rounded = Math.round(interpolatedPrice * 100) / 100;
      setInterpResult({ price_per_unit: rounded, total: Math.round(rounded * qty), method: `AI คำนวณ (ระหว่าง ${lower.quantity} กับ ${upper.quantity} ชิ้น)` });
    } else if (lower) {
      setInterpResult({ price_per_unit: lower.price_per_unit, total: Math.round(lower.price_per_unit * qty), method: `ใช้ราคาขั้น ${lower.quantity} ชิ้น (จำนวนเกินตาราง)` });
    } else if (upper) {
      setInterpResult({ price_per_unit: upper.price_per_unit, total: Math.round(upper.price_per_unit * qty), method: `ใช้ราคาขั้น ${upper.quantity} ชิ้น (จำนวนต่ำกว่าตาราง)` });
    }
  };

  const submitRequest = async () => {
    if (!reqForm.specs) { alert('กรุณากรอกรายละเอียดสเปคงาน'); return; }
    try {
      await axios.post(`${API_URL}/price_requests`, { ...reqForm, requested_by: user?.full_name || user?.username, status: 'pending' });
      alert('✅ ส่งคำขอราคาเรียบร้อย!');
      setReqForm({ ...reqForm, customer_name: '', specs: '' });
      fetchRequests();
    } catch (e) { alert('ส่งไม่สำเร็จ'); }
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !selectedReq) return;
    try {
      await axios.post(`${API_URL}/price_messages`, { request_id: selectedReq.id, sender: user?.full_name || user?.username, message: msgText });
      setMsgText('');
      fetchMessages(selectedReq.id);
    } catch (e) { alert('ส่งข้อความไม่สำเร็จ'); }
  };

  const updateTicketStatus = async (id, status) => {
    try {
      await axios.post(`${API_URL}/price_requests`, { id, status });
      fetchRequests();
      if (selectedReq?.id === id) setSelectedReq({ ...selectedReq, status });
    } catch (e) { alert('อัปเดตไม่สำเร็จ'); }
  };

  const addPriceToCatalog = async () => {
    if (!priceForm.product_name || !priceForm.quantity || !priceForm.price_per_unit) { alert('กรอกข้อมูลให้ครบ'); return; }
    try {
      const data = { ...priceForm, quantity: Number(priceForm.quantity), price_per_unit: Number(priceForm.price_per_unit), total_price: Number(priceForm.quantity) * Number(priceForm.price_per_unit) };
      await axios.post(`${API_URL}/price_catalog`, data);
      alert('✅ บันทึกราคาเรียบร้อย');
      setPriceForm({ ...priceForm, product_name: '', paper: '', quantity: '', price_per_unit: '', total_price: '' });
      fetchCatalog();
    } catch (e) { alert('บันทึกไม่สำเร็จ'); }
  };

  const TABS = [
    { id: 'search', label: 'ค้นราคา', icon: 'fa-magnifying-glass-dollar' },
    { id: 'request', label: 'ขอราคา', icon: 'fa-paper-plane' },
    { id: 'desk', label: 'Pricing Desk', icon: 'fa-headset' },
  ];

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Group catalog by product name for search view
  const productNames = [...new Set(catalog.map(c => c.product_name))];

  return (
    <div className="view-section active" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}><i className="fa-solid fa-coins"></i> Smart Price Hub</h2>
          <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ศูนย์ราคาอัจฉริยะ — ค้นหา ขอราคา และตอบราคาในที่เดียว</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-outline'}`} style={{ position: 'relative' }}>
              <i className={`fa-solid ${t.icon}`}></i> {t.label}
              {t.id === 'desk' && pendingCount > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>{pendingCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SEARCH PRICE CATALOG */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div className="table-container shadow" style={{ flex: '1 1 400px', padding: '1.5rem', borderTop: '4px solid #3b82f6' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}><i className="fa-solid fa-magnifying-glass"></i> ค้นหาราคาจากตาราง</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input className="form-control" style={{ flex: 2, minWidth: '150px' }} placeholder="🔍 พิมพ์ชื่อสินค้า เช่น ใบปลิว A4..." value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchCatalog()} />
              <select className="form-control" style={{ flex: 1, minWidth: '120px' }} value={searchCat} onChange={e => { setSearchCat(e.target.value); }}>
                <option value="">ทุกหมวด</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={fetchCatalog}>ค้นหา</button>
            </div>
            
            {productNames.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>ยังไม่มีข้อมูลราคา กรุณาเพิ่มราคาจากปุ่มด้านล่าง</p>}
            
            {productNames.map(pName => {
              const items = catalog.filter(c => c.product_name === pName).sort((a,b) => a.quantity - b.quantity);
              const first = items[0];
              return (
                <div key={pName} style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#f1f5f9', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>{pName}</strong>
                      <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>{first?.category}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{first?.paper}</span>
                  </div>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '0.5rem', textAlign: 'left' }}>จำนวน</th><th style={{ padding: '0.5rem', textAlign: 'right' }}>ราคา/ชิ้น</th><th style={{ padding: '0.5rem', textAlign: 'right' }}>ราคารวม</th></tr></thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem' }}>{item.quantity?.toLocaleString()} ชิ้น</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{item.price_per_unit} ฿</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#475569' }}>{item.total_price?.toLocaleString()} ฿</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* AI Interpolation */}
                  <div style={{ padding: '0.5rem 1rem', background: '#fffbeb', borderTop: '1px solid #fde68a', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#92400e' }}>🤖 คำนวณราคาจำนวนอื่น:</span>
                    <input type="number" className="form-control" style={{ width: '100px', padding: '0.3rem' }} placeholder="จำนวน" value={interpQty} onChange={e => setInterpQty(e.target.value)} />
                    <button className="btn btn-sm" style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => interpolatePrice(pName)}>คำนวณ</button>
                    {interpResult && (
                      <div style={{ fontSize: '0.75rem', flex: '1 1 200px' }}>
                        <strong style={{ color: '#b45309' }}>{Number(interpQty).toLocaleString()} ชิ้น = {interpResult.price_per_unit} ฿/ชิ้น = {interpResult.total.toLocaleString()} ฿</strong>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#92400e' }}>{interpResult.method}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick Add Price */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <h5 style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.8rem' }}>➕ เพิ่มราคาเข้าตาราง (Admin)</h5>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select className="form-control" style={{ flex: 1, minWidth: '130px' }} value={priceForm.category} onChange={e => setPriceForm({...priceForm, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="form-control" style={{ flex: 2, minWidth: '150px' }} placeholder="ชื่อสินค้า เช่น ใบปลิว A4 สี2ด้าน" value={priceForm.product_name} onChange={e => setPriceForm({...priceForm, product_name: e.target.value})} />
                <input className="form-control" style={{ flex: 1, minWidth: '100px' }} placeholder="กระดาษ" value={priceForm.paper} onChange={e => setPriceForm({...priceForm, paper: e.target.value})} />
                <input className="form-control" type="number" style={{ width: '80px' }} placeholder="จำนวน" value={priceForm.quantity} onChange={e => setPriceForm({...priceForm, quantity: e.target.value})} />
                <input className="form-control" type="number" style={{ width: '80px' }} placeholder="฿/ชิ้น" value={priceForm.price_per_unit} onChange={e => setPriceForm({...priceForm, price_per_unit: e.target.value})} />
                <button className="btn btn-primary btn-sm" onClick={addPriceToCatalog}>💾 บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUEST PRICE */}
      {activeTab === 'request' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div className="table-container shadow" style={{ flex: '1 1 400px', padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>📩 ส่งคำขอราคาไปยังทีมคิดราคา</h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>เมื่อไม่มีราคาในตาราง ให้ส่งคำขอไปยังทีมคิดราคา จะเห็นใน "Pricing Desk" ทันที</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>หมวดสินค้า</label>
                <select className="form-control" value={reqForm.category} onChange={e => setReqForm({...reqForm, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>ชื่อลูกค้า / บริษัท</label>
                <input className="form-control" placeholder="เช่น บริษัท ABC จำกัด" value={reqForm.customer_name} onChange={e => setReqForm({...reqForm, customer_name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>รายละเอียดสเปคงาน (ข้อมูลจากลูกค้า)</label>
                <textarea className="form-control" rows="5" placeholder="เช่น: หนังสือ A5 ปก 4 สี อาร์ตการ์ด 260g เคลือบด้าน&#10;เนื้อ ขาวดำ ปอนด์ 80g 100 หน้า&#10;เข้าเล่มไสกาว จำนวน 500 / 1,000 เล่ม" value={reqForm.specs} onChange={e => setReqForm({...reqForm, specs: e.target.value})} style={{ resize: 'vertical' }}></textarea>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>ระดับความเร่งด่วน</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {Object.entries(URGENCY).map(([k, v]) => (
                    <button key={k} onClick={() => setReqForm({...reqForm, urgency: k})} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: reqForm.urgency === k ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: reqForm.urgency === k ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" onClick={submitRequest} style={{ padding: '0.8rem', background: '#7c3aed', border: 'none' }}>
                📩 ส่งขอราคา
              </button>
            </div>
          </div>

          {/* Recent requests by this user */}
          <div className="table-container shadow" style={{ flex: '1 1 350px', padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>📋 คำขอของฉันล่าสุด</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {requests.filter(r => r.requested_by === (user?.full_name || user?.username)).slice(0, 10).map(r => (
                <div key={r.id} style={{ padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: r.status === 'answered' ? '#f0fdf4' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{r.category}</span>
                    <span style={{ fontSize: '0.7rem', color: r.status === 'pending' ? '#f59e0b' : r.status === 'answered' ? '#10b981' : '#3b82f6' }}>
                      {r.status === 'pending' ? '⏳ รอตอบ' : r.status === 'in_progress' ? '🔄 กำลังคิด' : '✅ ตอบแล้ว'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', margin: 0, color: '#334155' }}>{r.specs?.substring(0, 80)}...</p>
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>{new Date(r.created_at).toLocaleString('th-TH')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING DESK */}
      {activeTab === 'desk' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Left: Ticket List */}
          <div className="table-container shadow" style={{ flex: '1 1 350px', padding: '1rem', borderTop: '4px solid #f59e0b' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>🏷️ คำขอราคาทั้งหมด ({requests.length})</h4>
            
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => setDeskFilter('all')} style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: 'none', background: deskFilter === 'all' ? '#1e293b' : '#e2e8f0', color: deskFilter === 'all' ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.7rem' }}>
                ทั้งหมด ({requests.length})
              </button>
              {CATEGORIES.filter(c => requests.some(r => r.category === c)).map(c => (
                <button key={c} onClick={() => setDeskFilter(c)} style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: 'none', background: deskFilter === c ? '#1e293b' : '#e2e8f0', color: deskFilter === c ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.7rem' }}>
                  {c.split('/')[0]} ({requests.filter(r => r.category === c).length})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
              {requests.filter(r => deskFilter === 'all' || r.category === deskFilter).map(r => (
                <div key={r.id} onClick={() => { setSelectedReq(r); fetchMessages(r.id); }} style={{ padding: '0.8rem', border: selectedReq?.id === r.id ? '2px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: r.status === 'answered' ? '#f0fdf4' : r.urgency === 'critical' ? '#fef2f2' : r.urgency === 'urgent' ? '#fffbeb' : '#fff', borderLeft: `4px solid ${r.urgency === 'critical' ? '#ef4444' : r.urgency === 'urgent' ? '#f59e0b' : '#10b981'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b' }}>#{r.id} {r.category}</span>
                    <span style={{ fontSize: '0.65rem' }}>{URGENCY[r.urgency]}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', margin: 0, color: '#475569' }}>{r.specs?.substring(0, 60)}...</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>จาก: {r.requested_by}</span>
                    <span style={{ fontSize: '0.65rem', color: r.status === 'pending' ? '#f59e0b' : r.status === 'answered' ? '#10b981' : '#3b82f6', fontWeight: 'bold' }}>
                      {r.status === 'pending' ? '⏳ รอตอบ' : r.status === 'in_progress' ? '🔄 กำลังคิด' : '✅ ตอบแล้ว'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Thread Chat */}
          <div className="table-container shadow" style={{ flex: '2 1 450px', padding: '1rem', borderTop: '4px solid #3b82f6', display: 'flex', flexDirection: 'column' }}>
            {!selectedReq ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <i className="fa-solid fa-comments" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
                <p>เลือก Ticket จากด้านซ้ายเพื่อดูรายละเอียดและพูดคุย</p>
              </div>
            ) : (
              <>
                {/* Ticket Header */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontWeight: 'bold' }}>#{selectedReq.id} {selectedReq.category}</h4>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button onClick={() => updateTicketStatus(selectedReq.id, 'in_progress')} style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>🔄 กำลังคิด</button>
                      <button onClick={() => updateTicketStatus(selectedReq.id, 'answered')} style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: 'none', background: '#10b981', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>✅ ตอบแล้ว</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                    ลูกค้า: <strong>{selectedReq.customer_name || '-'}</strong> • ขอโดย: <strong>{selectedReq.requested_by}</strong> • {new Date(selectedReq.created_at).toLocaleString('th-TH')}
                  </div>
                </div>

                {/* Original Specs */}
                <div style={{ background: '#eff6ff', padding: '0.8rem', borderRadius: '8px', marginBottom: '0.8rem', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 'bold', marginBottom: '0.3rem' }}>📋 สเปคงานที่ขอ:</div>
                  <pre style={{ fontSize: '0.8rem', color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{selectedReq.specs}</pre>
                </div>

                {/* Messages Thread */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem', maxHeight: '35vh' }}>
                  {messages.map(m => (
                    <div key={m.id} style={{ padding: '0.5rem 0.8rem', background: m.sender === (user?.full_name || user?.username) ? '#dbeafe' : '#f1f5f9', borderRadius: '8px', alignSelf: m.sender === (user?.full_name || user?.username) ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem' }}><strong>{m.sender}</strong> • {new Date(m.created_at).toLocaleTimeString('th-TH')}</div>
                      <div style={{ fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{m.message}</div>
                    </div>
                  ))}
                </div>

                {/* Quick Price Reply */}
                {(() => {
                  // Extract quantities from specs (e.g. "500/1,000/2,000/3,000" or "จำนวน: 500 / 1,000")
                  const specsText = selectedReq.specs || '';
                  const qtyMatches = specsText.match(/[\d,]+(?=\s*[ชิ้นใบเล่มดวงแผ่นซอง]|\s*\/|\s*$)/g) || [];
                  const quantities = [...new Set(qtyMatches.map(q => Number(q.replace(/,/g, ''))).filter(n => n >= 10 && n <= 1000000))].sort((a,b) => a - b);
                  
                  return quantities.length > 0 && (
                    <div style={{ background: '#fffbeb', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '0.6rem', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 'bold', marginBottom: '0.4rem' }}>⚡ ตอบราคาด่วน (กรอกราคาแล้วกดส่งทีเดียว)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
                        {quantities.map(qty => (
                          <div key={qty} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'white', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b', minWidth: '50px' }}>{qty.toLocaleString()}</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>@</span>
                            <input type="number" step="0.01" id={`qp-${qty}`} placeholder="฿" style={{ width: '65px', padding: '0.25rem 0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }} />
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>.-</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-sm" style={{ background: '#f59e0b', color: 'white', border: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem' }} onClick={async () => {
                          const lines = quantities.map(qty => {
                            const price = document.getElementById(`qp-${qty}`)?.value;
                            return price ? `${qty.toLocaleString()} @ ${price}.-` : null;
                          }).filter(Boolean);
                          if (lines.length === 0) { alert('กรุณากรอกราคาอย่างน้อย 1 ช่อง'); return; }
                          const replyText = lines.join('\n');
                          setMsgText(replyText);
                        }}>
                          📋 ใส่ในช่องพิมพ์
                        </button>
                        <button className="btn btn-sm" style={{ background: '#10b981', color: 'white', border: 'none', fontSize: '0.75rem', padding: '0.35rem 0.8rem' }} onClick={async () => {
                          const lines = quantities.map(qty => {
                            const price = document.getElementById(`qp-${qty}`)?.value;
                            return price ? { qty, price: Number(price) } : null;
                          }).filter(Boolean);
                          if (lines.length === 0) { alert('กรุณากรอกราคาอย่างน้อย 1 ช่อง'); return; }
                          
                          const replyText = lines.map(l => `${l.qty.toLocaleString()} @ ${l.price}.-`).join('\n');
                          try {
                            await axios.post(`${API_URL}/price_messages`, { request_id: selectedReq.id, sender: user?.full_name || user?.username, message: replyText });
                            await axios.post(`${API_URL}/price_requests`, { id: selectedReq.id, status: 'answered' });
                            
                            // Also save to price catalog
                            for (const l of lines) {
                              try {
                                await axios.post(`${API_URL}/price_catalog`, {
                                  category: selectedReq.category,
                                  product_name: selectedReq.category,
                                  paper: '-',
                                  quantity: l.qty,
                                  price_per_unit: l.price,
                                  total_price: l.qty * l.price
                                });
                              } catch (e) {}
                            }
                            
                            alert('✅ ส่งราคา + บันทึกเข้าคลังเรียบร้อย!');
                            setMsgText('');
                            fetchMessages(selectedReq.id);
                            fetchRequests();
                            setSelectedReq({ ...selectedReq, status: 'answered' });
                          } catch (e) { alert('ส่งไม่สำเร็จ: ' + e.message); }
                        }}>
                          🚀 ส่งราคา + บันทึกคลัง
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Message Input */}
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.8rem' }}>
                  <textarea className="form-control" rows="2" placeholder="พิมพ์ข้อความหรือตอบราคา..." value={msgText} onChange={e => setMsgText(e.target.value)} style={{ flex: 1, resize: 'none' }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}></textarea>
                  <button className="btn btn-primary" onClick={sendMessage} style={{ alignSelf: 'flex-end' }}>ส่ง</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
