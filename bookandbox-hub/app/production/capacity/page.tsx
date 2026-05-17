"use client";
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://erp-bookandboxcom-production.up.railway.app/api';

// Machine config with real specs
const MACHINE_CONFIG = [
  { id: 'SM74F', name: 'SM74F (Heidelberg 4สี)', type: 'offset', speed: 8000, hoursPerDay: 8, daysPerWeek: 6, color: '#3b82f6', icon: '🖨️' },
  { id: 'SM102F', name: 'SM102F (Heidelberg)', type: 'offset', speed: 10000, hoursPerDay: 8, daysPerWeek: 6, color: '#8b5cf6', icon: '🖨️' },
  { id: 'KM C12000', name: 'Konica C12000 (Digital)', type: 'digital', speed: 4000, hoursPerDay: 8, daysPerWeek: 6, color: '#06b6d4', icon: '🖥️' },
  { id: 'KM C4070', name: 'Konica C4070 (Digital)', type: 'digital', speed: 2000, hoursPerDay: 8, daysPerWeek: 6, color: '#0ea5e9', icon: '🖥️' },
];

const POST_PRESS = [
  { id: 'CUT', name: 'เครื่องตัด (Polar)', speed: 15000, color: '#eab308', icon: '✂️' },
  { id: 'COAT', name: 'เครื่องเคลือบ', speed: 6000, color: '#14b8a6', icon: '✨' },
  { id: 'DIE', name: 'ปั๊มไดคัท/ฟอยล์', speed: 3000, color: '#f97316', icon: '🔲' },
  { id: 'FOLD', name: 'เครื่องพับ', speed: 5000, color: '#ef4444', icon: '📐' },
];

export default function CapacityPlanner() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/production/jobs?limit=100`)
      .then(r => r.json())
      .then(d => { setJobs(d.jobs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activeJobs = jobs.filter(j => j.status !== 'completed');
  
  // Calculate load per printing machine from real jobs
  const machineLoad = MACHINE_CONFIG.map(m => {
    const mJobs = activeJobs.filter(j => j.machine === m.id);
    const totalSheets = mJobs.reduce((s, j) => s + (parseInt(j.sheets_plan) || 0), 0);
    const hoursNeeded = Math.round((totalSheets / m.speed) * 10) / 10;
    const weeklyCapacity = m.hoursPerDay * m.daysPerWeek;
    const utilization = weeklyCapacity > 0 ? Math.round((hoursNeeded / weeklyCapacity) * 100) : 0;
    const freeHours = Math.max(0, Math.round((weeklyCapacity - hoursNeeded) * 10) / 10);
    const overloadHours = Math.max(0, Math.round((hoursNeeded - weeklyCapacity) * 10) / 10);
    return { ...m, jobs: mJobs, totalSheets, hoursNeeded, weeklyCapacity, utilization, freeHours, overloadHours };
  });

  // Post-press load from job specs
  const postPressLoad = POST_PRESS.map(pp => {
    let matchJobs: any[] = [];
    if (pp.id === 'COAT') matchJobs = activeJobs.filter(j => j.coating && j.coating !== 'ไม่ทำ');
    else if (pp.id === 'DIE') matchJobs = activeJobs.filter(j => j.die_cut && j.die_cut !== 'ไม่ทำ');
    else if (pp.id === 'FOLD') matchJobs = activeJobs.filter(j => j.fold && j.fold !== 'ไม่ทำ');
    else matchJobs = activeJobs; // CUT = all jobs
    const totalSheets = matchJobs.reduce((s, j) => s + (parseInt(j.sheets_plan) || 0), 0);
    const hoursNeeded = Math.round((totalSheets / pp.speed) * 10) / 10;
    return { ...pp, jobCount: matchJobs.length, totalSheets, hoursNeeded };
  });

  const totalCapacity = machineLoad.reduce((s, m) => s + m.weeklyCapacity, 0);
  const totalLoad = machineLoad.reduce((s, m) => s + m.hoursNeeded, 0);
  const totalUtil = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;
  const overloaded = machineLoad.filter(m => m.utilization > 100);
  const atRisk = activeJobs.filter(j => {
    const daysLeft = Math.ceil((new Date(j.due_date).getTime() - Date.now()) / 86400000);
    return daysLeft <= 3;
  });

  const s = { card: { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' } as React.CSSProperties };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>⏳ กำลังโหลดข้อมูลกำลังผลิต...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1320', margin: 0 }}>🏭 Capacity Planner</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>วางแผนกำลังผลิต — คำนวณจากงาน {activeJobs.length} รายการที่ค้างอยู่จริง</p>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'กำลังผลิตรวม', value: `${totalCapacity} ชม./สัปดาห์`, bg: '#eff6ff', color: '#2563eb', icon: '⚡' },
          { label: 'โหลดงานจริง', value: `${Math.round(totalLoad * 10) / 10} ชม.`, bg: totalUtil > 100 ? '#fef2f2' : '#f0fdf4', color: totalUtil > 100 ? '#dc2626' : '#16a34a', icon: '📊' },
          { label: 'Utilization', value: `${totalUtil}%`, bg: totalUtil > 85 ? '#fef9c3' : '#f0fdf4', color: totalUtil > 85 ? '#a16207' : '#16a34a', icon: '📈' },
          { label: 'เครื่อง Overload', value: `${overloaded.length} เครื่อง`, bg: overloaded.length > 0 ? '#fef2f2' : '#f0fdf4', color: overloaded.length > 0 ? '#dc2626' : '#16a34a', icon: '⚠️' },
          { label: 'งานเร่งด่วน (≤3 วัน)', value: `${atRisk.length} งาน`, bg: atRisk.length > 0 ? '#fff7ed' : '#f0fdf4', color: atRisk.length > 0 ? '#ea580c' : '#16a34a', icon: '🔥' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: '12px', padding: '1.2rem', border: `1px solid ${k.bg}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Machine Capacity Bars */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>🖨️ กำลังผลิตเครื่องพิมพ์</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {machineLoad.map(m => (
            <div key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{m.icon}</span>
                  <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{m.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({m.type})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.jobs.length} งาน • {m.totalSheets.toLocaleString()} แผ่น</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: m.utilization > 100 ? '#dc2626' : m.utilization > 80 ? '#ea580c' : '#16a34a', background: m.utilization > 100 ? '#fef2f2' : m.utilization > 80 ? '#fff7ed' : '#f0fdf4', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                    {m.utilization}%
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: '24px', background: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${Math.min(m.utilization, 100)}%`, background: m.utilization > 100 ? '#ef4444' : m.utilization > 80 ? '#f59e0b' : m.color, borderRadius: '12px', transition: 'width 0.5s ease' }} />
                {m.utilization > 100 && (
                  <div style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '0.7rem', fontWeight: 800, color: '#dc2626' }}>OVERLOAD +{m.overloadHours}ชม.</div>
                )}
                {m.utilization <= 100 && m.freeHours > 0 && (
                  <div style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '0.7rem', fontWeight: 600, color: '#16a34a' }}>ว่าง {m.freeHours} ชม.</div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                <span>โหลด: {m.hoursNeeded} ชม.</span>
                <span>ความจุ: {m.weeklyCapacity} ชม./สัปดาห์</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Post-Press Load */}
      <div style={{ ...s.card, marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>✨ โหลดงานหลังพิมพ์ (Post-Press)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {postPressLoad.map(pp => (
            <div key={pp.id} style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.2rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ color: '#334155' }}>{pp.icon} {pp.name}</strong>
                <span style={{ fontSize: '0.8rem', color: pp.color, fontWeight: 700, background: `${pp.color}15`, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>{pp.jobCount} งาน</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{pp.totalSheets.toLocaleString()} แผ่น • ~{pp.hoursNeeded} ชม.</div>
            </div>
          ))}
        </div>
      </div>

      {/* Urgent Jobs Table */}
      {atRisk.length > 0 && (
        <div style={{ ...s.card, marginTop: '1.5rem', borderTop: '4px solid #ef4444' }}>
          <h3 style={{ margin: '0 0 1rem', fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>🔥 งานเร่งด่วน (ส่งภายใน 3 วัน)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['JOG No.', 'ชื่องาน', 'เครื่อง', 'แผ่น', 'สถานะ', 'กำหนดส่ง'].map(h => (
                  <th key={h} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.78rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atRisk.map(j => (
                <tr key={j.jog_no} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 700, color: '#1e293b' }}>#{j.jog_no}</td>
                  <td style={{ padding: '0.5rem', color: '#334155' }}>{j.job_name}</td>
                  <td style={{ padding: '0.5rem' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem' }}>{j.machine}</span></td>
                  <td style={{ padding: '0.5rem', color: '#64748b' }}>{(parseInt(j.sheets_plan)||0).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}><span style={{ background: j.status === 'printing' ? '#dbeafe' : '#fef3c7', color: j.status === 'printing' ? '#1e40af' : '#92400e', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem' }}>{j.status}</span></td>
                  <td style={{ padding: '0.5rem', color: '#ef4444', fontWeight: 700 }}>{new Date(j.due_date).toLocaleDateString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Jobs Queue */}
      <div style={{ ...s.card, marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>📋 คิวงานทั้งหมด ({activeJobs.length} งาน)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {activeJobs.map(j => (
            <div key={j.jog_no} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${MACHINE_CONFIG.find(m => m.id === j.machine)?.color || '#94a3b8'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <strong style={{ color: '#1e293b', fontSize: '0.9rem' }}>#{j.jog_no}</strong>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Due: {new Date(j.due_date).toLocaleDateString('th-TH')}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.3rem' }}>{j.job_name}</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>{j.machine}</span>
                <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{(parseInt(j.sheets_plan)||0).toLocaleString()} แผ่น</span>
                {j.coating && j.coating !== 'ไม่ทำ' && <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#4f46e5', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>เคลือบ</span>}
                {j.die_cut && j.die_cut !== 'ไม่ทำ' && <span style={{ fontSize: '0.65rem', background: '#ffedd5', color: '#ea580c', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>ไดคัท</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
