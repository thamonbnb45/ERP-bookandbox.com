import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (import.meta.env.PROD ? '' : 'http://localhost:3001') + '/api/pf';

const PROCESS_LABELS = { printing:'พิมพ์', lamination:'เคลือบ', diecut:'ไดคัท', folding:'พับ', binding:'เย็บเล่ม', cutting:'ตัด' };
const TABS = [
  { id:'dashboard', label:'📊 Dashboard', icon:'fa-chart-pie' },
  { id:'jobs', label:'📋 งานทั้งหมด', icon:'fa-list' },
  { id:'create', label:'➕ สร้างงาน', icon:'fa-plus' },
  { id:'machines', label:'⚙️ เครื่องจักร', icon:'fa-gears' },
  { id:'inventory', label:'📦 วัตถุดิบ', icon:'fa-boxes-stacked' },
];

const card = { background:'white', borderRadius:'12px', padding:'1rem', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' };

export default function PrintFlow() {
  const [tab, setTab] = useState('dashboard');
  const [machines, setMachines] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [m, j, q, mt] = await Promise.all([
        axios.get(`${API}/machines`), axios.get(`${API}/jobs`),
        axios.get(`${API}/queue`), axios.get(`${API}/materials`)
      ]);
      setMachines(m.data||[]); setJobs(j.data||[]); setQueue(q.data||[]); setMaterials(mt.data||[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const activeJobs = jobs.filter(j => !['completed','delivered'].includes(j.status));
  const pendingQ = queue.filter(q => q.status !== 'completed');
  const lowStock = materials.filter(m => m.current_stock <= m.minimum_stock);

  return (
    <div className="view-section active" style={{ padding:'1rem' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <div>
          <h2 style={{ margin:0, color:'var(--primary)' }}><i className="fa-solid fa-industry"></i> Print Flow Plan</h2>
          <p style={{ margin:0, fontSize:'0.8rem', color:'var(--text-muted)' }}>ระบบจัดการสายการผลิต Offset Printing</p>
        </div>
        <button onClick={reload} className="btn btn-sm btn-primary"><i className="fa-solid fa-rotate"></i> รีเฟรช</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.3rem', marginBottom:'1rem', overflowX:'auto', flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'0.4rem 0.8rem', borderRadius:'8px', fontSize:'0.8rem', fontWeight:'bold', cursor:'pointer',
            border: tab === t.id ? '2px solid var(--primary)' : '1px solid #e2e8f0',
            background: tab === t.id ? '#eff6ff' : 'white', color: tab === t.id ? 'var(--primary)' : '#475569'
          }}><i className={`fa-solid ${t.icon}`}></i> {t.label}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i><p>กำลังโหลด...</p></div>}

      {!loading && tab === 'dashboard' && <DashboardTab jobs={jobs} activeJobs={activeJobs} machines={machines} queue={queue} pendingQ={pendingQ} lowStock={lowStock} />}
      {!loading && tab === 'jobs' && <JobsTab jobs={jobs} queue={queue} reload={reload} />}
      {!loading && tab === 'create' && <CreateTab machines={machines} queue={queue} reload={reload} setTab={setTab} />}
      {!loading && tab === 'machines' && <MachinesTab machines={machines} queue={queue} reload={reload} />}
      {!loading && tab === 'inventory' && <InventoryTab materials={materials} reload={reload} />}
    </div>
  );
}

// ===== DASHBOARD =====
function DashboardTab({ jobs, activeJobs, machines, queue, pendingQ, lowStock }) {
  const totalQH = pendingQ.reduce((s,e) => s + (e.estimated_hours||0), 0);
  const activeMachines = machines.filter(m => m.status === 'active');
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'0.8rem', marginBottom:'1.5rem' }}>
        {[
          { label:'งานทั้งหมด', val:jobs.length, sub:`${activeJobs.length} กำลังผลิต`, color:'#3b82f6', border:'#3b82f6' },
          { label:'เครื่องจักร', val:activeMachines.length, sub:`${machines.length} ทั้งหมด`, color:'#10b981', border:'#10b981' },
          { label:'คิวรอ', val:pendingQ.length, sub:`${totalQH.toFixed(1)} ชม.`, color:'#f59e0b', border:'#f59e0b' },
          { label:'วัตถุดิบต่ำ', val:lowStock.length, sub: lowStock.length > 0 ? 'ต้องสั่งเพิ่ม!' : 'ปกติ', color: lowStock.length > 0 ? '#dc2626' : '#10b981', border: lowStock.length > 0 ? '#dc2626' : '#10b981' },
        ].map((c,i) => (
          <div key={i} style={{ ...card, borderTop:`4px solid ${c.border}`, textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'bold', color:c.color }}>{c.val}</div>
            <div style={{ fontSize:'0.75rem', color:'#475569' }}>{c.label}</div>
            <div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>{c.sub}</div>
          </div>
        ))}
      </div>
      {/* Machine capacity */}
      <div style={card}>
        <h4 style={{ margin:'0 0 0.8rem', fontSize:'0.9rem' }}>⚙️ Machine Capacity</h4>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'0.5rem' }}>
          {machines.map(m => {
            const mq = queue.filter(q => q.machine_id === m.id && q.status !== 'completed');
            const hrs = mq.reduce((s,e) => s + (e.estimated_hours||0), 0);
            const pct = Math.min(hrs / 10 * 100, 100);
            return (
              <div key={m.id} style={{ padding:'0.5rem', background:'#f8fafc', borderRadius:'8px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', fontWeight:'bold' }}>
                  <span>{m.name}</span>
                  <span style={{ color: m.status === 'active' ? '#10b981' : '#dc2626' }}>{m.status === 'active' ? '🟢' : '🔴'}</span>
                </div>
                <div style={{ fontSize:'0.65rem', color:'#64748b' }}>{mq.length} คิว • {hrs.toFixed(1)} ชม.</div>
                <div style={{ background:'#e2e8f0', borderRadius:'4px', height:'6px', marginTop:'0.3rem' }}>
                  <div style={{ width:`${pct}%`, background: pct > 80 ? '#dc2626' : pct > 50 ? '#f59e0b' : '#10b981', height:'100%', borderRadius:'4px', transition:'width 0.5s' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== JOBS LIST =====
function JobsTab({ jobs, queue, reload }) {
  const STATUS_COLORS = { pending:'#94a3b8', prepress:'#f59e0b', printing:'#3b82f6', postpress:'#8b5cf6', completed:'#10b981', delivered:'#16a34a' };
  const handleStatusChange = async (id, status) => {
    await axios.put(`${API}/jobs/${id}`, { status });
    reload();
  };
  return (
    <div style={card}>
      <h4 style={{ margin:'0 0 0.8rem' }}>📋 รายการงานทั้งหมด ({jobs.length})</h4>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
          <thead><tr style={{ background:'#f8fafc', textAlign:'left' }}>
            <th style={{ padding:'0.5rem' }}>เลขงาน</th><th>ลูกค้า</th><th>สินค้า</th><th>จำนวน</th><th>สถานะ</th><th>วันส่ง</th><th></th>
          </tr></thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'0.5rem', fontWeight:'bold' }}>{j.job_number}</td>
                <td>{j.customer_name || '-'}</td>
                <td>{j.product_name}</td>
                <td>{j.quantity?.toLocaleString()}</td>
                <td>
                  <select value={j.status} onChange={e => handleStatusChange(j.id, e.target.value)} style={{ padding:'0.2rem 0.4rem', borderRadius:'6px', border:`2px solid ${STATUS_COLORS[j.status]||'#ccc'}`, fontSize:'0.7rem', fontWeight:'bold', color:STATUS_COLORS[j.status] }}>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ fontSize:'0.7rem' }}>{j.estimated_delivery ? new Date(j.estimated_delivery).toLocaleDateString('th-TH',{day:'numeric',month:'short'}) : '-'}</td>
                <td><button onClick={async() => { if(confirm('ลบงานนี้?')) { await axios.delete(`${API}/jobs/${j.id}`); reload(); }}} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer' }}><i className="fa-solid fa-trash"></i></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <p style={{ textAlign:'center', color:'#94a3b8', padding:'2rem' }}>ยังไม่มีงาน</p>}
      </div>
    </div>
  );
}

// ===== CREATE JOB =====
function CreateTab({ machines, queue, reload, setTab }) {
  const [form, setForm] = useState({ job_number:'', customer_name:'', product_name:'', paper_size:'', paper_type:'', gsm:150, colors:'4+0', quantity:1000, sheets:1000, printing_machine_id:'', postpress_steps:[], priority:'normal', notes:'' });
  const [saving, setSaving] = useState(false);
  const printMachines = machines.filter(m => m.type === 'printing' && m.status === 'active');

  const toggleStep = (step) => {
    setForm(f => ({ ...f, postpress_steps: f.postpress_steps.includes(step) ? f.postpress_steps.filter(s => s !== step) : [...f.postpress_steps, step] }));
  };

  const handleSubmit = async () => {
    if (!form.job_number || !form.product_name) return alert('กรุณากรอก เลขงาน และ ชื่อสินค้า');
    setSaving(true);
    try {
      const job = await axios.post(`${API}/jobs`, { ...form, printing_machine_id: form.printing_machine_id ? Number(form.printing_machine_id) : null });
      // Create queue entries
      const allProcs = ['printing', ...form.postpress_steps];
      for (const proc of allProcs) {
        let machine;
        if (proc === 'printing') machine = machines.find(m => m.id === Number(form.printing_machine_id));
        else machine = machines.find(m => m.type === proc && m.status === 'active');
        if (!machine) continue;
        const hrs = machine.capacity_per_hour ? Math.ceil(form.sheets / machine.capacity_per_hour * 100) / 100 : 1;
        await axios.post(`${API}/queue`, { job_id: job.data.id, job_number: form.job_number, machine_id: machine.id, machine_name: machine.name, process_type: proc, sheets: form.sheets, estimated_hours: hrs, status:'queued' });
      }
      alert(`✅ สร้างงาน ${form.job_number} สำเร็จ!`);
      reload(); setTab('jobs');
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const inp = { padding:'0.4rem 0.6rem', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'0.85rem', width:'100%' };
  return (
    <div style={{ ...card, maxWidth:'700px' }}>
      <h4 style={{ margin:'0 0 1rem' }}>➕ สร้างงานใหม่</h4>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>เลขงาน *</label><input style={inp} value={form.job_number} onChange={e => setForm({...form, job_number:e.target.value})} placeholder="JO-001" /></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>ลูกค้า</label><input style={inp} value={form.customer_name} onChange={e => setForm({...form, customer_name:e.target.value})} /></div>
        <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:'0.7rem', color:'#64748b' }}>ชื่อสินค้า *</label><input style={inp} value={form.product_name} onChange={e => setForm({...form, product_name:e.target.value})} /></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>ขนาดกระดาษ</label><input style={inp} value={form.paper_size} onChange={e => setForm({...form, paper_size:e.target.value})} placeholder="A4, A3, 31x43" /></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>ประเภทกระดาษ</label><input style={inp} value={form.paper_type} onChange={e => setForm({...form, paper_type:e.target.value})} placeholder="อาร์ตการ์ด, กรีนการ์ด" /></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>แกรม</label><input type="number" style={inp} value={form.gsm} onChange={e => setForm({...form, gsm:+e.target.value})} /></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>สี</label><select style={inp} value={form.colors} onChange={e => setForm({...form, colors:e.target.value})}><option>4+0</option><option>4+4</option><option>1+0</option><option>1+1</option><option>2+0</option></select></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>จำนวน (ชิ้น)</label><input type="number" style={inp} value={form.quantity} onChange={e => setForm({...form, quantity:+e.target.value})} /></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>จำนวนแผ่นพิมพ์</label><input type="number" style={inp} value={form.sheets} onChange={e => setForm({...form, sheets:+e.target.value})} /></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>เครื่องพิมพ์</label><select style={inp} value={form.printing_machine_id} onChange={e => setForm({...form, printing_machine_id:e.target.value})}><option value="">เลือก...</option>{printMachines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        <div><label style={{ fontSize:'0.7rem', color:'#64748b' }}>ความเร่งด่วน</label><select style={inp} value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}><option value="normal">ปกติ</option><option value="urgent">ด่วน</option><option value="rush">ด่วนมาก</option></select></div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={{ fontSize:'0.7rem', color:'#64748b' }}>ขั้นตอนหลังพิมพ์</label>
          <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', marginTop:'0.3rem' }}>
            {Object.entries(PROCESS_LABELS).filter(([k]) => k !== 'printing').map(([k,v]) => (
              <button key={k} onClick={() => toggleStep(k)} style={{ padding:'0.3rem 0.6rem', borderRadius:'20px', border: form.postpress_steps.includes(k) ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: form.postpress_steps.includes(k) ? '#eff6ff' : 'white', fontSize:'0.75rem', cursor:'pointer' }}>{v}</button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:'0.7rem', color:'#64748b' }}>หมายเหตุ</label><textarea style={{...inp, height:'60px'}} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})}></textarea></div>
      </div>
      <button onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ marginTop:'1rem', width:'100%' }}>{saving ? 'กำลังบันทึก...' : '✅ สร้างงานและจัดคิว'}</button>
    </div>
  );
}

// ===== MACHINES =====
function MachinesTab({ machines, queue, reload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', type:'printing', capacity_per_hour:5000, working_hours_start:'08:00', working_hours_end:'18:00' });
  const handleAdd = async () => {
    if (!form.name) return;
    await axios.post(`${API}/machines`, form);
    setShowAdd(false); setForm({ name:'', type:'printing', capacity_per_hour:5000, working_hours_start:'08:00', working_hours_end:'18:00' });
    reload();
  };
  const inp = { padding:'0.3rem 0.5rem', borderRadius:'6px', border:'1px solid #e2e8f0', fontSize:'0.8rem' };
  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.8rem' }}>
        <h4 style={{ margin:0 }}>⚙️ เครื่องจักร ({machines.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-sm btn-primary">+ เพิ่ม</button>
      </div>
      {showAdd && (
        <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.8rem', flexWrap:'wrap', padding:'0.8rem', background:'#f8fafc', borderRadius:'8px' }}>
          <input style={inp} placeholder="ชื่อเครื่อง" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
          <select style={inp} value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
            {Object.entries(PROCESS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input style={{...inp, width:'80px'}} type="number" placeholder="แผ่น/ชม." value={form.capacity_per_hour} onChange={e => setForm({...form, capacity_per_hour:+e.target.value})} />
          <button onClick={handleAdd} className="btn btn-sm btn-primary">บันทึก</button>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'0.5rem' }}>
        {machines.map(m => {
          const mq = queue.filter(q => q.machine_id === m.id && q.status !== 'completed');
          return (
            <div key={m.id} style={{ padding:'0.8rem', background:'#f8fafc', borderRadius:'10px', borderLeft:`4px solid ${m.status === 'active' ? '#10b981' : '#dc2626'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div style={{ fontWeight:'bold', fontSize:'0.85rem' }}>{m.name}</div>
                <span style={{ fontSize:'0.65rem', background: m.status === 'active' ? '#dcfce7' : '#fee2e2', color: m.status === 'active' ? '#166534' : '#991b1b', padding:'0.1rem 0.4rem', borderRadius:'8px' }}>{m.status}</span>
              </div>
              <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{PROCESS_LABELS[m.type]} • {m.capacity_per_hour?.toLocaleString()} แผ่น/ชม.</div>
              <div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>{m.working_hours_start}-{m.working_hours_end} • {mq.length} คิว</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== INVENTORY =====
function InventoryTab({ materials, reload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', category:'paper', unit:'แผ่น', current_stock:0, minimum_stock:0, cost_per_unit:0 });
  const handleAdd = async () => {
    if (!form.name) return;
    await axios.post(`${API}/materials`, form);
    setShowAdd(false); reload();
  };
  const handleUpdateStock = async (id, current_stock) => {
    await axios.put(`${API}/materials/${id}`, { current_stock });
    reload();
  };
  const inp = { padding:'0.3rem 0.5rem', borderRadius:'6px', border:'1px solid #e2e8f0', fontSize:'0.8rem' };
  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.8rem' }}>
        <h4 style={{ margin:0 }}>📦 วัตถุดิบ ({materials.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-sm btn-primary">+ เพิ่ม</button>
      </div>
      {showAdd && (
        <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.8rem', flexWrap:'wrap', padding:'0.8rem', background:'#f8fafc', borderRadius:'8px' }}>
          <input style={inp} placeholder="ชื่อวัตถุดิบ" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
          <select style={inp} value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
            <option value="paper">กระดาษ</option><option value="ink">หมึก</option><option value="plate">เพลท</option><option value="other">อื่นๆ</option>
          </select>
          <input style={{...inp, width:'60px'}} type="number" placeholder="stock" value={form.current_stock} onChange={e => setForm({...form, current_stock:+e.target.value})} />
          <input style={{...inp, width:'60px'}} type="number" placeholder="min" value={form.minimum_stock} onChange={e => setForm({...form, minimum_stock:+e.target.value})} />
          <button onClick={handleAdd} className="btn btn-sm btn-primary">บันทึก</button>
        </div>
      )}
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
        <thead><tr style={{ background:'#f8fafc', textAlign:'left' }}>
          <th style={{ padding:'0.5rem' }}>ชื่อ</th><th>ประเภท</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>สถานะ</th>
        </tr></thead>
        <tbody>
          {materials.map(m => (
            <tr key={m.id} style={{ borderBottom:'1px solid #f1f5f9', background: m.current_stock <= m.minimum_stock ? '#fef2f2' : 'transparent' }}>
              <td style={{ padding:'0.5rem', fontWeight:'bold' }}>{m.name}</td>
              <td>{m.category}</td>
              <td><input type="number" value={m.current_stock} onChange={e => handleUpdateStock(m.id, +e.target.value)} style={{ width:'80px', padding:'0.2rem', borderRadius:'4px', border:'1px solid #e2e8f0', textAlign:'right' }} /> {m.unit}</td>
              <td>{m.minimum_stock} {m.unit}</td>
              <td>{m.current_stock <= m.minimum_stock ? <span style={{ color:'#dc2626', fontWeight:'bold' }}>⚠️ ต่ำ</span> : <span style={{ color:'#10b981' }}>✅ ปกติ</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {materials.length === 0 && <p style={{ textAlign:'center', color:'#94a3b8', padding:'2rem' }}>ยังไม่มีวัตถุดิบ</p>}
    </div>
  );
}
