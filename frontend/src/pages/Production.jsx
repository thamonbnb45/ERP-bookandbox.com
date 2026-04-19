import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const STAGES = [
  { id: 'planning', label: '📅 รอวางแผน', color: '#f1f5f9', header: '#94a3b8' },
  { id: 'pre_press', label: '🖥️ เตรียมไฟล์/เพลท', color: '#e0e7ff', header: '#818cf8' },
  { id: 'printing', label: '🖨️ กำลังพิมพ์', color: '#fef08a', header: '#eab308' },
  { id: 'post_press', label: '✂️ หลังพิมพ์/พับ', color: '#fed7aa', header: '#f97316' },
  { id: 'shipping', label: '🚚 คลังและจัดส่ง', color: '#bbf7d0', header: '#22c55e' }
];

// Real Bookandbox Machines
const MACHINES = [
  { id: 'SM74F', name: 'SM74F (Heidelberg 2003)', maxPlates: 12, icon: 'fa-solid fa-print', color: '#3b82f6', year: 'มค.2569' },
  { id: 'SM102F', name: 'SM102F (Heidelberg 1999)', maxPlates: 10, icon: 'fa-solid fa-print', color: '#8b5cf6', year: 'พย.2567' },
];

const DEPARTMENTS = [
  { id: 'pre_press', label: 'Pre-press (เตรียมไฟล์)', icon: 'fa-solid fa-pen-ruler', color: '#818cf8' },
  { id: 'printing', label: 'พิมพ์ Offset', icon: 'fa-solid fa-print', color: '#eab308' },
  { id: 'post_press', label: 'หลังพิมพ์ (ตัด/เคลือบ/ไดคัท/พับ)', icon: 'fa-solid fa-scissors', color: '#f97316' },
  { id: 'shipping', label: 'QC + แพ็ค + จัดส่ง', icon: 'fa-solid fa-truck', color: '#22c55e' },
];

const DEFECT_REASONS = ['สีผิด/เพี้ยน', 'ไดคัทเบี้ยว', 'กาวไม่ติด', 'พับผิด', 'เคลือบเสีย', 'กระดาษยับ', 'อื่นๆ'];
const DOWNTIME_REASONS = ['Setup/ล้างเครื่อง', 'ซ่อมเครื่อง', 'รอวัสดุ/หมึก/กระดาษ', 'รอไฟล์/เพลท', 'พักเบรค', 'อื่นๆ'];

const SUB_TABS = [
  { id: 'board', label: 'บอร์ดคิว', icon: 'fa-solid fa-columns' },
  { id: 'log', label: 'บันทึกงาน', icon: 'fa-solid fa-clipboard-list' },
  { id: 'oee', label: 'OEE Dashboard', icon: 'fa-solid fa-gauge-high' },
  { id: 'dept', label: 'แผนก', icon: 'fa-solid fa-building' },
];

export default function Production() {
  const [jobOrders, setJobOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('board');
  const [trackingModal, setTrackingModal] = useState({ open: false, jobId: null, trackingNum: '' });
  const [assignModal, setAssignModal] = useState({ open: false, jobId: null, empId: '' });
  const [showWorkflow, setShowWorkflow] = useState(false);

  // Production Log state
  const [prodLogs, setProdLogs] = useState([]);
  const [oeeSummary, setOeeSummary] = useState(null);
  const [selectedDept, setSelectedDept] = useState('printing');
  const [logForm, setLogForm] = useState({
    machine: 'SM74F', department: 'printing', operator_name: '',
    planned_duration_min: 480, actual_run_min: 420, downtime_min: 60,
    downtime_reason: '', planned_qty: 5000, actual_qty: 4500,
    good_qty: 4400, defect_qty: 100, defect_reason: '', job_ref: '', notes: ''
  });

  useEffect(() => {
    fetchJobOrders();
    fetchEmployees();
    const interval = setInterval(fetchJobOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'log' || activeTab === 'dept') fetchLogs();
    if (activeTab === 'oee') fetchOEE();
  }, [activeTab]);

  const fetchJobOrders = () => {
    axios.get(`${API_URL}/job_orders`).then(res => setJobOrders(res.data)).catch(() => {});
  };
  const fetchEmployees = () => {
    axios.get(`${API_URL}/hr/employees`).then(res => setEmployees(res.data || [])).catch(() => {});
  };
  const fetchLogs = () => {
    axios.get(`${API_URL}/production_log`).then(res => setProdLogs(res.data || [])).catch(() => {});
  };
  const fetchOEE = () => {
    axios.get(`${API_URL}/production_log/summary?days=30`).then(res => setOeeSummary(res.data)).catch(() => {});
  };

  const submitLog = async () => {
    const form = { ...logForm, defect_qty: logForm.actual_qty - logForm.good_qty };
    try {
      await axios.post(`${API_URL}/production_log`, form);
      alert('บันทึกสำเร็จ!');
      setLogForm({ ...logForm, operator_name: '', actual_run_min: 420, downtime_min: 60, actual_qty: 4500, good_qty: 4400, defect_reason: '', downtime_reason: '', job_ref: '', notes: '' });
      fetchLogs();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Drag & Drop
  const handleDragStart = (e, jobId) => { e.dataTransfer.setData('jobId', jobId); e.currentTarget.style.opacity = '0.5'; };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; };
  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1)'; };
  const handleDragLeave = (e) => { e.currentTarget.style.boxShadow = 'none'; };
  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    e.currentTarget.style.boxShadow = 'none';
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;
    if (targetStageId === 'shipping') {
      setTrackingModal({ open: true, jobId, trackingNum: '' });
    } else {
      try { await axios.put(`${API_URL}/job_orders/${jobId}/move`, { production_stage: targetStageId }); fetchJobOrders(); } catch (err) { alert('Failed'); }
    }
  };

  const submitShipping = async () => {
    if (!trackingModal.trackingNum) return alert('กรุณากรอกเลข Tracking');
    try {
      await axios.put(`${API_URL}/job_orders/${trackingModal.jobId}/tracking`, { tracking_number: trackingModal.trackingNum });
      await axios.put(`${API_URL}/job_orders/${trackingModal.jobId}/move`, { production_stage: 'shipping' });
      setTrackingModal({ open: false, jobId: null, trackingNum: '' });
      fetchJobOrders();
    } catch (e) { alert('Error saving tracking'); }
  };

  const assignWorker = async () => {
    if (!assignModal.empId) return alert('เลือกพนักงาน');
    try {
      await axios.post(`${API_URL}/hr/assign`, { job_order_id: parseInt(assignModal.jobId), employee_id: parseInt(assignModal.empId) });
      setAssignModal({ open: false, jobId: null, empId: '' });
      fetchJobOrders();
    } catch (err) { alert('Error: ' + err.message); }
  };

  // Capacity
  const printingJobs = jobOrders.filter(j => j.production_stage === 'printing');
  const activeJobs = jobOrders.filter(j => j.production_stage !== 'shipping');
  const capacityData = MACHINES.map(m => {
    const load = m.id === 'SM74F' ? Math.min(Math.ceil(printingJobs.length * 0.55), m.maxPlates) : Math.min(Math.ceil(printingJobs.length * 0.45), m.maxPlates);
    const pct = Math.round((load / m.maxPlates) * 100);
    return { ...m, load, pct };
  });

  // OEE Gauge component
  const OEEGauge = ({ value, label, color }) => {
    const radius = 40, stroke = 8, circ = 2 * Math.PI * radius;
    const offset = circ - (circ * Math.min(value, 100)) / 100;
    const gaugeColor = value >= 85 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';
    return (
      <div style={{ textAlign: 'center' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={color || gaugeColor} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.8s' }} />
          <text x="50" y="50" textAnchor="middle" dy="6" fontSize="18" fontWeight="bold" fill={color || gaugeColor}>{value}%</text>
        </svg>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.3rem' }}>{label}</div>
      </div>
    );
  };

  return (
    <div className="view-section active" style={{ padding: '0' }}>
      
      {/* Header with Sub-tabs */}
      <div style={{ padding: '1rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-primary">🏭 Production Control</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            เครื่อง SM74F + SM102F | กำลังผลิต <strong>22 กรอบ/วัน</strong> | งาน Active: <strong style={{ color: activeJobs.length > 20 ? '#ef4444' : '#10b981' }}>{activeJobs.length}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {SUB_TABS.map(tab => (
            <button key={tab.id}
              className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ fontSize: '0.8rem' }}
            >
              <i className={tab.icon}></i> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Machine Capacity Bar (always visible) */}
      <div style={{ padding: '0.8rem 1.5rem', display: 'flex', gap: '0.8rem' }}>
        {capacityData.map(machine => (
          <div key={machine.id} style={{
            flex: 1, background: 'white', borderRadius: '10px', padding: '0.8rem',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                <i className={machine.icon} style={{ color: machine.color, marginRight: '0.3rem' }}></i>
                {machine.id}
              </span>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: machine.pct >= 80 ? '#ef4444' : machine.pct >= 50 ? '#f59e0b' : '#10b981'
              }}>
                {machine.pct}%
              </span>
            </div>
            <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                width: `${machine.pct}%`, height: '100%', borderRadius: '5px', transition: 'width 0.5s',
                background: machine.pct >= 80 ? '#ef4444' : machine.pct >= 50 ? '#f59e0b' : machine.color
              }}></div>
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.65rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>{machine.load}/{machine.maxPlates} กรอบ/วัน</span>
              <span style={{ color: '#64748b' }}>{machine.year}</span>
            </div>
            {machine.pct >= 80 && <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 700 }}>⚠️ ใกล้เต็ม!</span>}
          </div>
        ))}
        {/* Daily Total */}
        <div style={{
          minWidth: '140px', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: '10px', padding: '0.8rem',
          color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{capacityData.reduce((s, m) => s + m.load, 0)}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>/ 22 กรอบรวม</div>
          <div style={{ fontSize: '0.6rem', marginTop: '0.2rem', opacity: 0.6 }}>07:00 – 21:00 น.</div>
        </div>
      </div>

      {/* ========== TAB: KANBAN BOARD ========== */}
      {activeTab === 'board' && (
        <div style={{ display: 'flex', gap: '0.8rem', padding: '0 1rem 1rem', flex: 1, overflowX: 'auto', height: 'calc(100vh - var(--topbar-height) - 240px)' }}>
          {STAGES.map(stage => {
            const columnJobs = jobOrders.filter(j => j.production_stage === stage.id);
            return (
              <div key={stage.id}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                style={{ minWidth: '240px', flex: 1, background: stage.color, borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <div style={{ background: stage.header, color: 'white', padding: '0.6rem 0.8rem', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{stage.label}</span>
                  <span style={{background: 'rgba(255,255,255,0.3)', padding: '0 0.5rem', borderRadius: '12px', fontSize: '0.8rem'}}>{columnJobs.length}</span>
                </div>
                <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', flex: 1 }}>
                  {columnJobs.length === 0 && <div style={{opacity: 0.5, textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem'}}>ลากมาวางที่นี่...</div>}
                  {columnJobs.map(job => (
                    <div key={job.id} draggable="true" onDragStart={(e) => handleDragStart(e, job.id)} onDragEnd={handleDragEnd}
                      style={{ background: 'white', padding: '0.8rem', borderRadius: '6px', cursor: 'grab', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <strong style={{color: '#334155', fontSize: '0.85rem'}}>#JOB-{job.id}</strong>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                      <h5 style={{margin: '0.3rem 0', color: '#0f172a', fontSize: '0.85rem'}}>{job.customer}</h5>
                      <p style={{fontSize: '0.75rem', color: '#64748b', margin: '0.1rem 0'}}><i className="fa-solid fa-box"></i> {job.product} • {job.quantity?.toLocaleString()} ใบ</p>
                      {job.tracking_number && (
                        <div style={{background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '0.3rem'}}>
                          <i className="fa-solid fa-truck-fast"></i> {job.tracking_number}
                        </div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setAssignModal({ open: true, jobId: job.id, empId: '' }); }}
                        style={{ width: '100%', marginTop: '0.4rem', padding: '0.25rem', border: '1px dashed #cbd5e1', borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', color: '#64748b' }}>
                        <i className="fa-solid fa-user-plus"></i> มอบหมายงาน
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== TAB: PRODUCTION LOG ========== */}
      {activeTab === 'log' && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {/* Log Entry Form */}
          <div className="table-container p-4 shadow mb-4" style={{ borderTop: '4px solid #eab308' }}>
            <h4 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-clipboard-list"></i> บันทึกงานรายกะ / รายออร์เดอร์</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>เครื่องพิมพ์</label>
                <select className="form-control" value={logForm.machine} onChange={e => setLogForm({...logForm, machine: e.target.value})}>
                  {MACHINES.map(m => <option key={m.id} value={m.id}>{m.id} ({m.maxPlates} กรอบ/วัน)</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>แผนก</label>
                <select className="form-control" value={logForm.department} onChange={e => setLogForm({...logForm, department: e.target.value})}>
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>ผู้ปฏิบัติงาน</label>
                <input className="form-control" value={logForm.operator_name} onChange={e => setLogForm({...logForm, operator_name: e.target.value})} placeholder="ชื่อช่าง" />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>อ้างอิง Job#</label>
                <input className="form-control" value={logForm.job_ref} onChange={e => setLogForm({...logForm, job_ref: e.target.value})} placeholder="เลข job order" />
              </div>
            </div>

            <hr style={{ margin: '1rem 0', borderColor: '#e2e8f0' }} />
            <h5 style={{ color: '#334155', marginBottom: '0.5rem' }}>⏱️ เวลา</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>เวลาที่วางแผน (นาที)</label>
                <input type="number" className="form-control" value={logForm.planned_duration_min} onChange={e => setLogForm({...logForm, planned_duration_min: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>เวลาเดินจริง (นาที)</label>
                <input type="number" className="form-control" value={logForm.actual_run_min} onChange={e => setLogForm({...logForm, actual_run_min: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>เวลาหยุดเครื่อง (นาที)</label>
                <input type="number" className="form-control" value={logForm.downtime_min} onChange={e => setLogForm({...logForm, downtime_min: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>สาเหตุ Downtime</label>
                <select className="form-control" value={logForm.downtime_reason} onChange={e => setLogForm({...logForm, downtime_reason: e.target.value})}>
                  <option value="">-- เลือก --</option>
                  {DOWNTIME_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <hr style={{ margin: '1rem 0', borderColor: '#e2e8f0' }} />
            <h5 style={{ color: '#334155', marginBottom: '0.5rem' }}>📦 จำนวนผลิต</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>เป้าหมาย (ใบ)</label>
                <input type="number" className="form-control" value={logForm.planned_qty} onChange={e => setLogForm({...logForm, planned_qty: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>ผลิตได้จริง (ใบ)</label>
                <input type="number" className="form-control" value={logForm.actual_qty} onChange={e => setLogForm({...logForm, actual_qty: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>ของดี (ใบ)</label>
                <input type="number" className="form-control" value={logForm.good_qty}
                  onChange={e => setLogForm({...logForm, good_qty: Number(e.target.value)})}
                  style={{ borderColor: logForm.good_qty < logForm.actual_qty * 0.95 ? '#ef4444' : '' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>ของเสีย (คำนวณอัตโนมัติ)</label>
                <div style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '6px', fontWeight: 700, color: '#ef4444', fontSize: '1rem', textAlign: 'center' }}>
                  {(logForm.actual_qty - logForm.good_qty).toLocaleString()} ใบ ({logForm.actual_qty > 0 ? (((logForm.actual_qty - logForm.good_qty) / logForm.actual_qty) * 100).toFixed(1) : 0}%)
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>สาเหตุของเสีย</label>
                <select className="form-control" value={logForm.defect_reason} onChange={e => setLogForm({...logForm, defect_reason: e.target.value})}>
                  <option value="">-- เลือก --</option>
                  {DEFECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>หมายเหตุ</label>
                <input className="form-control" value={logForm.notes} onChange={e => setLogForm({...logForm, notes: e.target.value})} placeholder="รายละเอียดเพิ่มเติม..." />
              </div>
            </div>

            <button className="btn btn-primary mt-4" onClick={submitLog} style={{ padding: '0.6rem 2rem' }}>
              <i className="fa-solid fa-save"></i> บันทึกงาน
            </button>
          </div>

          {/* Recent Logs Table */}
          <div className="table-container p-4 shadow">
            <h4 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-list"></i> รายการบันทึกล่าสุด</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>วันที่</th>
                  <th style={{ padding: '0.6rem' }}>เครื่อง</th>
                  <th style={{ padding: '0.6rem' }}>ช่าง</th>
                  <th style={{ padding: '0.6rem' }}>เป้า</th>
                  <th style={{ padding: '0.6rem' }}>ได้จริง</th>
                  <th style={{ padding: '0.6rem', color: '#22c55e' }}>ของดี</th>
                  <th style={{ padding: '0.6rem', color: '#ef4444' }}>ของเสีย</th>
                  <th style={{ padding: '0.6rem' }}>Downtime</th>
                </tr>
              </thead>
              <tbody>
                {prodLogs.length === 0 && <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีข้อมูล — เริ่มบันทึกงานกะแรกเลย!</td></tr>}
                {prodLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(log.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}><span style={{ background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{log.machine}</span></td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{log.operator_name || '-'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{(log.planned_qty || 0).toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{(log.actual_qty || 0).toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>{(log.good_qty || 0).toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{((log.actual_qty || 0) - (log.good_qty || 0)).toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{log.downtime_min || 0} นาที</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== TAB: OEE DASHBOARD ========== */}
      {activeTab === 'oee' && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {!oeeSummary ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>กำลังโหลด OEE...</div>
          ) : (
            <>
              {/* Machine OEE Cards */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                {oeeSummary.machineStats.map(m => (
                  <div key={m.machine} className="table-container p-4 shadow" style={{ flex: 1, borderTop: `4px solid ${m.machine === 'SM74F' ? '#3b82f6' : '#8b5cf6'}` }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '1rem' }}><i className="fa-solid fa-print"></i> {m.machine}</h4>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                      <OEEGauge value={m.oee} label="OEE" />
                      <OEEGauge value={m.availability} label="Avail." color="#3b82f6" />
                      <OEEGauge value={m.performance} label="Perf." color="#f59e0b" />
                      <OEEGauge value={m.quality} label="Quality" color="#22c55e" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>✅ ของดี: <strong style={{color:'#22c55e'}}>{m.totalGood.toLocaleString()}</strong></span>
                      <span>❌ ของเสีย: <strong style={{color:'#ef4444'}}>{m.totalDefect.toLocaleString()}</strong></span>
                      <span>⏱️ Downtime: <strong>{m.totalDown} นาที</strong></span>
                    </div>
                    {m.entries === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.8rem' }}>ไม่มีข้อมูล — กรอกในแท็บ "บันทึกงาน"</div>}
                  </div>
                ))}
              </div>

              {/* Defect Pareto */}
              <div className="table-container p-4 shadow">
                <h4 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-triangle-exclamation" style={{color:'#ef4444'}}></i> Pareto: สาเหตุของเสียสูงสุด (30 วัน)</h4>
                {Object.keys(oeeSummary.defectReasons).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>ยังไม่มีข้อมูลของเสีย</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(oeeSummary.defectReasons)
                      .sort((a, b) => b[1] - a[1])
                      .map(([reason, count], idx) => {
                        const maxVal = Math.max(...Object.values(oeeSummary.defectReasons));
                        const pct = (count / maxVal) * 100;
                        return (
                          <div key={reason} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ width: '20px', textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>{idx + 1}</span>
                            <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 600 }}>{reason}</span>
                            <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: idx === 0 ? '#ef4444' : idx === 1 ? '#f97316' : '#fbbf24', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', width: '60px' }}>{count.toLocaleString()} ใบ</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== TAB: DEPARTMENT DASHBOARDS ========== */}
      {activeTab === 'dept' && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {/* Department Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {DEPARTMENTS.map(d => (
              <button key={d.id}
                className={`btn ${selectedDept === d.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedDept(d.id)}
                style={{ fontSize: '0.85rem' }}
              >
                <i className={d.icon} style={{ marginRight: '0.3rem' }}></i>
                {d.label.split('(')[0].trim()}
              </button>
            ))}
          </div>

          {/* Department KPIs */}
          {(() => {
            const dept = DEPARTMENTS.find(d => d.id === selectedDept);
            const deptLogs = prodLogs.filter(l => l.department === selectedDept);
            const totalActual = deptLogs.reduce((s, l) => s + (l.actual_qty || 0), 0);
            const totalGood = deptLogs.reduce((s, l) => s + (l.good_qty || 0), 0);
            const totalDefect = totalActual - totalGood;
            const totalDown = deptLogs.reduce((s, l) => s + (l.downtime_min || 0), 0);
            const avgQuality = totalActual > 0 ? ((totalGood / totalActual) * 100).toFixed(1) : 0;
            const stageJobs = jobOrders.filter(j => j.production_stage === selectedDept);

            return (
              <>
                <div className="table-container p-4 shadow mb-4" style={{ borderTop: `4px solid ${dept?.color}` }}>
                  <h4><i className={dept?.icon} style={{ color: dept?.color }}></i> Dashboard: {dept?.label}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ background: '#e0f2fe', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7' }}>{stageJobs.length}</div>
                      <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>งานในคิว</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>{totalGood.toLocaleString()}</div>
                      <div style={{ fontSize: '0.75rem', color: '#166534' }}>ของดี (ใบ)</div>
                    </div>
                    <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>{totalDefect.toLocaleString()}</div>
                      <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>ของเสีย</div>
                    </div>
                    <div style={{ background: '#fefce8', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ca8a04' }}>{avgQuality}%</div>
                      <div style={{ fontSize: '0.75rem', color: '#854d0e' }}>Quality %</div>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#334155' }}>{totalDown}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Downtime (นาที)</div>
                    </div>
                  </div>
                </div>

                {/* Department Log History */}
                <div className="table-container p-4 shadow">
                  <h4 style={{ marginBottom: '1rem' }}>📋 รายการงานล่าสุด — {dept?.label}</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>วันที่</th>
                        <th style={{ padding: '0.5rem' }}>เครื่อง</th>
                        <th style={{ padding: '0.5rem' }}>ช่าง</th>
                        <th style={{ padding: '0.5rem' }}>Job#</th>
                        <th style={{ padding: '0.5rem', color: '#22c55e' }}>ของดี</th>
                        <th style={{ padding: '0.5rem', color: '#ef4444' }}>ของเสีย</th>
                        <th style={{ padding: '0.5rem' }}>สาเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptLogs.length === 0 && <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีข้อมูลแผนกนี้</td></tr>}
                      {deptLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem' }}>{new Date(log.created_at).toLocaleDateString('th-TH', {day:'numeric',month:'short'})}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>{log.machine}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>{log.operator_name || '-'}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>{log.job_ref || '-'}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>{(log.good_qty||0).toLocaleString()}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{((log.actual_qty||0)-(log.good_qty||0)).toLocaleString()}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>{log.defect_reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Modals */}
      {trackingModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{background: 'white', padding: '2rem', borderRadius: '12px', width: '400px'}}>
            <h4 className="mb-4">กรอก Tracking จัดส่ง 🚚</h4>
            <input type="text" className="form-control" value={trackingModal.trackingNum} onChange={e => setTrackingModal({...trackingModal, trackingNum: e.target.value})} placeholder="เช่น NIM-12345" />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-outline" onClick={() => setTrackingModal({open: false, jobId: null, trackingNum: ''})}>ยกเลิก</button>
              <button className="btn btn-success" onClick={submitShipping}>บันทึกจัดส่ง</button>
            </div>
          </div>
        </div>
      )}

      {assignModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{background: 'white', padding: '2rem', borderRadius: '12px', width: '420px'}}>
            <h4 className="mb-4"><i className="fa-solid fa-user-gear"></i> มอบหมายงาน JOB #{assignModal.jobId}</h4>
            <select className="form-control mt-4" value={assignModal.empId} onChange={e => setAssignModal({...assignModal, empId: e.target.value})}>
              <option value="">-- เลือกพนักงาน --</option>
              {employees.filter(e => ['pre_press','print_a1','print_a2','post_press','shipping'].includes(e.department)).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
            </select>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-outline" onClick={() => setAssignModal({open: false, jobId: null, empId: ''})}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={assignWorker}>มอบหมายงาน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
