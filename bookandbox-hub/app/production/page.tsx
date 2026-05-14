"use client";
import { useState, useEffect } from 'react';


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

const getMachineConfig = (machineName: string) => {
  if (!machineName) return { id: 'อื่นๆ', icon: 'fa-solid fa-cogs', color: '#94a3b8' };
  const found = MACHINES.find(m => m.keywords.some(k => machineName.toUpperCase().includes(k.toUpperCase())));
  return found || { id: machineName, icon: 'fa-solid fa-cogs', color: '#64748b' };
};

const SUB_TABS = [
  { id: 'board', label: 'บอร์ดคิวงาน (Kanban)', icon: 'fa-solid fa-columns' },
  { id: 'dashboard', label: 'ภาพรวมผลิต (Dashboard)', icon: 'fa-solid fa-chart-pie' },
  { id: 'log', label: 'บันทึกรายวัน (Logs)', icon: 'fa-solid fa-clipboard-list' },
  { id: 'schedule', label: 'วางแผนผลิต (Schedule)', icon: 'fa-solid fa-calendar-days' },
];

// Operator list from real employee data
const OPERATORS = [
  'สมชาย', 'สมหญิง', 'วิชัย', 'ประเสริฐ', 'สุรชัย', 'นิพนธ์', 'อนุชา',
  'วรพจน์', 'กิตติ', 'ธนา', 'ศักดิ์ชัย', 'อภิชาต', 'มานพ', 'ชัยวัฒน์',
  'พรชัย', 'สุทธิ', 'วิทยา', 'สมศักดิ์', 'ภูวนาท', 'ก้อย', 'ซัน'
];

// Downtime reason presets
const DOWNTIME_REASONS = [
  'รอเพลท', 'ล้างเครื่อง', 'เครื่องเสีย', 'รอกระดาษ', 'รอหมึก',
  'ตั้งเครื่อง (Makeready)', 'เปลี่ยนงาน', 'พักเครื่อง', 'ไฟดับ', 'อื่นๆ'
];

export default function Production() {
  const [activeTab, setActiveTab] = useState('board');
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [showOperatorList, setShowOperatorList] = useState(false);
  const [jogSearch, setJogSearch] = useState('');
  const [showJogList, setShowJogList] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Log System States
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [oeeSummary, setOeeSummary] = useState<any>(null);
  const [newLog, setNewLog] = useState({
    machine: '',
    operator_name: '',
    job_ref: '',
    actual_run_min: 480,
    downtime_min: 0,
    downtime_reason: '',
    good_qty: 0,
    defect_qty: 0
  });

  useEffect(() => {
    // Add fontawesome if not exists
    if (!document.querySelector('#fa-link')) {
      const link = document.createElement('link');
      link.id = 'fa-link';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
    
    // Timeout: ถ้าโหลดไม่เสร็จใน 5 วินาที ให้แสดงผลเลย
    const timeout = setTimeout(() => setLoading(false), 5000);
    fetchData().finally(() => { clearTimeout(timeout); setLoading(false); });
    
    // Fetch team members for operator dropdown
    fetch(`${API_URL}/team-members`).then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length > 0) setTeamMembers(d);
    }).catch(() => {});
    
    const interval = setInterval(fetchData, 30000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch Dashboard
      const dashRes = await fetch(`${API_URL}/production/dashboard`);
      const dashData = await dashRes.json();
      setDashboardData(dashData);

      // Fetch Jobs (limit 300 for board performance)
      const jobsRes = await fetch(`${API_URL}/production/jobs?limit=300&status=all`);
      const jobsData = await jobsRes.json();
      setJobOrders(jobsData.jobs);

      // Fetch Logs & OEE Summary
      try {
        const [logsRes, oeeRes] = await Promise.all([
          fetch(`${API_URL}/production_log`),
          fetch(`${API_URL}/production_log/summary?days=7`)
        ]);
        const logsData = await logsRes.json();
        const oeeData = await oeeRes.json();
        setProductionLogs(Array.isArray(logsData) ? logsData : []);
        setOeeSummary(oeeData || null);
      } catch (logErr) {
        console.error('Failed to fetch logs', logErr);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch production data', err);
      setLoading(false);
    }
  };

  const handleSearch = async (e: any) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length > 2 || e.target.value === '') {
      const jobsRes = await fetch(`${API_URL}/production/jobs?limit=300&status=all&search=${e.target.value}`);
      const jobsData = await jobsRes.json();
      setJobOrders(jobsData.jobs);
    }
  };

  // Drag & Drop
  const handleDragStart = (e: any, jogNo: string) => { 
    e.dataTransfer.setData('jogNo', jogNo); 
    e.currentTarget.style.opacity = '0.5'; 
  };
  const handleDragEnd = (e: any) => { e.currentTarget.style.opacity = '1'; };
  const handleDragOver = (e: any) => { e.preventDefault(); e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1)'; };
  const handleDragLeave = (e: any) => { e.currentTarget.style.boxShadow = 'none'; };
  const handleDrop = async (e: any, targetStageId: string) => {
    e.preventDefault();
    e.currentTarget.style.boxShadow = 'none';
    const jogNo = e.dataTransfer.getData('jogNo');
    if (!jogNo) return;
    
    // Optimistic UI update
    setJobOrders(prev => prev.map(j => j.jog_no === jogNo ? { ...j, status: targetStageId } : j));
    
    try { 
      await fetch(`${API_URL}/production/jobs/${jogNo}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStageId })
      });
      fetchData(); // sync real dashboard
    } catch (err: any) { 
      alert('Failed to update status'); 
      fetchData(); // revert
    }
  };

  const submitLog = async () => {
    if (!newLog.machine || !newLog.operator_name || !newLog.job_ref) {
      return alert('กรุณากรอก เครื่องจักร, ชื่อพนักงาน และ JOG No.');
    }
    try {
      await fetch(`${API_URL}/production_log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      setNewLog({ machine: '', operator_name: '', job_ref: '', actual_run_min: 0, downtime_min: 0, downtime_reason: '', good_qty: 0, defect_qty: 0 });
      fetchData();
    } catch (err: any) {
      alert('Failed to submit log: ' + err.message);
    }
  };

  // คำนวณความเร็วเฉลี่ย
  const calcSpeed = () => {
    if (newLog.actual_run_min > 0 && newLog.good_qty > 0) {
      return Math.round((newLog.good_qty / newLog.actual_run_min) * 60);
    }
    return 0;
  };

  // Operator list (from API or fallback)
  const operatorList = teamMembers.length > 0 
    ? teamMembers.map((t: any) => t.name)
    : OPERATORS;
  
  const filteredOperators = operatorList.filter((name: string) =>
    name.toLowerCase().includes(operatorSearch.toLowerCase())
  );

  // JOG autocomplete from loaded jobs
  const filteredJogs = (Array.isArray(jobOrders) ? jobOrders : []).filter((j: any) => 
    j.jog_no && j.jog_no.toLowerCase().includes(jogSearch.toLowerCase())
  ).slice(0, 8);

  if (loading) return <div style={{padding:'2rem', textAlign:'center', marginTop: '100px', fontSize: '1.2rem', color: '#64748b'}}><i className="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูลผลิตจริง...<br/><span style={{fontSize:'0.85rem', color:'#94a3b8', marginTop:'0.5rem', display:'block'}}>ถ้าค้างนานกว่า 5 วินาที จะแสดงผลอัตโนมัติ</span></div>;

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>🏭 Smart Production Board</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            อ้างอิงข้อมูลจริง: <strong style={{color:'#10b981'}}>{dashboardData?.total_jobs?.toLocaleString() || 0}</strong> งานทั้งหมด | 
            ค้างผลิต: <strong>{dashboardData?.by_status?.find((s: any)=>s.status==='queued')?.count || 0}</strong> งาน
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
        {dashboardData?.by_machine?.map((m: any) => {
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
                  {dashboardData.urgent_jobs.map((job: any) => (
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
                          {STAGES.find((s: any)=>s.id===job.status)?.label || job.status}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* Form */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #3b82f6', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>
              <i className="fa-solid fa-clipboard-list text-blue-500 mr-2"></i> บันทึกผลการผลิต (Production Log)
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 1. เครื่องจักร — Quick Select Buttons */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>เครื่องจักร (Machine)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {MACHINES.map(m => (
                    <button key={m.id} onClick={() => setNewLog({...newLog, machine: m.name})}
                      style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: newLog.machine === m.name ? `2px solid ${m.color}` : '1px solid #e2e8f0',
                        background: newLog.machine === m.name ? `${m.color}15` : 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        color: newLog.machine === m.name ? m.color : '#64748b', transition: 'all 0.15s' }}>
                      <i className={m.icon} style={{marginRight:'0.3rem'}}/> {m.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. พนักงาน — Searchable Dropdown */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>👤 พนักงานคุมเครื่อง</label>
                <input type="text" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  value={newLog.operator_name || operatorSearch}
                  onChange={e => { setOperatorSearch(e.target.value); setNewLog({...newLog, operator_name: ''}); setShowOperatorList(true); }}
                  onFocus={() => setShowOperatorList(true)}
                  placeholder="🔍 พิมพ์ชื่อเพื่อค้นหา..." />
                {showOperatorList && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px', maxHeight: '200px', overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {filteredOperators.map((name: string) => (
                      <div key={name} onClick={() => { setNewLog({...newLog, operator_name: name}); setOperatorSearch(''); setShowOperatorList(false); }}
                        style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9',
                          background: newLog.operator_name === name ? '#eff6ff' : 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = newLog.operator_name === name ? '#eff6ff' : 'white'}>
                        👤 {name}
                      </div>
                    ))}
                    {filteredOperators.length === 0 && <div style={{ padding: '0.6rem', color: '#94a3b8', fontSize: '0.85rem' }}>ไม่พบ — พิมพ์ชื่อใหม่ได้เลย</div>}
                  </div>
                )}
              </div>

              {/* 3. JOG No. — Autocomplete */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>📋 หมายเลขงาน (JOG No.)</label>
                <input type="text" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  value={newLog.job_ref || jogSearch}
                  onChange={e => { setJogSearch(e.target.value); setNewLog({...newLog, job_ref: e.target.value}); setShowJogList(true); }}
                  onFocus={() => setShowJogList(true)}
                  placeholder="🔍 พิมพ์เลข JOG เพื่อค้นหา..." />
                {showJogList && jogSearch.length > 0 && filteredJogs.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px', maxHeight: '200px', overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {filteredJogs.map((j: any) => (
                      <div key={j.jog_no} onClick={() => { setNewLog({...newLog, job_ref: j.jog_no}); setJogSearch(''); setShowJogList(false); }}
                        style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <strong>{j.jog_no}</strong> — <span style={{color:'#64748b'}}>{j.job_name?.substring(0,30)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Quick Time Buttons + Number inputs */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>⏱️ เวลาเดินเครื่อง (นาที)</label>
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.3rem' }}>
                  {[120, 240, 360, 480].map(v => (
                    <button key={v} onClick={() => setNewLog({...newLog, actual_run_min: v})}
                      style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: newLog.actual_run_min === v ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        background: newLog.actual_run_min === v ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                      {v/60}ชม. ({v}นาที)
                    </button>
                  ))}
                </div>
                <input type="number" style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                  value={newLog.actual_run_min} onChange={e => setNewLog({...newLog, actual_run_min: Number(e.target.value)})} />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.3rem' }}>⏸️ เวลาสูญเสีย (นาที)</label>
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.3rem' }}>
                  {[0, 15, 30, 60, 90].map(v => (
                    <button key={v} onClick={() => setNewLog({...newLog, downtime_min: v})}
                      style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: newLog.downtime_min === v ? '2px solid #ef4444' : '1px solid #e2e8f0',
                        background: newLog.downtime_min === v ? '#fef2f2' : 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                      {v === 0 ? 'ไม่มี' : `${v} นาที`}
                    </button>
                  ))}
                </div>
                <input type="number" style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                  value={newLog.downtime_min} onChange={e => setNewLog({...newLog, downtime_min: Number(e.target.value)})} />
              </div>

              {/* Downtime reason — Quick Select */}
              {newLog.downtime_min > 0 && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.3rem' }}>สาเหตุ Downtime</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {DOWNTIME_REASONS.map(r => (
                      <button key={r} onClick={() => setNewLog({...newLog, downtime_reason: r})}
                        style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: newLog.downtime_reason === r ? '2px solid #ef4444' : '1px solid #e2e8f0',
                          background: newLog.downtime_reason === r ? '#fef2f2' : 'white', cursor: 'pointer', fontSize: '0.75rem' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Good / Defect with large inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22c55e', display: 'block', marginBottom: '0.3rem' }}>✅ ยอดงานดี</label>
                  <input type="number" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '2px solid #bbf7d0', fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', color: '#16a34a' }}
                    value={newLog.good_qty} onChange={e => setNewLog({...newLog, good_qty: Number(e.target.value)})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.3rem' }}>❌ ยอดงานเสีย</label>
                  <input type="number" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '2px solid #fca5a5', fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', color: '#ef4444' }}
                    value={newLog.defect_qty} onChange={e => setNewLog({...newLog, defect_qty: Number(e.target.value)})} />
                </div>
              </div>

              {/* Auto Speed Calculation */}
              {calcSpeed() > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>⚡ ความเร็วเฉลี่ย (คำนวณอัตโนมัติ)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: calcSpeed() > 10000 ? '#22c55e' : calcSpeed() > 6000 ? '#3b82f6' : '#f59e0b' }}>
                    {calcSpeed().toLocaleString()} ใบ/ชม.
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>มาตรฐาน: 6,000–13,000 ใบ/ชม.</div>
                </div>
              )}

              <button 
                onClick={submitLog}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
                onMouseEnter={e=>e.currentTarget.style.background='#2563eb'} onMouseLeave={e=>e.currentTarget.style.background='#3b82f6'}
              >
                💾 บันทึกข้อมูล (Save Log)
              </button>
            </div>
          </div>

          {/* History / OEE Display */}
          <div>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #10b981', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1.5rem 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>
                <i className="fa-solid fa-gauge-high text-emerald-500 mr-2"></i> ภาพรวมประสิทธิภาพ (OEE Summary 7 วัน)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>อัตราเดินเครื่อง (Availability)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: (oeeSummary?.overall?.availability || 0) > 80 ? '#10b981' : '#f59e0b' }}>
                    {oeeSummary?.overall?.availability || 0}%
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>คุณภาพงาน (Quality)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: (oeeSummary?.overall?.quality || 0) > 95 ? '#10b981' : '#f59e0b' }}>
                    {oeeSummary?.overall?.quality || 0}%
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>รวม (Overall OEE)</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6' }}>
                    {oeeSummary?.overall?.oee || 0}%
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #8b5cf6' }}>
              <h4 style={{ margin: '0 0 1.5rem 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>
                <i className="fa-solid fa-history text-purple-500 mr-2"></i> ประวัติการบันทึกล่าสุด
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.8rem', color: '#64748b' }}>เวลา</th>
                      <th style={{ padding: '0.8rem', color: '#64748b' }}>JOG No.</th>
                      <th style={{ padding: '0.8rem', color: '#64748b' }}>เครื่องจักร</th>
                      <th style={{ padding: '0.8rem', color: '#64748b' }}>พนักงาน</th>
                      <th style={{ padding: '0.8rem', color: '#64748b' }}>ผลิต (ดี/เสีย)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(productionLogs) ? productionLogs : []).slice(0, 10).map((log: any, i: number) => (
                      <tr key={log.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.8rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</td>
                        <td style={{ padding: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{log.job_ref}</td>
                        <td style={{ padding: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>{log.machine}</td>
                        <td style={{ padding: '0.8rem' }}>{log.operator_name}</td>
                        <td style={{ padding: '0.8rem' }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>{log.good_qty}</span> / <span style={{ color: '#ef4444' }}>{log.defect_qty}</span>
                        </td>
                      </tr>
                    ))}
                    {(!Array.isArray(productionLogs) || productionLogs.length === 0) && (
                      <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีประวัติการบันทึก</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'schedule' && (
        <ScheduleTab jobOrders={jobOrders} API_URL={API_URL} />
      )}

    </div>
  );
}

// ====== PRODUCTION SCHEDULE TAB ======
const PROCESS_STEPS = [
  { id: 'prepress', label: 'เตรียมพิมพ์', color: '#818cf8', days: 1 },
  { id: 'printing', label: 'พิมพ์', color: '#3b82f6', days: 2 },
  { id: 'coating', label: 'เคลือบ', color: '#06b6d4', days: 1 },
  { id: 'diecut', label: 'ปั๊มไดคัท', color: '#f97316', days: 2 },
  { id: 'folding', label: 'พับ/ปะกาว', color: '#eab308', days: 2 },
  { id: 'qc', label: 'QC', color: '#22c55e', days: 1 },
  { id: 'packing', label: 'Packing', color: '#8b5cf6', days: 1 },
  { id: 'shipping', label: 'จัดส่ง', color: '#ef4444', days: 1 },
];

function ScheduleTab({ jobOrders, API_URL }: { jobOrders: any[], API_URL: string }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    job_ref: '', job_name: '', quantity: 0, start_date: new Date().toISOString().split('T')[0],
    steps: PROCESS_STEPS.map(s => ({ ...s, enabled: true }))
  });

  useEffect(() => {
    // Load saved schedules
    const saved = localStorage.getItem('production_schedules');
    if (saved) setSchedules(JSON.parse(saved));
  }, []);

  const saveSchedules = (data: any[]) => {
    setSchedules(data);
    localStorage.setItem('production_schedules', JSON.stringify(data));
  };

  const addSchedule = () => {
    if (!newSchedule.job_ref || !newSchedule.job_name) return alert('กรุณากรอก JOG No. และชื่องาน');
    
    // Calculate dates for each step
    let currentDate = new Date(newSchedule.start_date);
    const steps = newSchedule.steps.filter(s => s.enabled).map(step => {
      const startDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + step.days);
      const endDate = new Date(currentDate);
      return { ...step, start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
    });

    const schedule = {
      id: Date.now(),
      job_ref: newSchedule.job_ref,
      job_name: newSchedule.job_name,
      quantity: newSchedule.quantity,
      start_date: newSchedule.start_date,
      end_date: steps[steps.length - 1]?.end || newSchedule.start_date,
      steps,
      status: 'planned',
      created_at: new Date().toISOString()
    };

    saveSchedules([schedule, ...schedules]);
    setShowAddForm(false);
    setNewSchedule({ job_ref: '', job_name: '', quantity: 0, start_date: new Date().toISOString().split('T')[0], steps: PROCESS_STEPS.map(s => ({ ...s, enabled: true })) });
  };

  const removeSchedule = (id: number) => {
    if (confirm('ลบแผนงานนี้?')) saveSchedules(schedules.filter(s => s.id !== id));
  };

  // Generate date columns for the next 21 days
  const today = new Date();
  const dateColumns: string[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dateColumns.push(d.toISOString().split('T')[0]);
  }

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth()+1}`;
  };

  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
            📅 แผนการผลิต (Production Timeline)
          </h3>
          <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            วางแผนงานแต่ละขั้นตอน เชื่อมเครื่อง+คน เห็นโหลดจริง
          </p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
          {showAddForm ? '✕ ปิด' : '+ เพิ่มแผนงาน'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '1rem', border: '2px solid #3b82f6', boxShadow: '0 4px 12px rgba(59,130,246,0.15)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>JOG No.</label>
              <input type="text" value={newSchedule.job_ref} onChange={e => setNewSchedule({...newSchedule, job_ref: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} placeholder="6801-0001" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>ชื่องาน</label>
              <input type="text" value={newSchedule.job_name} onChange={e => setNewSchedule({...newSchedule, job_name: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} placeholder="กล่อง Salonpas" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>จำนวน (ใบ)</label>
              <input type="number" value={newSchedule.quantity} onChange={e => setNewSchedule({...newSchedule, quantity: Number(e.target.value)})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>วันเริ่ม</label>
              <input type="date" value={newSchedule.start_date} onChange={e => setNewSchedule({...newSchedule, start_date: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
          </div>

          {/* Step toggles + days */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>ขั้นตอนงาน (เลือกเฉพาะงาน + ปรับวัน):</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {newSchedule.steps.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.6rem', borderRadius: '8px',
                  border: step.enabled ? `2px solid ${step.color}` : '1px solid #e2e8f0', background: step.enabled ? `${step.color}15` : '#f8fafc', cursor: 'pointer' }}
                  onClick={() => {
                    const steps = [...newSchedule.steps];
                    steps[idx] = { ...steps[idx], enabled: !steps[idx].enabled };
                    setNewSchedule({...newSchedule, steps});
                  }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step.enabled ? step.color : '#94a3b8' }}>{step.label}</span>
                  {step.enabled && (
                    <input type="number" value={step.days} min={1} max={10}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        const steps = [...newSchedule.steps];
                        steps[idx] = { ...steps[idx], days: Number(e.target.value) || 1 };
                        setNewSchedule({...newSchedule, steps});
                      }}
                      style={{ width: '35px', padding: '0.1rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.75rem' }} />
                  )}
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>วัน</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={addSchedule}
            style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
            ✅ เพิ่มแผนงาน
          </button>
        </div>
      )}

      {/* Gantt Chart */}
      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.6rem 0.8rem', background: '#f1f5f9', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#475569', position: 'sticky', left: 0, minWidth: '200px', borderRight: '2px solid #e2e8f0', zIndex: 10 }}>งาน</th>
                {dateColumns.map(d => (
                  <th key={d} style={{ padding: '0.4rem 0.2rem', background: isWeekend(d) ? '#fef2f2' : '#f1f5f9', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600,
                    color: isWeekend(d) ? '#ef4444' : '#64748b', minWidth: '45px', borderLeft: '1px solid #e2e8f0' }}>
                    {getDayLabel(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 && (
                <tr><td colSpan={22} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  📅 ยังไม่มีแผนงาน — กด +เพิ่มแผนงาน ด้านบน
                </td></tr>
              )}
              {schedules.map(sch => (
                <tr key={sch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem 0.8rem', position: 'sticky', left: 0, background: 'white', borderRight: '2px solid #e2e8f0', zIndex: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{sch.job_ref}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sch.job_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sch.quantity?.toLocaleString()} ใบ</div>
                      </div>
                      <button onClick={() => removeSchedule(sch.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                    </div>
                  </td>
                  {dateColumns.map(d => {
                    const step = sch.steps?.find((s: any) => d >= s.start && d < s.end);
                    return (
                      <td key={d} style={{ padding: '0.2rem', borderLeft: '1px solid #f1f5f9', background: isWeekend(d) ? '#fef2f220' : 'transparent' }}>
                        {step && (
                          <div style={{ background: step.color, color: 'white', borderRadius: '4px', padding: '0.2rem 0.3rem', fontSize: '0.6rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.3,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                            {step.label}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ padding: '0.8rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {PROCESS_STEPS.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
