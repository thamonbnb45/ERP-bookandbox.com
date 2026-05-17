"use client";
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://erp-bookandboxcom-production.up.railway.app/api';

export default function WorkloadDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch(`${API_URL}/production/jobs?limit=100`).then(r => r.json()),
      fetch(`${API_URL}/production_log`).then(r => r.json()),
    ]).then(([jobsR, logsR]) => {
      if (jobsR.status === 'fulfilled') setJobs(jobsR.value.jobs || []);
      if (logsR.status === 'fulfilled') setLogs(Array.isArray(logsR.value) ? logsR.value : []);
      setLoading(false);
    });
  }, []);

  const activeJobs = jobs.filter(j => j.status !== 'completed');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const printingJobs = jobs.filter(j => j.status === 'printing');
  
  // Department workload calculated from real jobs
  const departments = [
    {
      name: 'เตรียมพิมพ์ (Pre-press)',
      icon: '🎨',
      headcount: 4,
      capacityHours: 4 * 8 * 6,
      loadHours: Math.round(activeJobs.length * 2.5), // ~2.5hr per job prep
      color: '#8b5cf6',
    },
    {
      name: 'เครื่องพิมพ์ (Printing)',
      icon: '🖨️',
      headcount: 12,
      capacityHours: 12 * 8 * 6,
      loadHours: Math.round(activeJobs.reduce((s, j) => s + ((parseInt(j.sheets_plan)||0) / 6000), 0)),
      color: '#3b82f6',
    },
    {
      name: 'หลังพิมพ์ (Post-press)',
      icon: '✨',
      headcount: 15,
      capacityHours: 15 * 8 * 6,
      loadHours: Math.round(activeJobs.filter(j => 
        (j.coating && j.coating !== 'ไม่ทำ') || (j.die_cut && j.die_cut !== 'ไม่ทำ') || (j.fold && j.fold !== 'ไม่ทำ')
      ).reduce((s, j) => s + ((parseInt(j.sheets_plan)||0) / 4000), 0)),
      color: '#f97316',
    },
    {
      name: 'แพ็กกิ้ง (Packing)',
      icon: '📦',
      headcount: 8,
      capacityHours: 8 * 8 * 6,
      loadHours: Math.round(completedJobs.length * 4 + printingJobs.length * 2),
      color: '#22c55e',
    },
  ];

  const totalCapacity = departments.reduce((s, d) => s + d.capacityHours, 0);
  const totalLoad = departments.reduce((s, d) => s + d.loadHours, 0);
  const utilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;
  const overloaded = departments.filter(d => d.loadHours > d.capacityHours);
  const otHours = overloaded.reduce((s, d) => s + (d.loadHours - d.capacityHours), 0);

  // Weekly production stats from logs
  const thisWeekLogs = logs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  });
  const totalGood = thisWeekLogs.reduce((s, l) => s + (parseInt(l.good_qty)||0), 0);
  const totalDefect = thisWeekLogs.reduce((s, l) => s + (parseInt(l.defect_qty)||0), 0);
  const avgOEE = thisWeekLogs.length > 0 
    ? Math.round(thisWeekLogs.reduce((s, l) => {
        const good = parseInt(l.good_qty)||0;
        const target = parseInt(l.target_qty)||1;
        return s + (good / target * 100);
      }, 0) / thisWeekLogs.length)
    : 0;

  const s = { card: { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' } as React.CSSProperties };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>⏳ กำลังคำนวณปริมาณงาน...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1320', margin: 0 }}>⚖️ Workload Dashboard</h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>ภาพรวมปริมาณงาน vs กำลังคน — คำนวณจากงานจริง {jobs.length} รายการ + Logs {logs.length} รายการ</p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Capacity รวม', value: `${totalCapacity} ชม.`, bg: '#eff6ff', color: '#2563eb', icon: '⚡' },
          { label: 'Load จริง', value: `${totalLoad} ชม.`, bg: utilization > 100 ? '#fef2f2' : '#f0fdf4', color: utilization > 100 ? '#dc2626' : '#16a34a', icon: '📊' },
          { label: 'Utilization', value: `${utilization}%`, bg: utilization > 85 ? '#fef9c3' : '#f0fdf4', color: utilization > 85 ? '#a16207' : '#16a34a', icon: '📈' },
          { label: 'OT ที่ต้องทำ', value: `${otHours} ชม.`, bg: otHours > 0 ? '#fef2f2' : '#f0fdf4', color: otHours > 0 ? '#dc2626' : '#16a34a', icon: '⏰' },
          { label: 'งานเข้าสัปดาห์นี้', value: `${thisWeekLogs.length} batch`, bg: '#f5f3ff', color: '#7c3aed', icon: '📝' },
          { label: 'OEE เฉลี่ย', value: `${avgOEE}%`, bg: avgOEE >= 85 ? '#f0fdf4' : '#fef9c3', color: avgOEE >= 85 ? '#16a34a' : '#a16207', icon: '🏆' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Department Bars */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>📊 ปริมาณงานแยกตามแผนก</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {departments.map(d => {
            const util = d.capacityHours > 0 ? Math.round((d.loadHours / d.capacityHours) * 100) : 0;
            const isOver = util > 100;
            return (
              <div key={d.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{d.icon}</span>
                    <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{d.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({d.headcount} คน)</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isOver ? '#dc2626' : util > 80 ? '#ea580c' : '#16a34a', background: isOver ? '#fef2f2' : util > 80 ? '#fff7ed' : '#f0fdf4', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                    {util}%
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ height: '28px', background: '#f1f5f9', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(util, 100)}%`, background: `linear-gradient(90deg, ${d.color}, ${d.color}cc)`, borderRadius: '14px', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ position: 'absolute', right: '10px', top: '4px', fontSize: '0.7rem', fontWeight: 700, color: isOver ? '#dc2626' : '#64748b' }}>
                    {d.loadHours} / {d.capacityHours} ชม.
                    {isOver && ` (+${d.loadHours - d.capacityHours} OT)`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production Output */}
      <div style={{ ...s.card, marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>📋 ผลผลิตสัปดาห์นี้ (จาก Production Logs)</h3>
        {thisWeekLogs.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>ยังไม่มีข้อมูล log สัปดาห์นี้</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>{totalGood.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>ชิ้นงานดี (Good)</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>{totalDefect.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>ของเสีย (Defect)</div>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb' }}>{totalGood > 0 ? Math.round(totalDefect / (totalGood + totalDefect) * 10000) / 100 : 0}%</div>
              <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>อัตราเสีย (Defect Rate)</div>
            </div>
          </div>
        )}
      </div>

      {/* Job Status Summary */}
      <div style={{ ...s.card, marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>📦 สถานะงานทั้งหมด</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'รอผลิต (Queued)', count: jobs.filter(j => j.status === 'queued').length, color: '#f59e0b', bg: '#fef9c3' },
            { label: 'กำลังผลิต (Printing)', count: printingJobs.length, color: '#3b82f6', bg: '#dbeafe' },
            { label: 'เสร็จแล้ว (Completed)', count: completedJobs.length, color: '#22c55e', bg: '#dcfce7' },
            { label: 'มีปัญหา (Issue)', count: jobs.filter(j => j.status === 'issue').length, color: '#ef4444', bg: '#fef2f2' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '0.78rem', color: s.color, fontWeight: 700, marginTop: '0.3rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
