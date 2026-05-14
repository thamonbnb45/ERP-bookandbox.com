import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const STAGES = [
  { id: 'queued', label: '📅 รอผลิต (Queued)', color: '#f1f5f9', header: '#94a3b8' },
  { id: 'printing', label: '🖨️ กำลังพิมพ์ / ผลิต', color: '#fef08a', header: '#eab308' },
  { id: 'completed', label: '✅ เสร็จแล้ว / พร้อมส่ง', color: '#bbf7d0', header: '#22c55e' },
  { id: 'cancelled', label: '❌ ยกเลิก / มีปัญหา', color: '#fecaca', header: '#ef4444' }
];

// Real Bookandbox Machines Mapping
const MACHINES = [
  { id: 'SM74F', name: 'SM74F (Heidelberg 2003)', maxPlates: 12, icon: 'fa-solid fa-print', color: '#3b82f6', keywords: ['SM74', 'SM74F'] },
  { id: 'SM102F', name: 'SM102F (Heidelberg 1999)', maxPlates: 10, icon: 'fa-solid fa-print', color: '#8b5cf6', keywords: ['SM102', '102F'] },
  { id: 'KM C12000', name: 'Konica 12000 (Digital)', maxPlates: 30, icon: 'fa-solid fa-print', color: '#06b6d4', keywords: ['12000', 'C12000'] },
  { id: 'KM C4070', name: 'Konica 4070 (Digital)', maxPlates: 20, icon: 'fa-solid fa-print', color: '#0ea5e9', keywords: ['4070', 'C4070'] },
  { id: 'Cutter', name: 'เครื่องตัด (Polar)', maxPlates: 50, icon: 'fa-solid fa-ruler-combined', color: '#eab308', keywords: ['ตัด'] },
  { id: 'Diecut', name: 'เครื่องปั๊มไดคัท/ฟอยล์', maxPlates: 15, icon: 'fa-solid fa-stamp', color: '#f97316', keywords: ['ไดคัท', 'ปั๊ม'] },
  { id: 'Folder', name: 'เครื่องพับ', maxPlates: 20, icon: 'fa-solid fa-scroll', color: '#ef4444', keywords: ['พับ'] },
  { id: 'Stitcher', name: 'เครื่องเก็บเย็บ', maxPlates: 15, icon: 'fa-solid fa-book', color: '#ec4899', keywords: ['เย็บ', 'เก็บ'] },
];

const getMachineConfig = (machineName) => {
  if (!machineName) return { id: 'อื่นๆ', icon: 'fa-solid fa-cogs', color: '#94a3b8' };
  const found = MACHINES.find(m => m.keywords.some(k => machineName.toUpperCase().includes(k.toUpperCase())));
  return found || { id: machineName, icon: 'fa-solid fa-cogs', color: '#64748b' };
};

const SUB_TABS = [
  { id: 'board', label: 'บอร์ดคิวงาน (Kanban)', icon: 'fa-solid fa-columns' },
  { id: 'dashboard', label: 'ภาพรวมผลิต (Dashboard)', icon: 'fa-solid fa-chart-pie' },
  { id: 'log', label: 'บันทึกรายวัน (Logs)', icon: 'fa-solid fa-clipboard-list' },
];

export default function Production() {
  const [activeTab, setActiveTab] = useState('board');
  const [jobOrders, setJobOrders] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch Dashboard
      const dashRes = await axios.get(`${API_URL}/production/dashboard`);
      setDashboardData(dashRes.data);

      // Fetch Jobs (limit 300 for board performance)
      const jobsRes = await axios.get(`${API_URL}/production/jobs?limit=300&status=all`);
      setJobOrders(jobsRes.data.jobs);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch production data', err);
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length > 2 || e.target.value === '') {
      const jobsRes = await axios.get(`${API_URL}/production/jobs?limit=300&status=all&search=${e.target.value}`);
      setJobOrders(jobsRes.data.jobs);
    }
  };

  // Drag & Drop
  const handleDragStart = (e, jogNo) => { 
    e.dataTransfer.setData('jogNo', jogNo); 
    e.currentTarget.style.opacity = '0.5'; 
  };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; };
  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1)'; };
  const handleDragLeave = (e) => { e.currentTarget.style.boxShadow = 'none'; };
  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    e.currentTarget.style.boxShadow = 'none';
    const jogNo = e.dataTransfer.getData('jogNo');
    if (!jogNo) return;
    
    // Optimistic UI update
    setJobOrders(prev => prev.map(j => j.jog_no === jogNo ? { ...j, status: targetStageId } : j));
    
    try { 
      await axios.put(`${API_URL}/production/jobs/${jogNo}/status`, { status: targetStageId }); 
      fetchData(); // sync real dashboard
    } catch (err) { 
      alert('Failed to update status'); 
      fetchData(); // revert
    }
  };

  if (loading) return <div style={{padding:'2rem', textAlign:'center'}}>กำลังโหลดข้อมูลผลิตจริง...</div>;

  return (
    <div className="view-section active" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-primary" style={{ margin: 0 }}>🏭 Smart Production Board</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            อ้างอิงข้อมูลจริง: <strong style={{color:'#10b981'}}>{dashboardData?.total_jobs?.toLocaleString() || 0}</strong> งานทั้งหมด | 
            ค้างผลิต: <strong>{dashboardData?.by_status?.find(s=>s.status==='queued')?.count || 0}</strong> งาน
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

      {/* Machine Workload Bar (Summary) */}
      <div style={{ padding: '0.8rem 1.5rem', display: 'flex', gap: '0.8rem', overflowX: 'auto', flexShrink: 0 }}>
        {dashboardData?.by_machine?.map(m => {
          const config = getMachineConfig(m.machine);
          if (m.queued === 0 && m.printing === 0 && m.machine === 'ไม่ระบุ') return null; // hide empty
          return (
            <div key={m.machine} style={{
              flex: '0 0 auto', width: '220px', background: 'white', borderRadius: '10px', padding: '0.8rem',
              border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${config.color}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <i className={config.icon} style={{ color: config.color, marginRight: '0.3rem' }}></i>
                  {m.machine}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                  {m.count} งาน
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
                <span style={{color: '#f59e0b'}}><i className="fa-solid fa-hourglass-half"></i> รอ: {m.queued}</span>
                <span style={{color: '#3b82f6'}}><i className="fa-solid fa-print"></i> ทำ: {m.printing}</span>
                <span style={{color: '#10b981'}}><i className="fa-solid fa-check"></i> เสร็จ: {m.completed}</span>
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: '#94a3b8' }}>
                แผ่นพิมพ์รวม: {(parseInt(m.total_sheets)||0).toLocaleString()} แผ่น
              </div>
            </div>
          );
        })}
      </div>

      {/* ========== TAB: KANBAN BOARD ========== */}
      {activeTab === 'board' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Search Bar */}
          <div style={{ padding: '0 1.5rem 0.5rem' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <i className="fa-solid fa-search" style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}></i>
              <input type="text" className="form-control" placeholder="ค้นหา JOG No. หรือ ชื่องาน..." 
                value={searchQuery} onChange={handleSearch}
                style={{ paddingLeft: '2rem', borderRadius: '20px', fontSize: '0.85rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', padding: '0 1.5rem 1.5rem', flex: 1, overflowX: 'auto' }}>
            {STAGES.map(stage => {
              const columnJobs = jobOrders.filter(j => j.status === stage.id);
              return (
                <div key={stage.id}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  style={{ minWidth: '300px', flex: 1, background: stage.color, borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  
                  <div style={{ background: stage.header, color: 'white', padding: '0.8rem 1rem', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>{stage.label}</span>
                    <span style={{background: 'rgba(255,255,255,0.3)', padding: '0 0.6rem', borderRadius: '12px', fontSize: '0.85rem'}}>{columnJobs.length}</span>
                  </div>
                  
                  <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
                    {columnJobs.length === 0 && <div style={{opacity: 0.5, textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem'}}>ไม่มีงานในสถานะนี้...</div>}
                    
                    {columnJobs.map(job => {
                      const mcConfig = getMachineConfig(job.machine);
                      const isUrgent = job.status === 'queued' && new Date(job.due_date) < new Date(Date.now() + 3*24*60*60*1000); // due in 3 days
                      
                      return (
                        <div key={job.jog_no} draggable="true" onDragStart={(e) => handleDragStart(e, job.jog_no)} onDragEnd={handleDragEnd}
                          style={{ background: 'white', padding: '0.8rem', borderRadius: '8px', cursor: 'grab', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', borderLeft: isUrgent ? '4px solid #ef4444' : 'none' }}>
                          
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem'}}>
                            <strong style={{color: '#0f172a', fontSize: '0.9rem'}}>#{job.jog_no}</strong>
                            {job.due_date && (
                              <span style={{ fontSize: '0.7rem', color: isUrgent ? '#ef4444' : '#64748b', fontWeight: isUrgent ? 'bold' : 'normal', background: isUrgent ? '#fee2e2' : 'transparent', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                                <i className="fa-regular fa-calendar"></i> Due: {new Date(job.due_date).toLocaleDateString('th-TH')}
                              </span>
                            )}
                          </div>
                          
                          <h5 style={{margin: '0 0 0.5rem 0', color: '#334155', fontSize: '0.85rem', lineHeight: '1.4'}}>{job.job_name}</h5>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            {job.machine && <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: mcConfig.color, padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                              <i className={mcConfig.icon}></i> {job.machine}
                            </span>}
                            <span style={{ fontSize: '0.65rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              <i className="fa-solid fa-layer-group"></i> {(parseInt(job.sheets_actual)||0).toLocaleString()} แผ่น
                            </span>
                          </div>

                          {/* Post-press tags */}
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {job.coating && job.coating !== 'ไม่ทำ' && <span style={{ fontSize: '0.6rem', background: '#e0e7ff', color: '#4f46e5', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>เคลือบ</span>}
                            {job.die_cut && job.die_cut !== 'ไม่ทำ' && <span style={{ fontSize: '0.6rem', background: '#ffedd5', color: '#ea580c', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>ไดคัท</span>}
                            {job.fold && job.fold !== 'ไม่ทำ' && <span style={{ fontSize: '0.6rem', background: '#fce7f3', color: '#db2777', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>พับ</span>}
                            {job.glue && job.glue !== 'ไม่ทำ' && <span style={{ fontSize: '0.6rem', background: '#fef08a', color: '#a16207', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>ปะกาว</span>}
                          </div>

                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== TAB: DASHBOARD ========== */}
      {activeTab === 'dashboard' && dashboardData && (
        <div style={{ padding: '0 1.5rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <div className="table-container p-4 shadow mb-4" style={{ borderTop: '4px solid #8b5cf6' }}>
            <h4 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-chart-pie"></i> ภาพรวมงานหลังพิมพ์ (Post-Press Load)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#e0e7ff', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4f46e5' }}>{dashboardData.post_press.needs_coating}</div>
                <div style={{ fontSize: '0.85rem', color: '#4338ca', fontWeight: 'bold' }}>รอเคลือบ</div>
              </div>
              <div style={{ background: '#ffedd5', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ea580c' }}>{dashboardData.post_press.needs_diecut}</div>
                <div style={{ fontSize: '0.85rem', color: '#c2410c', fontWeight: 'bold' }}>รอไดคัท</div>
              </div>
              <div style={{ background: '#fce7f3', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#db2777' }}>{dashboardData.post_press.needs_fold}</div>
                <div style={{ fontSize: '0.85rem', color: '#be185d', fontWeight: 'bold' }}>รอพับ</div>
              </div>
              <div style={{ background: '#fef08a', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a16207' }}>{dashboardData.post_press.needs_glue}</div>
                <div style={{ fontSize: '0.85rem', color: '#854d0e', fontWeight: 'bold' }}>รอปะกาว</div>
              </div>
              <div style={{ background: '#f3e8ff', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9333ea' }}>{dashboardData.post_press.needs_hotstamp}</div>
                <div style={{ fontSize: '0.85rem', color: '#7e22ce', fontWeight: 'bold' }}>รอปั๊มเค/ฟอยล์</div>
              </div>
            </div>
          </div>

          <div className="table-container p-4 shadow">
            <h4 style={{ marginBottom: '1rem', color: '#ef4444' }}><i className="fa-solid fa-fire"></i> 10 อันดับงานด่วน (Urgent Jobs)</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.8rem' }}>Due Date</th>
                  <th style={{ padding: '0.8rem' }}>JOG No.</th>
                  <th style={{ padding: '0.8rem' }}>ชื่องาน</th>
                  <th style={{ padding: '0.8rem' }}>สถานะ</th>
                  <th style={{ padding: '0.8rem' }}>เครื่อง</th>
                  <th style={{ padding: '0.8rem' }}>ยอดพิมพ์</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.urgent_jobs.map(job => (
                  <tr key={job.jog_no} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem', color: '#ef4444', fontWeight: 'bold' }}>
                      {new Date(job.due_date).toLocaleDateString('th-TH')}
                    </td>
                    <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>{job.jog_no}</td>
                    <td style={{ padding: '0.6rem' }}>{job.job_name}</td>
                    <td style={{ padding: '0.6rem' }}>
                      <span style={{ 
                        background: job.status === 'queued' ? '#f1f5f9' : '#fef08a', 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' 
                      }}>
                        {STAGES.find(s=>s.id===job.status)?.label || job.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem' }}>{job.machine || '-'}</td>
                    <td style={{ padding: '0.6rem' }}>{(parseInt(job.sheets_actual)||0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== TAB: LOGS ========== */}
      {activeTab === 'log' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          <i className="fa-solid fa-person-digging" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#cbd5e1' }}></i>
          <h4>กำลังปรับปรุงระบบ Log เชื่อมต่อกับข้อมูลจริง</h4>
          <p>ฟีเจอร์นี้จะเชื่อมกับข้อมูล JOG No. จริงและ Operator เร็วๆ นี้</p>
        </div>
      )}

    </div>
  );
}
