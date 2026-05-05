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
  const [activeTab, setActiveTab] = useState('calc');

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

  // Tab 4: Supplier Costs
  const [supplierCosts, setSupplierCosts] = useState([]);
  const [supSearch, setSupSearch] = useState('');
  const [supForm, setSupForm] = useState({ category: 'ใบปลิว/แผ่นพับ', supplier_name: '', product_name: '', specs: '', quantity: '', cost_per_unit: '' });
  const [markupPct, setMarkupPct] = useState(30);
  const [estProduct, setEstProduct] = useState('');
  const [estQty, setEstQty] = useState('');
  const [estResult, setEstResult] = useState(null);

  // Tab 5: Cost Calculator (NEW)
  const [papers, setPapers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [finishingList, setFinishingList] = useState([]);
  const [costConfigs, setCostConfigs] = useState([]);
  const [calcForm, setCalcForm] = useState({ quantity: 1000, size: 'A4', paperName: 'อาร์ตด้าน', paperGsm: 128, colors: 4, sides: 2, margin: 30, gangRun: true, finishing: [] });
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcHistory, setCalcHistory] = useState([]);

  // Admin: editing state
  const [editingPaper, setEditingPaper] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [editingCost, setEditingCost] = useState(null);
  const [newPaper, setNewPaper] = useState({ name:'', gsm:'', sheet_width:79, sheet_height:109, price_per_sheet:'', supplier:'' });

  useEffect(() => { fetchCatalog(); fetchRequests(); fetchSupplierCosts(); fetchPricingData(); }, []);

  const fetchPricingData = async () => {
    try {
      const [p, m, f, c] = await Promise.all([
        axios.get(`${API_URL}/pricing/papers`),
        axios.get(`${API_URL}/pricing/machines`),
        axios.get(`${API_URL}/pricing/finishing`),
        axios.get(`${API_URL}/pricing/costs`)
      ]);
      setPapers(p.data); setMachines(m.data); setFinishingList(f.data); setCostConfigs(c.data);
    } catch(e) { console.error('fetchPricingData:', e); }
  };

  const runEstimate = async () => {
    setCalcLoading(true);
    try {
      const res = await axios.post(`${API_URL}/pricing/estimate`, calcForm);
      setCalcResult(res.data);
      setCalcHistory(prev => [res.data, ...prev].slice(0, 10));
    } catch(e) { alert('คำนวณไม่สำเร็จ: ' + (e.response?.data?.error || e.message)); }
    setCalcLoading(false);
  };

  const toggleFinishing = (name) => {
    setCalcForm(prev => ({
      ...prev,
      finishing: prev.finishing.includes(name)
        ? prev.finishing.filter(f => f !== name)
        : [...prev.finishing, name]
    }));
  };

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

  const fetchSupplierCosts = async () => {
    try {
      const params = {};
      if (supSearch) params.search = supSearch;
      const res = await axios.get(`${API_URL}/supplier_costs`, { params });
      setSupplierCosts(res.data);
    } catch (e) { console.error(e); }
  };

  const estimateSellingPrice = async () => {
    if (!estProduct || !estQty) { alert('กรอกชื่อสินค้าและจำนวน'); return; }
    try {
      const res = await axios.get(`${API_URL}/supplier_costs/estimate`, { params: { product_name: estProduct, quantity: estQty, markup: markupPct } });
      setEstResult(res.data);
    } catch (e) { setEstResult({ found: false }); }
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

  const savePaper = async (p) => {
    try {
      if (p.id) await axios.put(`${API_URL}/pricing/papers/${p.id}`, p);
      else await axios.post(`${API_URL}/pricing/papers`, p);
      fetchPricingData(); setEditingPaper(null); setNewPaper({ name:'', gsm:'', sheet_width:79, sheet_height:109, price_per_sheet:'', supplier:'' });
    } catch(e) { alert('บันทึกไม่สำเร็จ'); }
  };
  const deletePaper = async (id) => { if(confirm('ลบกระดาษนี้?')){ await axios.delete(`${API_URL}/pricing/papers/${id}`); fetchPricingData(); } };
  const saveCost = async (c) => {
    try { await axios.put(`${API_URL}/pricing/costs/${c.id}`, c); fetchPricingData(); setEditingCost(null); } catch(e) { alert('บันทึกไม่สำเร็จ'); }
  };

  const TABS = [
    { id: 'calc', label: 'คำนวณต้นทุน', icon: 'fa-calculator' },
    { id: 'admin', label: 'ตั้งค่าต้นทุน', icon: 'fa-database' },
    { id: 'search', label: 'ค้นราคา', icon: 'fa-magnifying-glass-dollar' },
    { id: 'supplier', label: 'ฐานราคาซัพฯ', icon: 'fa-warehouse' },
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

      {/* TAB: COST CALCULATOR (NEW!) */}
      {activeTab === 'calc' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Left: Input Form */}
          <div className="table-container shadow" style={{ flex: '1 1 380px', padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#b45309' }}><i className="fa-solid fa-calculator"></i> คำนวณต้นทุนงานพิมพ์</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {/* Size */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem', display: 'block' }}>📐 ขนาดงาน</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {['A6','A5','A4','A3','B5','B4','DL','นามบัตร','โปสการ์ด'].map(s => (
                    <button key={s} onClick={() => setCalcForm({...calcForm, size: s})} style={{ padding: '0.4rem 0.7rem', borderRadius: '6px', border: calcForm.size === s ? '2px solid #f59e0b' : '1px solid #e2e8f0', background: calcForm.size === s ? '#fffbeb' : 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: calcForm.size === s ? 'bold' : 'normal' }}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Paper */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.2rem', display: 'block' }}>📄 กระดาษ</label>
                <select className="form-control" value={`${calcForm.paperName}|${calcForm.paperGsm}`} onChange={e => { const [n,g] = e.target.value.split('|'); setCalcForm({...calcForm, paperName: n, paperGsm: parseInt(g)}); }}>
                  {papers.map(p => <option key={p.id} value={`${p.name}|${p.gsm}`}>{p.name} {p.gsm}gsm ({p.sheet_size}) — ฿{p.price_per_sheet}/แผ่น</option>)}
                </select>
              </div>

              {/* Colors & Sides */}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block' }}>🎨 จำนวนสี</label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[1,2,4,5].map(c => (
                      <button key={c} onClick={() => setCalcForm({...calcForm, colors: c})} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: calcForm.colors === c ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: calcForm.colors === c ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: calcForm.colors === c ? 'bold' : 'normal' }}>{c}สี</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block' }}>📑 ด้านพิมพ์</label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[1,2].map(s => (
                      <button key={s} onClick={() => setCalcForm({...calcForm, sides: s})} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: calcForm.sides === s ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: calcForm.sides === s ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: calcForm.sides === s ? 'bold' : 'normal' }}>{s} ด้าน</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quantity + Margin */}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block' }}>📦 จำนวน</label>
                  <input className="form-control" type="number" value={calcForm.quantity} onChange={e => setCalcForm({...calcForm, quantity: parseInt(e.target.value)||0})} style={{ fontWeight: 'bold', fontSize: '1rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block' }}>💰 กำไร %</label>
                  <input className="form-control" type="number" value={calcForm.margin} onChange={e => setCalcForm({...calcForm, margin: parseInt(e.target.value)||0})} style={{ fontWeight: 'bold', fontSize: '1rem', textAlign: 'center' }} />
                </div>
              </div>

              {/* Gang Run Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', background: calcForm.gangRun ? '#fef3c7' : '#f1f5f9', borderRadius: '8px', cursor: 'pointer', border: calcForm.gangRun ? '1px solid #fbbf24' : '1px solid #e2e8f0' }} onClick={() => setCalcForm({...calcForm, gangRun: !calcForm.gangRun})}>
                <span style={{ fontSize: '1.2rem' }}>{calcForm.gangRun ? '🟢' : '⚪'}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Gang Run (รวมงาน)</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{calcForm.gangRun ? `แบ่งเพลท+ค่าพิมพ์ ÷${calcForm.sides === 2 ? 4 : 8} งาน` : 'คิดต้นทุนเต็มเฉพาะงานนี้'}</div>
                </div>
              </div>

              {/* Finishing Options */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>✨ Finishing</label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {finishingList.map(f => (
                    <button key={f.id} onClick={() => toggleFinishing(f.name)} style={{ padding: '0.3rem 0.6rem', borderRadius: '15px', border: calcForm.finishing.includes(f.name) ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: calcForm.finishing.includes(f.name) ? '#f5f3ff' : 'white', cursor: 'pointer', fontSize: '0.7rem', color: calcForm.finishing.includes(f.name) ? '#7c3aed' : '#64748b' }}>
                      {calcForm.finishing.includes(f.name) && '✓ '}{f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate Button */}
              <button className="btn btn-primary" onClick={runEstimate} disabled={calcLoading} style={{ padding: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', fontSize: '1rem', fontWeight: 'bold', borderRadius: '10px' }}>
                {calcLoading ? '⏳ กำลังคำนวณ...' : '🖨️ คำนวณต้นทุน'}
              </button>
            </div>
          </div>

          {/* Right: Result */}
          <div className="table-container shadow" style={{ flex: '1 1 450px', padding: '1.5rem', borderTop: '4px solid #10b981' }}>
            {!calcResult ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <i className="fa-solid fa-print" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
                <p>เลือกสเปค แล้วกด "คำนวณต้นทุน" เพื่อดูผลลัพธ์</p>
              </div>
            ) : (
              <>
                {/* Summary Header */}
                <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: '12px', padding: '1.2rem', color: 'white', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>ราคาขาย (กำไร {calcResult.margin}%)</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>฿{calcResult.sellingPrice?.toLocaleString()}</div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>฿{calcResult.pricePerUnit}/ชิ้น × {calcResult.quantity?.toLocaleString()} ชิ้น</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>ต้นทุน</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>฿{calcResult.totalCost?.toLocaleString()}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>฿{calcResult.costPerUnit}/ชิ้น</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>{calcResult.paper}</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>{calcResult.machine}</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>{calcResult.machineCut}</span>
                    {calcResult.gangRun && <span style={{ background: '#fbbf24', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>Gang Run ÷{calcResult.gangRunJobs}</span>}
                  </div>
                </div>

                {/* Breakdown Table */}
                <h5 style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>📊 รายละเอียดต้นทุน</h5>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '0.5rem', textAlign: 'left' }}>รายการ</th><th style={{ padding: '0.5rem', textAlign: 'right' }}>ราคา</th><th style={{ padding: '0.5rem', textAlign: 'right' }}>หมายเหตุ</th></tr></thead>
                  <tbody>
                    <tr style={{ background: '#eff6ff' }}><td colSpan="3" style={{ padding: '0.4rem 0.5rem', fontWeight: 'bold', color: '#1e40af', fontSize: '0.75rem' }}>🔷 ต้นทุนคงที่ (฿{calcResult.fixedTotal?.toLocaleString()})</td></tr>
                    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>เพลท CTP</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>฿{calcResult.breakdown?.fixed?.plate?.total?.toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>{calcResult.breakdown?.fixed?.plate?.qty}แผ่น ×฿{calcResult.breakdown?.fixed?.plate?.unitCost} {calcResult.breakdown?.fixed?.plate?.gangRunShare}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>ค่าพิมพ์</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>฿{calcResult.breakdown?.fixed?.printing?.total?.toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>ขั้นต่ำ฿{calcResult.breakdown?.fixed?.printing?.minimum?.toLocaleString()} | หมื่นละ฿{calcResult.breakdown?.fixed?.printing?.per10k?.toLocaleString()} {calcResult.breakdown?.fixed?.printing?.gangRunShare}</td>
                    </tr>

                    <tr style={{ background: '#f0fdf4' }}><td colSpan="3" style={{ padding: '0.4rem 0.5rem', fontWeight: 'bold', color: '#15803d', fontSize: '0.75rem' }}>📄 ต้นทุนผันแปร (฿{calcResult.variableTotal?.toLocaleString()})</td></tr>
                    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>กระดาษ</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>฿{calcResult.breakdown?.variable?.paper?.total?.toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>{calcResult.breakdown?.variable?.paper?.sheets} แผ่น ×฿{calcResult.breakdown?.variable?.paper?.pricePerSheet}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>กระดาษเผื่อเสีย</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>฿{calcResult.breakdown?.variable?.setupWaste?.total?.toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>{calcResult.breakdown?.variable?.setupWaste?.sheets} แผ่น</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>หมึก</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>฿{calcResult.breakdown?.variable?.ink?.total?.toLocaleString()}</td>
                      <td></td>
                    </tr>

                    {calcResult.breakdown?.finishing?.length > 0 && (
                      <>
                        <tr style={{ background: '#fdf4ff' }}><td colSpan="3" style={{ padding: '0.4rem 0.5rem', fontWeight: 'bold', color: '#7c3aed', fontSize: '0.75rem' }}>✨ Finishing (฿{calcResult.finishingTotal?.toLocaleString()})</td></tr>
                        {calcResult.breakdown.finishing.map((f,i) => (
                          <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.4rem 0.5rem' }}>{f.name}</td>
                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>฿{f.total?.toLocaleString()}</td>
                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>{f.fixed > 0 && `ค่าคงที่฿${f.fixed}`} {f.variable > 0 && `+฿${f.variable}/ชิ้น`}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    <tr style={{ background: '#1e293b', color: 'white', fontWeight: 'bold' }}>
                      <td style={{ padding: '0.6rem' }}>รวมต้นทุน</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontSize: '1rem' }}>฿{calcResult.totalCost?.toLocaleString()}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontSize: '0.8rem' }}>฿{calcResult.costPerUnit}/ชิ้น</td>
                    </tr>
                    <tr style={{ background: '#059669', color: 'white', fontWeight: 'bold' }}>
                      <td style={{ padding: '0.6rem' }}>ราคาขาย (+{calcResult.margin}%)</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontSize: '1.1rem' }}>฿{calcResult.sellingPrice?.toLocaleString()}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontSize: '0.8rem' }}>฿{calcResult.pricePerUnit}/ชิ้น</td>
                    </tr>
                  </tbody>
                </table>

                {/* Production Info */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>วางดวง</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{calcResult.imposition} ดวง/แผ่น</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>จำนวนแผ่น</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{calcResult.sheetsNeeded} แผ่น</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Impressions</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{calcResult.totalImpressions}</div>
                  </div>
                </div>

                {/* Quick Compare */}
                <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#92400e', marginBottom: '0.4rem' }}>📈 เปรียบเทียบกับคู่แข่ง (ประมาณ)</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                    <div style={{ flex: 1, minWidth: '100px' }}><span style={{ color: '#64748b' }}>BookAndBox:</span> <strong style={{ color: '#059669' }}>฿{calcResult.sellingPrice?.toLocaleString()}</strong></div>
                    <div style={{ flex: 1, minWidth: '100px' }}><span style={{ color: '#64748b' }}>GoGoPrint:</span> <strong style={{ color: '#dc2626' }}>฿{Math.round(calcResult.sellingPrice * 1.5)?.toLocaleString()}</strong></div>
                    <div style={{ flex: 1, minWidth: '100px' }}><span style={{ color: '#64748b' }}>BangkokPrint:</span> <strong style={{ color: '#f59e0b' }}>฿{Math.round(calcResult.totalCost * 0.9)?.toLocaleString()}</strong></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* TAB: SUPPLIER COST DATABASE */}
      {activeTab === 'supplier' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Left: AI Estimator */}
          <div className="table-container shadow" style={{ flex: '1 1 400px', padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}><i className="fa-solid fa-calculator"></i> คำนวณราคาขายอัตโนมัติ</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>กรอกชื่อสินค้าและจำนวน → ระบบดึงต้นทุนจาก Supplier + บวก Markup ให้ทันที (ไม่ต้องถาม Supplier ซ้ำ!)</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
              <input className="form-control" style={{ flex: 2, minWidth: '150px' }} placeholder="🔍 ชื่อสินค้า เช่น ใบปลิว, กล่อง..." value={estProduct} onChange={e => setEstProduct(e.target.value)} />
              <input className="form-control" type="number" style={{ width: '100px' }} placeholder="จำนวน" value={estQty} onChange={e => setEstQty(e.target.value)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef3c7', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#92400e', whiteSpace: 'nowrap' }}>Markup</span>
                <input type="number" style={{ width: '50px', padding: '0.2rem', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }} value={markupPct} onChange={e => setMarkupPct(e.target.value)} />
                <span style={{ fontSize: '0.75rem', color: '#92400e' }}>%</span>
              </div>
              <button className="btn btn-primary btn-sm" style={{ background: '#f59e0b', border: 'none' }} onClick={estimateSellingPrice}>🤖 คำนวณ</button>
            </div>

            {estResult && (
              <div style={{ background: estResult.found ? '#f0fdf4' : '#fef2f2', border: `1px solid ${estResult.found ? '#bbf7d0' : '#fecaca'}`, padding: '1rem', borderRadius: '8px' }}>
                {estResult.found ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#475569' }}>ต้นทุน Supplier:</span>
                      <span style={{ fontWeight: 'bold', color: '#dc2626' }}>{estResult.cost_per_unit} ฿/ชิ้น</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#475569' }}>Markup {estResult.markup_pct}%:</span>
                      <span style={{ color: '#f59e0b' }}>+{(estResult.selling_price - estResult.cost_per_unit).toFixed(2)} ฿</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bbf7d0', paddingTop: '0.5rem', marginTop: '0.3rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#15803d' }}>💰 ราคาขาย:</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#15803d' }}>{estResult.selling_price} ฿/ชิ้น</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#475569' }}>ราคารวม ({Number(estQty).toLocaleString()} ชิ้น):</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{(estResult.selling_price * Number(estQty)).toLocaleString()} ฿</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.5rem' }}>
                      🤖 วิธี: {estResult.method === 'exact' ? 'ตรงจากฐานข้อมูล' : estResult.method === 'interpolation' ? `AI คำนวณระหว่าง ${estResult.lower_qty?.toLocaleString()} - ${estResult.upper_qty?.toLocaleString()} ชิ้น` : 'ใช้ราคาใกล้เคียงที่สุด'}
                      {estResult.supplier && ` • จาก: ${estResult.supplier}`}
                    </div>
                  </>
                ) : (
                  <p style={{ textAlign: 'center', color: '#dc2626', margin: 0 }}>❌ ไม่พบราคาต้นทุนในฐานข้อมูล กรุณาเพิ่มข้อมูลจาก Supplier ด้านล่าง</p>
                )}
              </div>
            )}

            {/* Add Supplier Cost Form */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
              <h5 style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.8rem' }}>➕ บันทึกราคาจาก Supplier</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select className="form-control" style={{ flex: 1, minWidth: '130px' }} value={supForm.category} onChange={e => setSupForm({...supForm, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="form-control" style={{ flex: 1, minWidth: '130px' }} placeholder="ชื่อ Supplier" value={supForm.supplier_name} onChange={e => setSupForm({...supForm, supplier_name: e.target.value})} />
                </div>
                <input className="form-control" placeholder="ชื่อสินค้า เช่น ใบปลิว A4 สี 2 ด้าน อาร์ตมัน 130g" value={supForm.product_name} onChange={e => setSupForm({...supForm, product_name: e.target.value})} />
                <input className="form-control" placeholder="สเปค เช่น อาร์ตมัน 130g 4/4 สี เคลือบ UV" value={supForm.specs} onChange={e => setSupForm({...supForm, specs: e.target.value})} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-control" type="number" style={{ flex: 1 }} placeholder="จำนวน (ชิ้น)" value={supForm.quantity} onChange={e => setSupForm({...supForm, quantity: e.target.value})} />
                  <input className="form-control" type="number" style={{ flex: 1 }} placeholder="ต้นทุน ฿/ชิ้น" value={supForm.cost_per_unit} onChange={e => setSupForm({...supForm, cost_per_unit: e.target.value})} />
                  <button className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={async () => {
                    if (!supForm.product_name || !supForm.quantity || !supForm.cost_per_unit) { alert('กรุณากรอกข้อมูลให้ครบ'); return; }
                    try {
                      await axios.post(`${API_URL}/supplier_costs`, { ...supForm, quantity: Number(supForm.quantity), cost_per_unit: Number(supForm.cost_per_unit), total_cost: Number(supForm.quantity) * Number(supForm.cost_per_unit) });
                      alert('✅ บันทึกราคาต้นทุนเรียบร้อย');
                      setSupForm({ ...supForm, product_name: '', specs: '', quantity: '', cost_per_unit: '' });
                      fetchSupplierCosts();
                    } catch (e) { alert('บันทึกไม่สำเร็จ'); }
                  }}>💾 บันทึก</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Supplier Cost History */}
          <div className="table-container shadow" style={{ flex: '1 1 400px', padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>📋 ประวัติราคา Supplier</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input className="form-control" placeholder="🔍 ค้นหาสินค้า / Supplier..." value={supSearch} onChange={e => setSupSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchSupplierCosts()} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={fetchSupplierCosts}>ค้นหา</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>สินค้า</th>
                  <th style={{ padding: '0.5rem' }}>Supplier</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>จำนวน</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>ต้นทุน</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>ขาย ({markupPct}%)</th>
                  <th style={{ padding: '0.5rem' }}>วันที่</th>
                </tr></thead>
                <tbody>
                  {supplierCosts.map(s => (
                    <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{s.product_name}</div>
                        {s.specs && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{s.specs}</div>}
                        <span style={{ fontSize: '0.6rem', background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{s.category}</span>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>{s.supplier_name || '-'}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>{s.quantity?.toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>{s.cost_per_unit} ฿</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>{(s.cost_per_unit * (1 + markupPct / 100)).toFixed(1)} ฿</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(s.created_at).toLocaleDateString('th-TH')}</td>
                    </tr>
                  ))}
                  {supplierCosts.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>ยังไม่มีข้อมูล กรุณาบันทึกราคาจาก Supplier ด้านซ้าย</td></tr>}
                </tbody>
              </table>
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

      {/* TAB: ADMIN COST CONFIG */}
      {activeTab === 'admin' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Paper Catalog */}
          <div className="table-container shadow" style={{ flex: '1 1 500px', padding: '1.5rem', borderTop: '4px solid #3b82f6' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.8rem' }}><i className="fa-solid fa-scroll"></i> กระดาษ ({papers.length} รายการ)</h4>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>ชื่อ</th>
                  <th style={{ padding: '0.5rem' }}>แกรม</th>
                  <th style={{ padding: '0.5rem' }}>ขนาด</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>฿/แผ่น</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>฿/รีม</th>
                  <th style={{ padding: '0.5rem' }}>Supplier</th>
                  <th style={{ padding: '0.5rem' }}></th>
                </tr></thead>
                <tbody>
                  {papers.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      {editingPaper?.id === p.id ? (
                        <>
                          <td style={{ padding: '0.3rem' }}><input style={{ width: '100%', padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }} value={editingPaper.name} onChange={e => setEditingPaper({...editingPaper, name: e.target.value})} /></td>
                          <td style={{ padding: '0.3rem' }}><input type="number" style={{ width: 50, padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }} value={editingPaper.gsm} onChange={e => setEditingPaper({...editingPaper, gsm: parseInt(e.target.value)})} /></td>
                          <td style={{ padding: '0.3rem', fontSize: '0.75rem' }}>{p.sheet_width}×{p.sheet_height}</td>
                          <td style={{ padding: '0.3rem' }}><input type="number" step="0.01" style={{ width: 60, padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem', textAlign: 'right' }} value={editingPaper.price_per_sheet} onChange={e => setEditingPaper({...editingPaper, price_per_sheet: parseFloat(e.target.value)})} /></td>
                          <td style={{ padding: '0.3rem' }}><input type="number" style={{ width: 60, padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem', textAlign: 'right' }} value={editingPaper.price_per_ream} onChange={e => setEditingPaper({...editingPaper, price_per_ream: parseFloat(e.target.value)})} /></td>
                          <td style={{ padding: '0.3rem' }}><input style={{ width: 80, padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }} value={editingPaper.supplier||''} onChange={e => setEditingPaper({...editingPaper, supplier: e.target.value})} /></td>
                          <td style={{ padding: '0.3rem' }}>
                            <button onClick={() => savePaper(editingPaper)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 4, padding: '0.2rem 0.4rem', fontSize: '0.7rem', cursor: 'pointer', marginRight: 2 }}>💾</button>
                            <button onClick={() => setEditingPaper(null)} style={{ background: '#94a3b8', color: 'white', border: 'none', borderRadius: 4, padding: '0.2rem 0.4rem', fontSize: '0.7rem', cursor: 'pointer' }}>✕</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>{p.gsm}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{p.sheet_width}×{p.sheet_height}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{p.price_per_sheet}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: '#64748b' }}>{p.price_per_ream?.toLocaleString()}</td>
                          <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', color: '#94a3b8' }}>{p.supplier}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>
                            <button onClick={() => setEditingPaper({...p})} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer', marginRight: 2 }}>✏️</button>
                            <button onClick={() => deletePaper(p.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer' }}>🗑</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Add Paper */}
            <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>➕ เพิ่มกระดาษ</div>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                <input placeholder="ชื่อ" value={newPaper.name} onChange={e => setNewPaper({...newPaper, name: e.target.value})} style={{ flex: 2, minWidth: 100, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }} />
                <input type="number" placeholder="แกรม" value={newPaper.gsm} onChange={e => setNewPaper({...newPaper, gsm: e.target.value})} style={{ width: 55, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }} />
                <input type="number" step="0.01" placeholder="฿/แผ่น" value={newPaper.price_per_sheet} onChange={e => setNewPaper({...newPaper, price_per_sheet: e.target.value})} style={{ width: 65, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }} />
                <input placeholder="Supplier" value={newPaper.supplier} onChange={e => setNewPaper({...newPaper, supplier: e.target.value})} style={{ flex: 1, minWidth: 70, padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }} />
                <button onClick={() => { if(!newPaper.name||!newPaper.gsm) return alert('กรอกชื่อ+แกรม'); savePaper({...newPaper, gsm:parseInt(newPaper.gsm), price_per_sheet:parseFloat(newPaper.price_per_sheet)||0}); }} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}>เพิ่ม</button>
              </div>
            </div>
          </div>

          {/* Right: Cost Config + Machines */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Cost Config */}
            <div className="table-container shadow" style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.8rem' }}><i className="fa-solid fa-sliders"></i> ต้นทุนทั่วไป ({costConfigs.length})</h4>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '0.4rem', textAlign: 'left' }}>หมวด</th><th style={{ padding: '0.4rem', textAlign: 'left' }}>รายการ</th><th style={{ padding: '0.4rem', textAlign: 'right' }}>ราคา</th><th style={{ padding: '0.4rem' }}>หน่วย</th><th></th></tr></thead>
                <tbody>
                  {costConfigs.map(c => (
                    <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.3rem 0.4rem' }}><span style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: 3, fontSize: '0.65rem' }}>{c.category}</span></td>
                      <td style={{ padding: '0.3rem 0.4rem', fontWeight: 600 }}>{c.name}</td>
                      {editingCost?.id === c.id ? (
                        <>
                          <td style={{ padding: '0.3rem' }}><input type="number" step="0.01" style={{ width: 70, padding: '0.2rem', border: '1px solid #fbbf24', borderRadius: 4, fontSize: '0.8rem', textAlign: 'right', fontWeight: 700 }} value={editingCost.cost_per_unit} onChange={e => setEditingCost({...editingCost, cost_per_unit: parseFloat(e.target.value)})} /></td>
                          <td style={{ padding: '0.3rem', fontSize: '0.7rem' }}>{c.unit}</td>
                          <td style={{ padding: '0.3rem' }}>
                            <button onClick={() => saveCost(editingCost)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 4, padding: '0.15rem 0.3rem', fontSize: '0.65rem', cursor: 'pointer' }}>💾</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{c.cost_per_unit}</td>
                          <td style={{ padding: '0.3rem 0.4rem', fontSize: '0.7rem', color: '#94a3b8' }}>{c.unit}</td>
                          <td style={{ padding: '0.3rem' }}><button onClick={() => setEditingCost({...c})} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: 4, padding: '0.15rem 0.3rem', fontSize: '0.6rem', cursor: 'pointer' }}>✏️</button></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Machines */}
            <div className="table-container shadow" style={{ padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.8rem' }}><i className="fa-solid fa-gears"></i> เครื่องจักร ({machines.length})</h4>
              {machines.map(m => (
                <div key={m.id} style={{ padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: '0.5rem', background: m.type==='offset'?'#faf5ff':'#f0f9ff' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.machine_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                    <span>ประเภท: <strong>{m.type}</strong></span>
                    <span>สี: <strong>{m.colors}</strong></span>
                    <span>ความเร็ว: <strong>{m.speed_per_hour?.toLocaleString()}/ชม.</strong></span>
                    <span>เผื่อเสีย: <strong>{m.setup_waste} แผ่น</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Finishing */}
            <div className="table-container shadow" style={{ padding: '1.5rem', borderTop: '4px solid #10b981' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.8rem' }}><i className="fa-solid fa-wand-magic-sparkles"></i> Finishing ({finishingList.length})</h4>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '0.4rem', textAlign: 'left' }}>ชื่อ</th><th style={{ padding: '0.4rem' }}>ประเภท</th><th style={{ padding: '0.4rem', textAlign: 'right' }}>คงที่</th><th style={{ padding: '0.4rem', textAlign: 'right' }}>ผันแปร</th></tr></thead>
                <tbody>
                  {finishingList.map(f => (
                    <tr key={f.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.3rem 0.4rem', fontWeight: 600 }}>{f.name}</td>
                      <td style={{ padding: '0.3rem 0.4rem', textAlign: 'center' }}><span style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: 3, fontSize: '0.6rem' }}>{f.type}</span></td>
                      <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', color: '#b45309' }}>{f.fixed_cost>0?`฿${f.fixed_cost}`:'-'}</td>
                      <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', color: '#059669' }}>{f.variable_cost>0?`฿${f.variable_cost}/${f.unit}`:'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
