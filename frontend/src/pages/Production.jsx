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

// Machine capacity config
const MACHINES = [
  { id: 'a1', name: 'เครื่อง A1 (ออฟเซ็ท)', maxPerDay: 8, icon: 'fa-solid fa-print', color: '#3b82f6' },
  { id: 'a2', name: 'เครื่อง A2 (ออฟเซ็ท)', maxPerDay: 6, icon: 'fa-solid fa-print', color: '#8b5cf6' },
  { id: 'diecut', name: 'เครื่องไดคัท', maxPerDay: 10, icon: 'fa-solid fa-scissors', color: '#f59e0b' },
  { id: 'laminate', name: 'เครื่องเคลือบ PVC', maxPerDay: 12, icon: 'fa-solid fa-layer-group', color: '#10b981' },
];

// Workflow steps
const WORKFLOW_STEPS = [
  { label: 'ลูกค้าทักแชท', icon: 'fa-brands fa-line', color: '#06C755' },
  { label: 'เซลส์เสนอราคา', icon: 'fa-solid fa-file-invoice-dollar', color: '#3b82f6' },
  { label: 'โอนมัดจำ', icon: 'fa-solid fa-money-bill-transfer', color: '#f59e0b' },
  { label: 'บัญชีอนุมัติ', icon: 'fa-solid fa-stamp', color: '#ef4444' },
  { label: 'วางแผนผลิต', icon: 'fa-solid fa-clipboard-list', color: '#8b5cf6' },
  { label: 'ตรวจไฟล์', icon: 'fa-solid fa-pen-ruler', color: '#818cf8' },
  { label: 'พิมพ์ออฟเซ็ท', icon: 'fa-solid fa-print', color: '#eab308' },
  { label: 'หลังพิมพ์', icon: 'fa-solid fa-scissors', color: '#f97316' },
  { label: 'QC + แพ็ค', icon: 'fa-solid fa-box-open', color: '#10b981' },
  { label: 'จัดส่ง', icon: 'fa-solid fa-truck-fast', color: '#22c55e' },
];

export default function Production() {
  const [jobOrders, setJobOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [trackingModal, setTrackingModal] = useState({ open: false, jobId: null, trackingNum: '' });
  const [assignModal, setAssignModal] = useState({ open: false, jobId: null, empId: '' });
  const [showWorkflow, setShowWorkflow] = useState(false);

  useEffect(() => {
    fetchJobOrders();
    fetchEmployees();
    const interval = setInterval(fetchJobOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobOrders = () => {
    axios.get(`${API_URL}/job_orders`)
         .then(res => setJobOrders(res.data))
         .catch(err => console.error(err));
  };

  const fetchEmployees = () => {
    axios.get(`${API_URL}/hr/employees`)
         .then(res => setEmployees(res.data || []))
         .catch(() => {});
  };

  const assignWorker = async () => {
    if (!assignModal.empId) return alert('เลือกพนักงาน');
    try {
      await axios.post(`${API_URL}/hr/assign`, {
        job_order_id: parseInt(assignModal.jobId),
        employee_id: parseInt(assignModal.empId)
      });
      setAssignModal({ open: false, jobId: null, empId: '' });
      fetchJobOrders();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, jobId) => {
    e.dataTransfer.setData('jobId', jobId);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1)';
  };

  const handleDragLeave = (e) => {
    e.currentTarget.style.boxShadow = 'none';
  };

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    e.currentTarget.style.boxShadow = 'none';
    const jobId = e.dataTransfer.getData('jobId');
    if(!jobId) return;

    const job = jobOrders.find(j => j.id.toString() === jobId);
    if(job && job.production_stage === targetStageId) return;

    if(targetStageId === 'shipping') {
        setTrackingModal({ open: true, jobId, trackingNum: '' });
    } else {
        try {
            await axios.put(`${API_URL}/job_orders/${jobId}/move`, { production_stage: targetStageId });
            fetchJobOrders();
        } catch(err) {
            alert('Failed to drop');
        }
    }
  };

  const submitShipping = async () => {
    if(!trackingModal.trackingNum) return alert('กรุณากรอกเลข Tracking');
    try {
        await axios.put(`${API_URL}/job_orders/${trackingModal.jobId}/tracking`, { tracking_number: trackingModal.trackingNum });
        await axios.put(`${API_URL}/job_orders/${trackingModal.jobId}/move`, { production_stage: 'shipping' });
        setTrackingModal({ open: false, jobId: null, trackingNum: '' });
        fetchJobOrders();
    } catch(e) {
        alert('Error saving tracking');
    }
  };

  // Capacity calculations
  const activeJobs = jobOrders.filter(j => j.production_stage !== 'shipping' && j.production_stage !== 'awaiting_payment');
  const printingJobs = jobOrders.filter(j => j.production_stage === 'printing' || j.production_stage === 'pre_press');
  const postPressJobs = jobOrders.filter(j => j.production_stage === 'post_press');
  const totalActiveJobs = activeJobs.length;

  const capacityData = MACHINES.map(m => {
    let load = 0;
    if (m.id === 'a1') load = Math.min(Math.ceil(printingJobs.length * 0.6), m.maxPerDay);
    else if (m.id === 'a2') load = Math.min(Math.ceil(printingJobs.length * 0.4), m.maxPerDay);
    else if (m.id === 'diecut') load = Math.min(postPressJobs.length, m.maxPerDay);
    else if (m.id === 'laminate') load = Math.min(Math.ceil(activeJobs.length * 0.3), m.maxPerDay);
    const pct = Math.round((load / m.maxPerDay) * 100);
    return { ...m, load, pct };
  });

  return (
    <div className="view-section active" style={{ padding: '0' }}>
      
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-primary">บอร์ดคุมคิวผลิต (Production Board)</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>ลากการ์ดข้ามแผนก | งานที่ใช้งานอยู่: <strong style={{ color: totalActiveJobs > 20 ? '#ef4444' : '#10b981' }}>{totalActiveJobs}</strong> ใบงาน</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${showWorkflow ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowWorkflow(!showWorkflow)} style={{ fontSize: '0.85rem' }}>
            <i className="fa-solid fa-diagram-project"></i> Workflow
          </button>
          <button className="btn btn-outline" onClick={fetchJobOrders} style={{ fontSize: '0.85rem' }}>
            <i className="fa-solid fa-rotate"></i> โหลดใหม่
          </button>
        </div>
      </div>

      {/* Workflow Diagram (Toggle) */}
      {showWorkflow && (
        <div style={{ padding: '0 1.5rem 1rem', animation: 'fadeIn 0.3s' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: '12px', padding: '1.5rem', color: 'white' }}>
            <h4 style={{ color: 'white', marginBottom: '1rem' }}><i className="fa-solid fa-diagram-project"></i> 360° Workflow: จากแชทลูกค้าจนถึงจัดส่ง</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {WORKFLOW_STEPS.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%', background: step.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', color: 'white', boxShadow: `0 0 12px ${step.color}50`
                    }}>
                      <i className={step.icon}></i>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#cbd5e1', textAlign: 'center', maxWidth: '70px' }}>{step.label}</span>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 2px', marginBottom: '1.2rem' }}>
                      <div style={{ width: '100%', height: '2px', background: `linear-gradient(90deg, ${step.color}, ${WORKFLOW_STEPS[idx+1].color})` }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Capacity Dashboard */}
      <div style={{ padding: '0 1.5rem 0.8rem', display: 'flex', gap: '0.8rem', overflowX: 'auto' }}>
        {capacityData.map(machine => (
          <div key={machine.id} style={{
            flex: 1, minWidth: '180px', background: 'white', borderRadius: '10px', padding: '0.8rem',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                <i className={machine.icon} style={{ color: machine.color, marginRight: '0.3rem' }}></i>
                {machine.name}
              </span>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: machine.pct >= 80 ? '#ef4444' : machine.pct >= 50 ? '#f59e0b' : '#10b981'
              }}>
                {machine.pct}%
              </span>
            </div>
            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${machine.pct}%`, height: '100%', borderRadius: '4px', transition: 'width 0.5s',
                background: machine.pct >= 80 ? '#ef4444' : machine.pct >= 50 ? '#f59e0b' : machine.color
              }}></div>
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.65rem', color: '#94a3b8' }}>
              {machine.load}/{machine.maxPerDay} งาน/วัน
              {machine.pct >= 80 && <span style={{ color: '#ef4444', fontWeight: 700 }}> ⚠️ ใกล้เต็ม!</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '0.8rem', padding: '0 1rem 1rem', flex: 1, overflowX: 'auto', height: 'calc(100vh - var(--topbar-height) - 280px)' }}>
          {STAGES.map(stage => {
              const columnJobs = jobOrders.filter(j => j.production_stage === stage.id);
              
              return (
                  <div key={stage.id} 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, stage.id)}
                      style={{ 
                          minWidth: '250px', flex: 1, background: stage.color, 
                          borderRadius: '8px', display: 'flex', flexDirection: 'column', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          transition: 'box-shadow 0.2s ease'
                      }}>
                     {/* Column Header */}
                     <div style={{ background: stage.header, color: 'white', padding: '0.6rem 0.8rem', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                         <span>{stage.label}</span>
                         <span style={{background: 'rgba(255,255,255,0.3)', padding: '0 0.5rem', borderRadius: '12px', fontSize: '0.8rem'}}>{columnJobs.length}</span>
                     </div>
                     
                     {/* Column Body (Cards) */}
                     <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', flex: 1 }}>
                         {columnJobs.length === 0 && <div style={{opacity: 0.5, textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem'}}>ลากมาวางที่นี่...</div>}
                         {columnJobs.map(job => (
                             <div key={job.id} 
                                 draggable="true"
                                 onDragStart={(e) => handleDragStart(e, job.id)}
                                 onDragEnd={handleDragEnd}
                                 style={{
                                     background: 'white', padding: '0.8rem', borderRadius: '6px', cursor: 'grab',
                                     boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                                 }}>
                                 <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                     <strong style={{color: '#334155', fontSize: '0.85rem'}}>#JOB-{job.id}</strong>
                                     <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(job.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <h5 style={{margin: '0.3rem 0 0.1rem 0', color: '#0f172a', fontSize: '0.85rem'}}>{job.customer}</h5>
                                 <p style={{fontSize: '0.75rem', color: '#64748b', margin: 0}}><i className="fa-solid fa-box"></i> {job.product}</p>
                                 <p style={{fontSize: '0.75rem', color: '#64748b', margin: '0.1rem 0 0.5rem 0'}}><i className="fa-solid fa-layer-group"></i> {job.quantity.toLocaleString()} ใบ</p>
                                 
                                 {job.tracking_number && (
                                     <div style={{background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold'}}>
                                         <i className="fa-solid fa-truck-fast"></i> {job.tracking_number}
                                     </div>
                                 )}

                                 {/* Assign Worker Button */}
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setAssignModal({ open: true, jobId: job.id, empId: '' }); }}
                                   style={{ width: '100%', marginTop: '0.4rem', padding: '0.25rem', border: '1px dashed #cbd5e1', borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', color: '#64748b' }}
                                 >
                                   <i className="fa-solid fa-user-plus"></i> มอบหมายงาน
                                 </button>
                             </div>
                         ))}
                     </div>
                  </div>
              )
          })}
      </div>

      {trackingModal.open && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
              <div style={{background: 'white', padding: '2rem', borderRadius: '12px', width: '400px'}}>
                  <h4 className="mb-4">กรอก Tracking จัดส่ง 🚚</h4>
                  <p style={{fontSize: '0.9rem', color: '#64748b'}}>กำลังย้ายใบออเดอร์ไปที่ช่อง "คลังและจัดส่ง"</p>
                  <label className="mt-4" style={{display: 'block', fontWeight: 'bold', marginBottom: '0.5rem'}}>เลขขนส่ง Nim Express:</label>
                  <input 
                      type="text" 
                      className="form-control" 
                      value={trackingModal.trackingNum}
                      onChange={e => setTrackingModal({...trackingModal, trackingNum: e.target.value})}
                      placeholder="เช่น NIM-12345 หรือ EMS-XX"
                  />
                  <div className="flex gap-2 mt-4 justify-end">
                      <button className="btn btn-outline" onClick={() => setTrackingModal({open: false, jobId: null, trackingNum: ''})}>ยกเลิก</button>
                      <button className="btn btn-success" onClick={submitShipping}>บันทึกจัดส่ง</button>
                  </div>
              </div>
          </div>
      )}

      {/* Assign Worker Modal */}
      {assignModal.open && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
              <div style={{background: 'white', padding: '2rem', borderRadius: '12px', width: '420px'}}>
                  <h4 className="mb-4"><i className="fa-solid fa-user-gear"></i> มอบหมายงาน JOB #{assignModal.jobId}</h4>
                  <p style={{fontSize: '0.85rem', color: '#64748b'}}>เลือกพนักงานที่รับผิดชอบใบงานนี้ (ระบบจะจับเวลาอัตโนมัติ)</p>
                  <select className="form-control mt-4" value={assignModal.empId} onChange={e => setAssignModal({...assignModal, empId: e.target.value})} style={{ fontSize: '0.95rem' }}>
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
