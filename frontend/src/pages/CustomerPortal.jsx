import { useState, useEffect } from 'react';
import axios from 'axios';
const API = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const PRODUCTS = [
  { id: 'flyer', name: 'ใบปลิว / แผ่นพับ', icon: '📄', sizes: ['A6','A5','A4','A3','DL'] },
  { id: 'card', name: 'นามบัตร', icon: '💳', sizes: ['นามบัตร'] },
  { id: 'brochure', name: 'โบรชัวร์', icon: '📰', sizes: ['A4','A5','A3'] },
  { id: 'box', name: 'กล่องบรรจุภัณฑ์', icon: '📦', sizes: ['A4','A3','B4'] },
  { id: 'bag', name: 'ถุงกระดาษ', icon: '🛍️', sizes: ['A4','A3'] },
  { id: 'sticker', name: 'สติกเกอร์ / ฉลาก', icon: '🏷️', sizes: ['A6','A5','A4'] },
  { id: 'book', name: 'หนังสือ / แคตตาล็อก', icon: '📚', sizes: ['A4','A5','B5'] },
  { id: 'calendar', name: 'ปฏิทิน', icon: '📅', sizes: ['A4','A3'] },
];
const QTYS = [500, 1000, 2000, 3000, 5000, 10000];

export default function CustomerPortal() {
  const [papers, setPapers] = useState([]);
  const [finishing, setFinishing] = useState([]);
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [form, setForm] = useState({ size:'A4', paperName:'อาร์ตด้าน', paperGsm:128, colors:4, sides:2, quantity:1000, gangRun:true, margin:30, finishing:[] });
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selQty, setSelQty] = useState(1000);
  const [selSpeed, setSelSpeed] = useState('normal');
  const [showTrack, setShowTrack] = useState(false);
  const [trackPhone, setTrackPhone] = useState('');
  const [trackResult, setTrackResult] = useState(null);

  useEffect(() => {
    axios.get(`${API}/pricing/papers`).then(r => setPapers(r.data)).catch(() => {});
    axios.get(`${API}/pricing/finishing`).then(r => setFinishing(r.data)).catch(() => {});
  }, []);

  const calcAll = async () => {
    setLoading(true);
    try {
      const promises = QTYS.map(q => 
        axios.post(`${API}/pricing/estimate`, { ...form, quantity: q, productType: product.id })
          .then(r => ({ q, data: r.data }))
          .catch(() => ({ q, data: null }))
      );
      const responses = await Promise.all(promises);
      const res = {};
      responses.forEach(r => { res[r.q] = r.data; });
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (papers.length > 0) calcAll(); }, [form.size, form.paperName, form.paperGsm, form.colors, form.sides, form.gangRun, form.finishing, product]);

  const toggleFin = n => setForm(p => ({...p, finishing: p.finishing.includes(n) ? p.finishing.filter(x=>x!==n) : [...p.finishing, n]}));
  const sel = results[selQty];

  const STAGES = [
    { key:'awaiting_payment', label:'รอชำระ', icon:'fa-clock' },
    { key:'planning', label:'วางแผน', icon:'fa-clipboard-list' },
    { key:'design', label:'ตรวจไฟล์', icon:'fa-pen-ruler' },
    { key:'printer', label:'พิมพ์', icon:'fa-print' },
    { key:'diecut', label:'หลังพิมพ์', icon:'fa-scissors' },
    { key:'shipping', label:'จัดส่ง', icon:'fa-truck-fast' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'"Kanit",sans-serif' }}>
      {/* HEADER */}
      <header style={{ background:'linear-gradient(135deg,#0f172a,#1e3a5f)', color:'white', padding:'0.8rem 5%', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
        <h2 style={{ margin:0, fontSize:'1.4rem' }}>Book<span style={{ color:'#60a5fa' }}>and</span>box<span style={{ fontSize:'0.85rem', color:'#94a3b8', marginLeft:'0.5rem' }}>Print Portal</span></h2>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <button onClick={()=>setShowTrack(!showTrack)} style={{ background: showTrack?'#3b82f6':'rgba(255,255,255,0.1)', padding:'0.5rem 1rem', borderRadius:'20px', border:'none', color:'white', cursor:'pointer', fontSize:'0.85rem' }}>
            <i className="fa-solid fa-search"></i> ตรวจสถานะงาน
          </button>
          <span style={{ background:'rgba(255,255,255,0.1)', padding:'0.4rem 0.8rem', borderRadius:'20px', fontSize:'0.8rem' }}>🚚 ส่งฟรี เมื่อสั่ง 1,000+</span>
        </div>
      </header>

      {/* TRACKER */}
      {showTrack && (
        <div style={{ background:'#0f172a', padding:'1.5rem 5%', color:'white' }}>
          <div style={{ maxWidth:600, margin:'0 auto' }}>
            <h4 style={{ color:'white', marginBottom:'0.5rem' }}>🔍 ตรวจสอบสถานะงาน</h4>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <input placeholder="เบอร์โทร เช่น 0812345678" value={trackPhone} onChange={e=>setTrackPhone(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleTrack()} style={{ flex:1, padding:'0.6rem', borderRadius:8, border:'none', fontSize:'0.95rem' }} />
              <button onClick={async()=>{ try { const r = await axios.get(`${API}/portal/track/${trackPhone}`); setTrackResult(r.data); } catch{ setTrackResult({error:'ไม่พบข้อมูล'}); }}} style={{ padding:'0.6rem 1.2rem', background:'#3b82f6', color:'white', border:'none', borderRadius:8, cursor:'pointer' }}>ค้นหา</button>
            </div>
            {trackResult && (
              <div style={{ marginTop:'1rem' }}>
                {trackResult.error ? <p style={{ color:'#f87171' }}>❌ {trackResult.error}</p> : (
                  trackResult.orders?.map((o,i) => (
                    <div key={i} style={{ background:'rgba(255,255,255,0.05)', padding:'1rem', borderRadius:10, marginTop:'0.5rem' }}>
                      <strong>JOB #{o.id}</strong> — {o.product} x{o.quantity}
                      <div style={{ display:'flex', gap:0, marginTop:'0.6rem' }}>
                        {STAGES.map((s,si) => {
                          const ci = STAGES.findIndex(x=>x.key===o.production_stage);
                          const done = si <= ci;
                          return (<div key={si} style={{ flex:1, textAlign:'center' }}>
                            <div style={{ width:28, height:28, borderRadius:'50%', background:done?si===ci?'#3b82f6':'#10b981':'rgba(255,255,255,0.15)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:'white' }}><i className={`fa-solid ${s.icon}`}></i></div>
                            <div style={{ fontSize:'0.55rem', color:done?'#93c5fd':'#64748b', marginTop:2 }}>{s.label}</div>
                          </div>);
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HERO */}
      <div style={{ background:'linear-gradient(135deg,#1e40af,#7c3aed)', padding:'2.5rem 5%', color:'white', textAlign:'center' }}>
        <h1 style={{ fontSize:'2rem', margin:0, color:'white' }}>สั่งพิมพ์ออนไลน์ ราคาโรงงาน</h1>
        <p style={{ opacity:0.9, fontSize:'1.05rem', marginTop:'0.3rem' }}>เลือกสเปค → เห็นราคาทันที → สั่งผลิตได้เลย</p>
      </div>

      {/* PRODUCT SELECTOR */}
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'1rem 5%', overflowX:'auto' }}>
        <div style={{ display:'flex', gap:'0.5rem', minWidth:'max-content' }}>
          {PRODUCTS.map(p => (
            <button key={p.id} onClick={()=>{ setProduct(p); setForm(f=>({...f, size:p.sizes[0]})); }} style={{ padding:'0.6rem 1.2rem', borderRadius:25, border: product.id===p.id?'2px solid #7c3aed':'1px solid #e2e8f0', background: product.id===p.id?'#f5f3ff':'white', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'Kanit', fontSize:'0.9rem', fontWeight: product.id===p.id?700:400, color: product.id===p.id?'#7c3aed':'#475569' }}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ padding:'1.5rem 5%', display:'flex', gap:'1.5rem', flexWrap:'wrap', alignItems:'flex-start' }}>
        {/* LEFT: CONFIG */}
        <div style={{ flex:'0 0 340px', display:'flex', flexDirection:'column', gap:'1rem' }}>
          {/* Size */}
          <div style={{ background:'white', padding:'1.2rem', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
            <label style={{ fontWeight:700, fontSize:'0.9rem', color:'#1e293b' }}>📐 ขนาด</label>
            <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.5rem', flexWrap:'wrap' }}>
              {product.sizes.map(s => (
                <button key={s} onClick={()=>setForm({...form, size:s})} style={{ padding:'0.5rem 1rem', borderRadius:8, border: form.size===s?'2px solid #7c3aed':'1px solid #e2e8f0', background: form.size===s?'#f5f3ff':'white', cursor:'pointer', fontFamily:'Kanit', fontWeight: form.size===s?700:400, color: form.size===s?'#7c3aed':'#475569' }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Paper */}
          <div style={{ background:'white', padding:'1.2rem', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
            <label style={{ fontWeight:700, fontSize:'0.9rem', color:'#1e293b' }}>📄 กระดาษ</label>
            <select value={`${form.paperName}|${form.paperGsm}`} onChange={e=>{ const [n,g]=e.target.value.split('|'); setForm({...form, paperName:n, paperGsm:parseInt(g)}); }} style={{ width:'100%', padding:'0.6rem', borderRadius:8, border:'1px solid #e2e8f0', marginTop:'0.4rem', fontFamily:'Kanit', fontSize:'0.9rem' }}>
              {papers.map(p => <option key={p.id} value={`${p.name}|${p.gsm}`}>{p.name} {p.gsm}gsm</option>)}
            </select>
          </div>

          {/* Colors & Sides */}
          <div style={{ display:'flex', gap:'0.8rem' }}>
            <div style={{ flex:1, background:'white', padding:'1rem', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
              <label style={{ fontWeight:700, fontSize:'0.85rem', color:'#1e293b' }}>🎨 สี</label>
              <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.4rem' }}>
                {[1,2,4].map(c => (
                  <button key={c} onClick={()=>setForm({...form,colors:c})} style={{ flex:1, padding:'0.4rem', borderRadius:6, border: form.colors===c?'2px solid #3b82f6':'1px solid #e2e8f0', background: form.colors===c?'#eff6ff':'white', cursor:'pointer', fontFamily:'Kanit', fontSize:'0.85rem', fontWeight: form.colors===c?700:400 }}>{c}สี</button>
                ))}
              </div>
            </div>
            <div style={{ flex:1, background:'white', padding:'1rem', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
              <label style={{ fontWeight:700, fontSize:'0.85rem', color:'#1e293b' }}>📑 ด้าน</label>
              <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.4rem' }}>
                {[1,2].map(s => (
                  <button key={s} onClick={()=>setForm({...form,sides:s})} style={{ flex:1, padding:'0.4rem', borderRadius:6, border: form.sides===s?'2px solid #3b82f6':'1px solid #e2e8f0', background: form.sides===s?'#eff6ff':'white', cursor:'pointer', fontFamily:'Kanit', fontSize:'0.85rem', fontWeight: form.sides===s?700:400 }}>{s}ด้าน</button>
                ))}
              </div>
            </div>
          </div>

          {/* Finishing */}
          <div style={{ background:'white', padding:'1.2rem', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
            <label style={{ fontWeight:700, fontSize:'0.9rem', color:'#1e293b' }}>✨ ตกแต่งเพิ่มเติม</label>
            <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', marginTop:'0.5rem' }}>
              {finishing.filter(f=>['coating','laminate','folding'].includes(f.type)).map(f => (
                <button key={f.id} onClick={()=>toggleFin(f.name)} style={{ padding:'0.35rem 0.7rem', borderRadius:20, border: form.finishing.includes(f.name)?'2px solid #8b5cf6':'1px solid #e2e8f0', background: form.finishing.includes(f.name)?'#f5f3ff':'white', cursor:'pointer', fontSize:'0.78rem', fontFamily:'Kanit', color: form.finishing.includes(f.name)?'#7c3aed':'#64748b' }}>
                  {form.finishing.includes(f.name)&&'✓ '}{f.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: PRICE TABLE */}
        <div style={{ flex:'1 1 500px' }}>
          <div style={{ background:'white', borderRadius:16, boxShadow:'0 4px 15px rgba(0,0,0,0.08)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#059669,#047857)', padding:'1.2rem 1.5rem', color:'white' }}>
              <h3 style={{ margin:0, color:'white', fontSize:'1.1rem' }}>{product.icon} {product.name} — ตารางราคา</h3>
              <p style={{ margin:'0.2rem 0 0', opacity:0.9, fontSize:'0.85rem' }}>{form.size} | {form.paperName} {form.paperGsm}gsm | {form.colors}สี {form.sides}ด้าน {form.finishing.length>0?`| ${form.finishing.join(', ')}`:''}</p>
            </div>

            {loading ? (
              <div style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:'2rem', marginBottom:'0.5rem', animation:'spin 1s linear infinite' }}>⏳</div>
                กำลังคำนวณราคา...
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                    <th style={{ padding:'1rem 0.5rem', textAlign:'center', color:'#64748b', fontSize:'0.85rem', width:'25%' }}>จำนวน</th>
                    <th style={{ padding:'1rem 0.5rem', textAlign:'center', width:'25%', borderLeft:'1px solid #e2e8f0' }}>
                       <div style={{ color:'#e11d48', fontSize:'1rem', fontWeight:800 }}>⚡ ด่วนพิเศษ</div>
                       <div style={{ color:'#64748b', fontSize:'0.75rem', fontWeight:400 }}>1-2 วันทำการ</div>
                    </th>
                    <th style={{ padding:'1rem 0.5rem', textAlign:'center', width:'25%', borderLeft:'1px solid #e2e8f0' }}>
                       <div style={{ color:'#f59e0b', fontSize:'1rem', fontWeight:800 }}>🚀 ด่วน</div>
                       <div style={{ color:'#64748b', fontSize:'0.75rem', fontWeight:400 }}>3-4 วันทำการ</div>
                    </th>
                    <th style={{ padding:'1rem 0.5rem', textAlign:'center', width:'25%', borderLeft:'1px solid #e2e8f0', background:'#f0fdf4' }}>
                       <div style={{ color:'#059669', fontSize:'1rem', fontWeight:800 }}>🚚 ปกติ</div>
                       <div style={{ color:'#64748b', fontSize:'0.75rem', fontWeight:400 }}>5-7 วันทำการ</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {QTYS.map(q => {
                    const r = results[q];
                    if (!r) return null;
                    const basePrice = r.sellingPrice;
                    const isSelectedQty = selQty === q;
                    return (
                      <tr key={q} style={{ borderBottom:'1px solid #f1f5f9', transition:'background 0.2s', background: isSelectedQty ? '#f8fafc' : 'white' }}>
                        <td style={{ padding:'1.2rem 0.5rem', textAlign:'center', fontWeight:800, fontSize:'1.1rem', color:'#1e293b', borderRight:'1px solid #f1f5f9' }}>{q.toLocaleString()}</td>
                        {/* 1 Day (+40%) */}
                        <td onClick={()=>{setSelQty(q); setSelSpeed('rush');}} style={{ padding:'1rem 0.5rem', textAlign:'center', cursor:'pointer', borderRight:'1px solid #f1f5f9', background: (isSelectedQty && selSpeed === 'rush') ? '#fff1f2' : 'transparent', transition:'all 0.2s' }}>
                           <div style={{ fontSize:'1.1rem', fontWeight:700, color:(isSelectedQty && selSpeed === 'rush')?'#e11d48':'#475569' }}>฿{Math.round(basePrice * 1.4).toLocaleString()}</div>
                           <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>฿{(Math.round(basePrice * 1.4)/q).toFixed(2)}/ชิ้น</div>
                           {(isSelectedQty && selSpeed === 'rush') && <div style={{ background:'#e11d48', color:'white', fontSize:'0.7rem', padding:'0.2rem 0.5rem', borderRadius:10, display:'inline-block', marginTop:'0.5rem' }}>✓ เลือก</div>}
                        </td>
                        {/* 3 Days (+20%) */}
                        <td onClick={()=>{setSelQty(q); setSelSpeed('fast');}} style={{ padding:'1rem 0.5rem', textAlign:'center', cursor:'pointer', borderRight:'1px solid #f1f5f9', background: (isSelectedQty && selSpeed === 'fast') ? '#fffbeb' : 'transparent', transition:'all 0.2s' }}>
                           <div style={{ fontSize:'1.1rem', fontWeight:700, color:(isSelectedQty && selSpeed === 'fast')?'#f59e0b':'#475569' }}>฿{Math.round(basePrice * 1.2).toLocaleString()}</div>
                           <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>฿{(Math.round(basePrice * 1.2)/q).toFixed(2)}/ชิ้น</div>
                           {(isSelectedQty && selSpeed === 'fast') && <div style={{ background:'#f59e0b', color:'white', fontSize:'0.7rem', padding:'0.2rem 0.5rem', borderRadius:10, display:'inline-block', marginTop:'0.5rem' }}>✓ เลือก</div>}
                        </td>
                        {/* 5 Days (Base) */}
                        <td onClick={()=>{setSelQty(q); setSelSpeed('normal');}} style={{ padding:'1rem 0.5rem', textAlign:'center', cursor:'pointer', background: (isSelectedQty && selSpeed === 'normal') ? '#ecfdf5' : 'transparent', transition:'all 0.2s' }}>
                           <div style={{ fontSize:'1.1rem', fontWeight:800, color:(isSelectedQty && selSpeed === 'normal')?'#059669':'#475569' }}>฿{Math.round(basePrice).toLocaleString()}</div>
                           <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>฿{(Math.round(basePrice)/q).toFixed(2)}/ชิ้น</div>
                           {(isSelectedQty && selSpeed === 'normal') && <div style={{ background:'#059669', color:'white', fontSize:'0.7rem', padding:'0.2rem 0.5rem', borderRadius:10, display:'inline-block', marginTop:'0.5rem' }}>✓ เลือกราคาที่ถูกที่สุด</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Selected Summary */}
            {sel && (
              <div style={{ borderTop:'2px solid #059669', padding:'1.5rem', background: selSpeed==='rush'?'#fff1f2':selSpeed==='fast'?'#fffbeb':'#f0fdf4', transition:'background 0.3s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
                  <div>
                    <div style={{ fontSize:'0.85rem', color:'#475569', fontWeight:600 }}>สรุปรายการสั่งผลิตของคุณ:</div>
                    <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#1e293b', marginTop:'0.2rem' }}>
                      {selQty.toLocaleString()} ชิ้น 
                      <span style={{ fontSize:'0.9rem', fontWeight:400, color:'#64748b', marginLeft:'0.5rem' }}>
                        (จัดส่ง: {selSpeed==='rush'?'ด่วนพิเศษ 1-2 วัน':selSpeed==='fast'?'ด่วน 3-4 วัน':'ปกติ 5-7 วัน'})
                      </span>
                    </div>
                    <div style={{ fontSize:'2.2rem', fontWeight:800, color: selSpeed==='rush'?'#e11d48':selSpeed==='fast'?'#f59e0b':'#059669', lineHeight:'1.2' }}>
                      ฿{selSpeed==='rush' ? Math.round(sel.sellingPrice * 1.4).toLocaleString() : selSpeed==='fast' ? Math.round(sel.sellingPrice * 1.2).toLocaleString() : sel.sellingPrice?.toLocaleString()}
                    </div>
                    <div style={{ fontSize:'0.85rem', color:'#64748b' }}>
                      (รวม VAT 7% ฿{Math.round((selSpeed==='rush' ? sel.sellingPrice * 1.4 : selSpeed==='fast' ? sel.sellingPrice * 1.2 : sel.sellingPrice) * 1.07).toLocaleString()})
                    </div>
                  </div>
                  <button style={{ padding:'1rem 2.5rem', borderRadius:12, border:'none', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'white', fontSize:'1.2rem', fontWeight:800, cursor:'pointer', fontFamily:'Kanit', boxShadow:'0 4px 15px rgba(124,58,237,0.3)', whiteSpace:'nowrap' }}>
                    🛒 หยิบใส่ตะกร้า
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Production Info Cards */}
          {sel && (
            <div style={{ display:'flex', gap:'0.6rem', marginTop:'1rem', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:100, background:'white', padding:'0.8rem', borderRadius:10, textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:'0.65rem', color:'#64748b' }}>วางดวง</div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'#1e293b' }}>{sel.imposition} ดวง</div>
              </div>
              <div style={{ flex:1, minWidth:100, background:'white', padding:'0.8rem', borderRadius:10, textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:'0.65rem', color:'#64748b' }}>เครื่องพิมพ์</div>
                <div style={{ fontWeight:700, fontSize:'0.85rem', color:'#1e293b' }}>{sel.machineCut}</div>
              </div>
              <div style={{ flex:1, minWidth:100, background:'white', padding:'0.8rem', borderRadius:10, textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:'0.65rem', color:'#64748b' }}>ระยะผลิต</div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'#f59e0b' }}>3-5 วัน</div>
              </div>
              <div style={{ flex:1, minWidth:100, background:'white', padding:'0.8rem', borderRadius:10, textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:'0.65rem', color:'#64748b' }}>จัดส่ง</div>
                <div style={{ fontWeight:700, fontSize:'0.85rem', color:'#10b981' }}>ฟรี กทม.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background:'#1e293b', color:'#94a3b8', padding:'2rem 5%', marginTop:'2rem', textAlign:'center', fontSize:'0.85rem' }}>
        <p>© 2026 BookAndBox.com — โรงพิมพ์ออฟเซทครบวงจร | <i className="fa-brands fa-line"></i> @bookandbox | 📞 02-xxx-xxxx</p>
      </footer>

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
