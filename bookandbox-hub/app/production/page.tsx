"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';

// Call the Express Backend
const API_URL = 'http://localhost:3001/api';

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
    // Add fontawesome if not exists
    if (!document.querySelector('#fa-link')) {
      const link = document.createElement('link');
      link.id = 'fa-link';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
    
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

  if (loading) return <div style={{padding:'2rem', textAlign:'center', marginTop: '100px', fontSize: '1.2rem', color: '#64748b'}}><i className="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูลผลิตจริง...</div>;

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>🏭 Smart Production Board</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            อ้างอิงข้อมูลจริง: <strong style={{color:'#10b981'}}>{dashboardData?.total_jobs?.toLocaleString() || 0}</strong> งานทั้งหมด | 
            ค้างผลิต: <strong>{dashboardData?.by_status?.find(s=>s.status==='queued')?.count || 0}</strong> งาน
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {SUB_TABS.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                cursor: 'pointer',
                fontWeight: 600,
                border: activeTab === tab.id ? 'none' : '1px solid #cbd5e1',
                background: activeTab === tab.id ? '#3b82f6' : 'white',
                color: activeTab === tab.id ? 'white' : '#475569',
                transition: 'all 0.2s'
              }}
            >
              <i className={tab.icon} style={{marginRight: '0.4rem'}}></i> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Machine Workload Bar (Summary) */}
      <div style={{ padding: '1rem 2rem', display: 'flex', gap: '1rem', overflowX: 'auto', flexShrink: 0 }}>
        {dashboardData?.by_machine?.map(m => {
          const config = getMachineConfig(m.machine);
          if (m.queued === 0 && m.printing === 0 && m.machine === 'ไม่ระบุ') return null; // hide empty
          return (
            <div key={m.machine} style={{
              flex: '0 0 auto', width: '240px', background: 'white', borderRadius: '12px', padding: '1rem',
              border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: `4px solid ${config.color}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <i className={config.icon} style={{ color: config.color, marginRight: '0.4rem' }}></i>
                  {m.machine}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  {m.count} งาน
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 600 }}>
                <span style={{color: '#f59e0b'}}><i className="fa-solid fa-hourglass-half"></i> รอ: {m.queued}</span>
                <span style={{color: '#3b82f6'}}><i className="fa-solid fa-print"></i> ทำ: {m.printing}</span>
                <span style={{color: '#10b981'}}><i className="fa-solid fa-check"></i> เสร็จ: {m.completed}</span>
              </div>
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: '#94a3b8' }}>
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
          <div style={{ padding: '0 2rem 1rem' }}>
            <div style={{ position: 'relative', width: '350px' }}>
              <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}></i>
              <input type="text" placeholder="ค้นหา JOG No. หรือ ชื่องาน..." 
                value={searchQuery} onChange={handleSearch}
                style={{ 
                  width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', 
                  borderRadius: '24px', fontSize: '0.9rem',
                  border: '1px solid #cbd5e1', outline: 'none'
                }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.2rem', padding: '0 2rem 2rem', flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
            {STAGES.map(stage => {
              const columnJobs = jobOrders.filter(j => j.status === stage.id);
              return (
                <div key={stage.id}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  style={{ minWidth: '320px', flex: 1, background: stage.color, borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                  
                  <div style={{ background: stage.header, color: 'white', padding: '1rem', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                    <span>{stage.label}</span>
                    <span style={{background: 'rgba(255,255,255,0.3)', padding: '0 0.8rem', borderRadius: '16px', fontSize: '0.9rem'}}>{columnJobs.length}</span>
                  </div>
                  
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
                    {columnJobs.length === 0 && <div style={{opacity: 0.5, textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem'}}>ไม่มีงานในสถานะนี้...</div>}
                    
                    {columnJobs.map(job => {
                      const mcConfig = getMachineConfig(job.machine);
                      const isUrgent = job.status === 'queued' && new Date(job.due_date) < new Date(Date.now() + 3*24*60*60*1000); // due in 3 days
                      
                      return (
                        <div key={job.jog_no} draggable="true" onDragStart={(e) => handleDragStart(e, job.jog_no)} onDragEnd={handleDragEnd}
                          style={{ 
                            background: 'white', padding: '1rem', borderRadius: '10px', 
                            cursor: 'grab', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', 
                            borderLeft: isUrgent ? '5px solid #ef4444' : '5px solid transparent',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)'; }}
                        >
                          
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem'}}>
                            <strong style={{color: '#0f172a', fontSize: '1rem'}}>#{job.jog_no}</strong>
                            {job.due_date && (
                              <span style={{ fontSize: '0.75rem', color: isUrgent ? '#ef4444' : '#64748b', fontWeight: isUrgent ? 'bold' : 'normal', background: isUrgent ? '#fee2e2' : 'transparent', padding: '0.2rem 0.4rem', borderRadius: '6px' }}>
                                <i className="fa-regular fa-calendar"></i> Due: {new Date(job.due_date).toLocaleDateString('th-TH')}
                              </span>
                            )}
                          </div>
                          
                          <h5 style={{margin: '0 0 0.8rem 0', color: '#334155', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 600}}>{job.job_name}</h5>
                          
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                            {job.machine && <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: mcConfig.color, padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 'bold' }}>
                              <i className={mcConfig.icon}></i> {job.machine}
                            </span>}
                            <span style={{ fontSize: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              <i className="fa-solid fa-layer-group"></i> {(parseInt(job.sheets_actual)||0).toLocaleString()} แผ่น
                            </span>
                          </div>

                          {/* Post-press tags */}
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {job.coating && job.coating !== 'ไม่ทำ' && <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#4f46e5', padding: '0.2rem 0.4rem', borderRadius: '6px', fontWeight: 600 }}>เคลือบ</span>}
                            {job.die_cut && job.die_cut !== 'ไม่ทำ' && <span style={{ fontSize: '0.7rem', background: '#ffedd5', color: '#ea580c', padding: '0.2rem 0.4rem', borderRadius: '6px', fontWeight: 600 }}>ไดคัท</span>}
                            {job.fold && job.fold !== 'ไม่ทำ' && <span style={{ fontSize: '0.7rem', background: '#fce7f3', color: '#db2777', padding: '0.2rem 0.4rem', borderRadius: '6px', fontWeight: 600 }}>พับ</span>}
                            {job.glue && job.glue !== 'ไม่ทำ' && <span style={{ fontSize: '0.7rem', background: '#fef08a', color: '#a16207', padding: '0.2rem 0.4rem', borderRadius: '6px', fontWeight: 600 }}>ปะกาว</span>}
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
        <div style={{ padding: '0 2rem 2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #8b5cf6' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}><i className="fa-solid fa-chart-pie" style={{color:'#8b5cf6', marginRight:'0.5rem'}}></i> ภาพรวมงานหลังพิมพ์ (Post-Press Load)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: '#e0e7ff', padding: '2rem 1rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4f46e5' }}>{dashboardData.post_press.needs_coating}</div>
                <div style={{ fontSize: '0.9rem', color: '#4338ca', fontWeight: 700, marginTop: '0.5rem' }}>รอเคลือบ</div>
              </div>
              <div style={{ background: '#ffedd5', padding: '2rem 1rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ea580c' }}>{dashboardData.post_press.needs_diecut}</div>
                <div style={{ fontSize: '0.9rem', color: '#c2410c', fontWeight: 700, marginTop: '0.5rem' }}>รอไดคัท</div>
              </div>
              <div style={{ background: '#fce7f3', padding: '2rem 1rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#db2777' }}>{dashboardData.post_press.needs_fold}</div>
                <div style={{ fontSize: '0.9rem', color: '#be185d', fontWeight: 700, marginTop: '0.5rem' }}>รอพับ</div>
              </div>
              <div style={{ background: '#fef08a', padding: '2rem 1rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#a16207' }}>{dashboardData.post_press.needs_glue}</div>
                <div style={{ fontSize: '0.9rem', color: '#854d0e', fontWeight: 700, marginTop: '0.5rem' }}>รอปะกาว</div>
              </div>
              <div style={{ background: '#f3e8ff', padding: '2rem 1rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#9333ea' }}>{dashboardData.post_press.needs_hotstamp}</div>
                <div style={{ fontSize: '0.9rem', color: '#7e22ce', fontWeight: 700, marginTop: '0.5rem' }}>รอปั๊มเค/ฟอยล์</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #ef4444' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#ef4444', fontSize: '1.2rem', fontWeight: 800 }}><i className="fa-solid fa-fire" style={{marginRight:'0.5rem'}}></i> 10 อันดับงานด่วน (Urgent Jobs)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', color: '#64748b' }}>Due Date</th>
                    <th style={{ padding: '1rem', color: '#64748b' }}>JOG No.</th>
                    <th style={{ padding: '1rem', color: '#64748b' }}>ชื่องาน</th>
                    <th style={{ padding: '1rem', color: '#64748b' }}>สถานะ</th>
                    <th style={{ padding: '1rem', color: '#64748b' }}>เครื่อง</th>
                    <th style={{ padding: '1rem', color: '#64748b' }}>ยอดพิมพ์</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.urgent_jobs.map(job => (
                    <tr key={job.jog_no} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                      <td style={{ padding: '1rem', color: '#ef4444', fontWeight: 800 }}>
                        {new Date(job.due_date).toLocaleDateString('th-TH')}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#334155' }}>{job.jog_no}</td>
                      <td style={{ padding: '1rem', color: '#0f172a' }}>{job.job_name}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          background: job.status === 'queued' ? '#f1f5f9' : '#fef08a', 
                          padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600
                        }}>
                          {STAGES.find(s=>s.id===job.status)?.label || job.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#3b82f6' }}>{job.machine || '-'}</td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>{(parseInt(job.sheets_actual)||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB: LOGS ========== */}
      {activeTab === 'log' && (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
          <i className="fa-solid fa-person-digging" style={{ fontSize: '4rem', marginBottom: '1.5rem', color: '#cbd5e1' }}></i>
          <h2 style={{color: '#475569', fontWeight: 800, marginBottom: '0.5rem'}}>กำลังปรับปรุงระบบ Log เชื่อมต่อกับข้อมูลจริง</h2>
          <p style={{fontSize: '1.1rem'}}>ฟีเจอร์นี้จะเชื่อมกับข้อมูล JOG No. จริงและ Operator เร็วๆ นี้</p>
        </div>
      )}

    </div>
  );
}
