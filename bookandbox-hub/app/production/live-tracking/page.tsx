"use client";
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://erp-bookandboxcom-production.up.railway.app/api';

// Machine definitions
const MACHINE_DEFS = [
  { id: 'SM74F', name: 'Heidelberg SM74F (4สี)', type: 'Offset', icon: '🖨️' },
  { id: 'SM102F', name: 'Heidelberg SM102F', type: 'Offset', icon: '🖨️' },
  { id: 'KM C12000', name: 'Konica C12000', type: 'Digital', icon: '🖥️' },
  { id: 'KM C4070', name: 'Konica C4070', type: 'Digital', icon: '🖥️' },
  { id: 'CUT-1', name: 'เครื่องตัด Polar', type: 'Post-press', icon: '✂️' },
  { id: 'DIE-1', name: 'ปั๊มไดคัท', type: 'Post-press', icon: '🔲' },
  { id: 'COAT-1', name: 'เครื่องเคลือบ', type: 'Post-press', icon: '✨' },
  { id: 'FOLD-1', name: 'เครื่องพับ', type: 'Post-press', icon: '📐' },
];

type MachineStatus = 'running' | 'idle' | 'setup' | 'downtime';

export default function LiveTrackingPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchAll = () => {
      Promise.allSettled([
        fetch(`${API_URL}/production/jobs?limit=100`).then(r => r.json()),
        fetch(`${API_URL}/production_log`).then(r => r.json()),
      ]).then(([jobsR, logsR]) => {
        if (jobsR.status === 'fulfilled') setJobs(jobsR.value.jobs || []);
        if (logsR.status === 'fulfilled') setLogs(Array.isArray(logsR.value) ? logsR.value : []);
        setLoading(false);
      });
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // Refresh every 30s
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  // Determine machine status from current jobs
  const machineStatuses = MACHINE_DEFS.map(m => {
    const machineJobs = jobs.filter(j => j.machine === m.id);
    const printingJobs = machineJobs.filter(j => j.status === 'printing');
    const queuedJobs = machineJobs.filter(j => j.status === 'queued');

    // Also check logs for this machine
    const machineLogs = logs.filter(l => l.machine === m.id);
    const latestLog = machineLogs.length > 0 ? machineLogs[0] : null;

    let status: MachineStatus = 'idle';
    let currentJob: any = null;
    let nextJobs: any[] = [];

    if (printingJobs.length > 0) {
      status = 'running';
      currentJob = printingJobs[0];
      nextJobs = [...printingJobs.slice(1), ...queuedJobs].slice(0, 3);
    } else if (queuedJobs.length > 0) {
      status = 'setup';
      currentJob = null;
      nextJobs = queuedJobs.slice(0, 3);
    }

    const totalSheets = machineJobs.reduce((s, j) => s + (parseInt(j.sheets_plan)||0), 0);
    const completedSheets = machineJobs.reduce((s, j) => s + (parseInt(j.sheets_actual)||0), 0);

    return { ...m, status, currentJob, nextJobs, totalJobs: machineJobs.length, printingCount: printingJobs.length, queuedCount: queuedJobs.length, completedCount: machineJobs.filter(j => j.status === 'completed').length, totalSheets, completedSheets, latestLog };
  });

  const types = ['All', ...Array.from(new Set(MACHINE_DEFS.map(m => m.type)))];
  const filtered = filterType === 'All' ? machineStatuses : machineStatuses.filter(m => m.type === filterType);

  const running = machineStatuses.filter(m => m.status === 'running').length;
  const setup = machineStatuses.filter(m => m.status === 'setup').length;
  const idle = machineStatuses.filter(m => m.status === 'idle').length;

  const statusConfig: Record<MachineStatus, { bg: string; text: string; border: string; label: string; dot: string }> = {
    running: { bg: '#dcfce7', text: '#15803d', border: '#22c55e', label: '🟢 กำลังเดินเครื่อง', dot: '#22c55e' },
    setup: { bg: '#fef9c3', text: '#a16207', border: '#eab308', label: '🟡 ตั้งเครื่อง/รอจัดงาน', dot: '#eab308' },
    idle: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1', label: '⚪ ว่าง', dot: '#94a3b8' },
    downtime: { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444', label: '🔴 เครื่องหยุด', dot: '#ef4444' },
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>⏳ กำลังโหลด Live Tracking...</div>;

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1320', margin: 0 }}>🔴 Production Live Tracking</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            สถานะเครื่องจักร Real-time • อัพเดททุก 30 วินาที • <span style={{ color: '#3b82f6', fontWeight: 600 }}>{now.toLocaleTimeString('th-TH')}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', background: 'white', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: filterType === t ? '#1e293b' : 'transparent', color: filterType === t ? 'white' : '#64748b', transition: 'all 0.2s' }}>
              {t === 'All' ? 'ทุกเครื่อง' : t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'เครื่องจักรทั้งหมด', value: machineStatuses.length, bg: '#1e3a5f', color: 'white' },
          { label: 'กำลังเดินเครื่อง', value: running, bg: '#16a34a', color: 'white' },
          { label: 'ตั้งเครื่อง/รอจัดงาน', value: setup, bg: '#eab308', color: 'white' },
          { label: 'ว่าง/ไม่มีงาน', value: idle, bg: '#64748b', color: 'white' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: '14px', padding: '1.2rem', color: k.color }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.3rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Machine Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.2rem' }}>
        {filtered.map(m => {
          const sc = statusConfig[m.status];
          const progress = m.currentJob && parseInt(m.currentJob.sheets_plan) > 0
            ? Math.round((parseInt(m.currentJob.sheets_actual)||0) / parseInt(m.currentJob.sheets_plan) * 100)
            : 0;

          return (
            <div key={m.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${sc.border}` }}>
              {/* Status bar */}
              <div style={{ height: '4px', background: sc.dot }} />
              
              {/* Machine Header */}
              <div style={{ padding: '1.2rem 1.5rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.2rem' }}>{m.id} • {m.type}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{m.icon} {m.name}</div>
                </div>
                <div style={{ background: sc.bg, color: sc.text, padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, border: `1px solid ${sc.border}40` }}>
                  {sc.label}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '0 1.5rem 1.2rem' }}>
                {m.status === 'running' && m.currentJob ? (
                  <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>กำลังพิมพ์</div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem', marginBottom: '0.3rem' }}>{m.currentJob.job_name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>#{m.currentJob.jog_no}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.currentJob.customer}</span>
                    </div>
                    {/* Progress */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.3rem' }}>
                      <span>{(parseInt(m.currentJob.sheets_actual)||0).toLocaleString()} / {(parseInt(m.currentJob.sheets_plan)||0).toLocaleString()} แผ่น</span>
                      <span style={{ fontWeight: 700, color: '#16a34a' }}>{progress}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '4px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ) : m.status === 'setup' ? (
                  <div style={{ background: '#fef9c3', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>⚙️</div>
                    <div style={{ fontWeight: 700, color: '#a16207', fontSize: '0.9rem' }}>กำลังเตรียมเครื่อง</div>
                    <div style={{ fontSize: '0.8rem', color: '#ca8a04', marginTop: '0.2rem' }}>มีงานรอ {m.queuedCount} งาน</div>
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>💤</div>
                    <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.9rem' }}>ไม่มีงานในระบบ</div>
                  </div>
                )}

                {/* Queue */}
                {m.nextJobs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase' }}>คิวถัดไป ({m.nextJobs.length} งาน)</div>
                    {m.nextJobs.map((j: any) => (
                      <div key={j.jog_no} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#334155' }}>#{j.jog_no}</span>
                          <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>{j.job_name?.substring(0, 20)}</span>
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{(parseInt(j.sheets_plan)||0).toLocaleString()} แผ่น</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', padding: '0.5rem 0', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>งานทั้งหมด: {m.totalJobs}</span>
                  <span>แผ่นรวม: {m.totalSheets.toLocaleString()}</span>
                  <span>เสร็จ: {m.completedCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
