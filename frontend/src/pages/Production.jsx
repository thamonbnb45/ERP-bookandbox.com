import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const STAGES = [
  { id: 'planning', label: '📅 รอวางแผน', color: '#f1f5f9', header: '#94a3b8' },
  { id: 'pre_press', label: '🖥️ เตรียมไฟล์/เพลท', color: '#e0e7ff', header: '#818cf8' },
  { id: 'printing', label: '🖨️ กำลังพิมพ์', color: '#fef08a', header: '#eab308' },
  { id: 'post_press', label: '✂️ หลังพิมพ์/พับ', color: '#fed7aa', header: '#f97316' },
  { id: 'shipping', label: '🚚 คลังและจัดส่ง', color: '#bbf7d0', header: '#22c55e' }
];

export default function Production() {
  const [jobOrders, setJobOrders] = useState([]);
  const [trackingModal, setTrackingModal] = useState({ open: false, jobId: null, trackingNum: '' });

  useEffect(() => {
    fetchJobOrders();
    const interval = setInterval(fetchJobOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobOrders = () => {
    axios.get(`${API_URL}/job_orders`)
         .then(res => setJobOrders(res.data))
         .catch(err => console.error(err));
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
    e.preventDefault(); // allow drop
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

    // Check if it's already in this stage
    const job = jobOrders.find(j => j.id.toString() === jobId);
    if(job && job.production_stage === targetStageId) return;

    if(targetStageId === 'shipping') {
        // Require tracking
        setTrackingModal({ open: true, jobId, trackingNum: '' });
    } else {
        // Direct move (backward or forward)
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

  return (
    <div className="view-section active" style={{ height: 'calc(100vh - var(--topbar-height) - 4rem)'}}>
      <div className="flex justify-between align-center mb-4">
        <div>
          <h3 className="text-primary">บอร์ดคุมคิวผลิต (Production Board)</h3>
          <p>ระบบ Kanban 🟢 **อัปเกรด: สามารถคลิกลากการ์ดข้ามแผนก โยนไปมาหน้าหลังได้อย่างอิสระ!**</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={fetchJobOrders}><i className="fa-solid fa-rotate"></i> โหลดข้อมูลใหม่</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', height: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
          {STAGES.map(stage => {
              const columnJobs = jobOrders.filter(j => j.production_stage === stage.id);
              
              return (
                  <div key={stage.id} 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, stage.id)}
                      style={{ 
                          minWidth: '280px', flex: 1, background: stage.color, 
                          borderRadius: '8px', display: 'flex', flexDirection: 'column', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                          transition: 'box-shadow 0.2s ease'
                      }}>
                     {/* Column Header */}
                     <div style={{ background: stage.header, color: 'white', padding: '0.8rem', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                         <span>{stage.label}</span>
                         <span style={{background: 'rgba(255,255,255,0.3)', padding: '0.1rem 0.6rem', borderRadius: '12px'}}>{columnJobs.length}</span>
                     </div>
                     
                     {/* Column Body (Cards) */}
                     <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
                         {columnJobs.length === 0 && <div style={{opacity: 0.5, textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', pointerEvents: 'none'}}>ลากใบงานมาวางที่นี่...</div>}
                         {columnJobs.map(job => (
                             <div key={job.id} 
                                 draggable="true"
                                 onDragStart={(e) => handleDragStart(e, job.id)}
                                 onDragEnd={handleDragEnd}
                                 style={{
                                     background: 'white', padding: '1rem', borderRadius: '6px', cursor: 'grab',
                                     boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', position: 'relative'
                                 }}>
                                 <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                     <strong style={{color: '#334155'}}>#JOB-{job.id}</strong>
                                     <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(job.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <h5 style={{margin: '0.5rem 0 0.2rem 0', color: '#0f172a'}}>{job.customer}</h5>
                                 <p style={{fontSize: '0.8rem', color: '#64748b', margin: 0}}><i className="fa-solid fa-box"></i> {job.product}</p>
                                 <p style={{fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0.8rem 0'}}><i className="fa-solid fa-layer-group"></i> จำนวน: {job.quantity.toLocaleString()} ใบ</p>
                                 
                                 {job.tracking_number && (
                                     <div style={{background: '#dcfce7', color: '#166534', padding: '0.3rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.4rem', fontWeight: 'bold'}}>
                                         <i className="fa-solid fa-truck-fast"></i> Tracking: {job.tracking_number}
                                     </div>
                                 )}

                                 <div style={{fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.5rem'}}>
                                     <i className="fa-solid fa-grip-lines"></i> แตะค้างเพื่อลากย้าย (Drag to move)
                                 </div>
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
    </div>
  );
}
