"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Machine Capacity Config (มาตรฐานอุตสาหกรรม — ปรับภายหลังได้) ──
const MACHINES = [
  { id: 'SM74F', name: 'SM74F (Heidelberg)', type: 'offset', speed: 8000, hoursPerDay: 8, daysPerWeek: 6, color: '#3b82f6', icon: '🖨️', status: 'active' as const },
  { id: 'SM102F', name: 'SM102F (Heidelberg)', type: 'offset', speed: 10000, hoursPerDay: 8, daysPerWeek: 6, color: '#8b5cf6', icon: '🖨️', status: 'maintenance' as const },
  { id: 'KMC12000', name: 'Konica C12000 (Digital)', type: 'digital', speed: 4000, hoursPerDay: 8, daysPerWeek: 6, color: '#06b6d4', icon: '🖥️', status: 'active' as const },
  { id: 'KMC4070', name: 'Konica C4070 (Digital)', type: 'digital', speed: 2000, hoursPerDay: 8, daysPerWeek: 6, color: '#0ea5e9', icon: '🖥️', status: 'active' as const },
  { id: 'Cutter', name: 'เครื่องตัด (Polar)', type: 'postpress', speed: 15000, hoursPerDay: 8, daysPerWeek: 6, color: '#eab308', icon: '✂️', status: 'active' as const },
  { id: 'Coating', name: 'เครื่องเคลือบ', type: 'postpress', speed: 6000, hoursPerDay: 8, daysPerWeek: 6, color: '#14b8a6', icon: '✨', status: 'active' as const },
  { id: 'Diecut', name: 'ปั๊มไดคัท/ฟอยล์', type: 'postpress', speed: 3000, hoursPerDay: 8, daysPerWeek: 6, color: '#f97316', icon: '🔲', status: 'active' as const },
  { id: 'Folder', name: 'เครื่องพับ', type: 'postpress', speed: 5000, hoursPerDay: 8, daysPerWeek: 6, color: '#ef4444', icon: '📐', status: 'active' as const },
  { id: 'Stitcher', name: 'เครื่องเก็บเย็บ', type: 'binding', speed: 3000, hoursPerDay: 8, daysPerWeek: 6, color: '#ec4899', icon: '📖', status: 'active' as const },
];

// ── Mock: งานที่ค้างอยู่ในระบบ (จะเชื่อม JO จริงภายหลัง) ──
const PENDING_JOBS = [
  { id: 'JOG-2605-001', name: 'Annual Report 2026 BnB', qty: 3000, machine: 'SM74F', steps: ['printing','coating','folding','stitching'], dueDate: '2026-05-20', sheetsPerUnit: 20, status: 'printing' },
  { id: 'JOG-2605-002', name: 'Product Brochure Q3', qty: 5000, machine: 'SM74F', steps: ['printing','coating','diecut'], dueDate: '2026-05-22', sheetsPerUnit: 2, status: 'queued' },
  { id: 'JOG-2605-003', name: 'กล่องสินค้า Premium Box', qty: 10000, machine: 'SM102F', steps: ['printing','coating','diecut','glue'], dueDate: '2026-05-19', sheetsPerUnit: 1, status: 'queued' },
  { id: 'JOG-2605-004', name: 'นามบัตร Team 2026', qty: 1000, machine: 'KMC12000', steps: ['printing','cutting'], dueDate: '2026-05-18', sheetsPerUnit: 1, status: 'printing' },
  { id: 'JOG-2605-005', name: 'ใบปลิว Summer Sale', qty: 20000, machine: 'SM74F', steps: ['printing','coating'], dueDate: '2026-05-25', sheetsPerUnit: 1, status: 'queued' },
  { id: 'JOG-2605-006', name: 'แคตตาล็อก Furniture', qty: 2000, machine: 'SM102F', steps: ['printing','coating','folding','stitching'], dueDate: '2026-05-28', sheetsPerUnit: 32, status: 'queued' },
  { id: 'JOG-2605-007', name: 'Calendar 2027', qty: 5000, machine: 'SM74F', steps: ['printing','diecut','binding'], dueDate: '2026-05-30', sheetsPerUnit: 14, status: 'queued' },
  { id: 'JOG-2605-008', name: 'สติกเกอร์ QR Code', qty: 20000, machine: 'KMC12000', steps: ['printing','diecut'], dueDate: '2026-05-21', sheetsPerUnit: 1, status: 'queued' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#dcfce7', text: '#15803d', label: '✅ พร้อมใช้งาน' },
  maintenance: { bg: '#fef9c3', text: '#a16207', label: '🔧 กำลังซ่อม' },
  offline: { bg: '#fee2e2', text: '#b91c1c', label: '❌ ปิดใช้งาน' },
};

export default function CapacityPlanner() {
  const [viewWeek, setViewWeek] = useState(0); // 0=this week, 1=next week
  const [machines, setMachines] = useState(MACHINES);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const weekLabel = viewWeek === 0 ? 'สัปดาห์นี้' : 'สัปดาห์หน้า';

  // Calculate load per machine (hours needed)
  const machineLoad = machines.map(m => {
    const jobs = PENDING_JOBS.filter(j => j.machine === m.id && j.status !== 'completed');
    const totalSheets = jobs.reduce((sum, j) => sum + (j.qty * j.sheetsPerUnit), 0);
    const hoursNeeded = totalSheets / m.speed;
    const weeklyCapacity = m.hoursPerDay * m.daysPerWeek;
    const otCapacity = (m.hoursPerDay + 4) * m.daysPerWeek; // +4hr OT per day
    const utilization = Math.round((hoursNeeded / weeklyCapacity) * 100);
    const freeHours = Math.max(0, weeklyCapacity - hoursNeeded);
    const overloadHours = Math.max(0, hoursNeeded - weeklyCapacity);
    return { ...m, jobs, totalSheets, hoursNeeded: Math.round(hoursNeeded * 10) / 10, weeklyCapacity, otCapacity, utilization, freeHours: Math.round(freeHours * 10) / 10, overloadHours: Math.round(overloadHours * 10) / 10 };
  });

  const totalCapacity = machineLoad.reduce((s, m) => s + m.weeklyCapacity, 0);
  const totalLoad = machineLoad.reduce((s, m) => s + m.hoursNeeded, 0);
  const totalUtil = Math.round((totalLoad / totalCapacity) * 100);
  const overloaded = machineLoad.filter(m => m.utilization > 100);
  const atRisk = PENDING_JOBS.filter(j => {
    const daysLeft = Math.ceil((new Date(j.dueDate).getTime() - Date.now()) / 86400000);
    return daysLeft <= 3 && j.status !== 'completed';
  });
  const activeMachines = machines.filter(m => m.status === 'active').length;

  const card = (bg: string, border: string): React.CSSProperties => ({ background: bg, borderRadius: '16px', padding: '1.25rem', border: `1px solid ${border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' });

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1320', margin: 0 }}>🏭 Capacity Planner</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>วางแผนกำลังผลิต — รู้ก่อนรับงาน ไม่ต้องเลื่อนส่ง</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[0, 1].map(w => (
            <button key={w} onClick={() => setViewWeek(w)} style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: viewWeek === w ? '2px solid #2EC4B6' : '1px solid #e2e8f0',
              background: viewWeek === w ? 'rgba(46,196,182,0.1)' : 'white', color: viewWeek === w ? '#0d9488' : '#64748b',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            }}>{w === 0 ? '📅 สัปดาห์นี้' : '📅 สัปดาห์หน้า'}</button>
          ))}
          <Link href="/production" style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#0B1320', color: 'white', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>← Production Board</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={card('#f0fdf4', '#bbf7d0')}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>กำลังผลิตรวม ({weekLabel})</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d' }}>{totalCapacity} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>ชม.</span></div>
          <div style={{ fontSize: '0.72rem', color: '#22c55e' }}>เครื่องพร้อม {activeMachines}/{machines.length} เครื่อง</div>
        </div>
        <div style={card('#eff6ff', '#bfdbfe')}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>โหลดงานรวม</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8' }}>{Math.round(totalLoad)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>ชม.</span></div>
          <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>{PENDING_JOBS.length} งานใน Pipeline</div>
        </div>
        <div style={card(totalUtil > 100 ? '#fef2f2' : totalUtil > 80 ? '#fffbeb' : '#f0fdf4', totalUtil > 100 ? '#fecaca' : totalUtil > 80 ? '#fde68a' : '#bbf7d0')}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>อัตราใช้งาน (Utilization)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: totalUtil > 100 ? '#dc2626' : totalUtil > 80 ? '#d97706' : '#15803d' }}>{totalUtil}%</div>
          <div style={{ fontSize: '0.72rem', color: totalUtil > 100 ? '#ef4444' : '#64748b' }}>{totalUtil > 100 ? '⚠️ เกินกำลัง!' : totalUtil > 80 ? '⚡ ใกล้เต็ม' : '✅ ยังรับได้'}</div>
        </div>
        <div style={card(atRisk.length > 0 ? '#fef2f2' : '#f8fafc', atRisk.length > 0 ? '#fecaca' : '#e2e8f0')}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>⚠️ เสี่ยงเลื่อนส่ง</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: atRisk.length > 0 ? '#dc2626' : '#15803d' }}>{atRisk.length} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>งาน</span></div>
          <div style={{ fontSize: '0.72rem', color: atRisk.length > 0 ? '#ef4444' : '#22c55e' }}>{atRisk.length > 0 ? 'Due ภายใน 3 วัน!' : 'ไม่มีงานเสี่ยง'}</div>
        </div>
      </div>

      {/* Machine Capacity Bars */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B1320', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📊 กำลังผลิตแยกเครื่อง — {weekLabel}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {machineLoad.map(m => {
            const pct = Math.min(m.utilization, 150);
            const barColor = m.status === 'maintenance' ? '#fbbf24' : m.utilization > 100 ? '#ef4444' : m.utilization > 80 ? '#f59e0b' : '#22c55e';
            const st = STATUS_COLORS[m.status];
            return (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 120px', gap: '1rem', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{m.icon} {m.id}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.name}</div>
                  <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: st.bg, color: st.text, fontWeight: 600 }}>{st.label}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.25rem' }}>
                    <span>{m.hoursNeeded} / {m.weeklyCapacity} ชม. ({m.jobs.length} งาน)</span>
                    <span style={{ fontWeight: 700, color: barColor }}>{m.utilization}%</span>
                  </div>
                  <div style={{ height: '20px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: '10px', transition: 'width 0.5s ease' }} />
                    {m.utilization > 100 && (
                      <div style={{ position: 'absolute', left: `${100 * (100 / pct)}%`, top: 0, bottom: 0, width: '2px', background: '#dc2626' }} />
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {m.utilization > 100 ? (
                    <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700 }}>ล้น +{m.overloadHours} ชม.</div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 700 }}>ว่าง {m.freeHours} ชม.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Risk Alert */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '3px solid #ef4444' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', margin: '0 0 0.75rem' }}>🚨 งานเสี่ยงเลื่อนส่ง</h2>
          {atRisk.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#22c55e' }}>
              <div style={{ fontSize: '2rem' }}>✅</div>
              <div style={{ fontWeight: 600 }}>ไม่มีงานเสี่ยงตอนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {atRisk.map(j => {
                const daysLeft = Math.ceil((new Date(j.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={j.id} style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{j.id}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                        ⏰ เหลือ {daysLeft} วัน
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>{j.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>เครื่อง: {j.machine} | จำนวน: {j.qty.toLocaleString()} | Due: {j.dueDate}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* OT Recommendation */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '3px solid #f59e0b' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706', margin: '0 0 0.75rem' }}>⚡ แนะนำ OT / จัดสรรงาน</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {overloaded.length > 0 ? overloaded.map(m => (
              <div key={m.id} style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>{m.icon} {m.id} — ล้น {m.overloadHours} ชม.</div>
                <div style={{ fontSize: '0.78rem', color: '#a16207', marginTop: '0.3rem' }}>
                  💡 ต้องทำ OT อีก {m.overloadHours} ชม. (≈ {Math.ceil(m.overloadHours / 4)} วัน OT 4 ชม.)
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                  ต้นทุน OT ≈ ฿{(m.overloadHours * 85 * 2).toLocaleString()} (85 บ./ชม. x 2 คน)
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#22c55e' }}>
                <div style={{ fontSize: '2rem' }}>👍</div>
                <div style={{ fontWeight: 600 }}>ไม่มีเครื่องไหนล้น — ยังไม่ต้อง OT</div>
              </div>
            )}
            {machines.filter(m => m.status === 'maintenance').map(m => (
              <div key={m.id} style={{ padding: '0.75rem', background: '#fef9c3', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>🔧 {m.id} กำลังซ่อม</div>
                <div style={{ fontSize: '0.78rem', color: '#a16207', marginTop: '0.2rem' }}>งานที่ assign เครื่องนี้ต้องย้ายหรือรอ</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Table */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B1320', margin: '0 0 0.75rem' }}>📋 งานทั้งหมดใน Pipeline ({PENDING_JOBS.length} งาน)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['JOG No.', 'ชื่องาน', 'เครื่อง', 'จำนวน', 'แผ่นพิมพ์รวม', 'ใช้เวลา (ชม.)', 'Due Date', 'สถานะ'].map(h => (
                  <th key={h} style={{ padding: '0.6rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PENDING_JOBS.map((j, i) => {
                const mc = machines.find(m => m.id === j.machine);
                const totalSheets = j.qty * j.sheetsPerUnit;
                const hours = mc ? Math.round((totalSheets / mc.speed) * 10) / 10 : 0;
                const daysLeft = Math.ceil((new Date(j.dueDate).getTime() - Date.now()) / 86400000);
                const isUrgent = daysLeft <= 3;
                return (
                  <tr key={j.id} style={{ borderBottom: '1px solid #f1f5f9', background: isUrgent ? '#fef2f2' : i % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#2EC4B6' }}>{j.id}</td>
                    <td style={{ padding: '0.6rem', fontWeight: 600, color: '#1e293b' }}>{j.name}</td>
                    <td style={{ padding: '0.6rem' }}><span style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', background: mc ? mc.color + '15' : '#f1f5f9', color: mc?.color || '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>{j.machine}</span></td>
                    <td style={{ padding: '0.6rem', fontWeight: 600 }}>{j.qty.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem', color: '#64748b' }}>{totalSheets.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem', fontWeight: 700, color: '#3b82f6' }}>{hours}</td>
                    <td style={{ padding: '0.6rem', fontWeight: isUrgent ? 700 : 400, color: isUrgent ? '#dc2626' : '#64748b' }}>{j.dueDate} {isUrgent && '🔥'}</td>
                    <td style={{ padding: '0.6rem' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                        background: j.status === 'printing' ? '#dbeafe' : j.status === 'queued' ? '#f1f5f9' : '#dcfce7',
                        color: j.status === 'printing' ? '#1d4ed8' : j.status === 'queued' ? '#64748b' : '#15803d',
                      }}>{j.status === 'printing' ? '🖨️ กำลังพิมพ์' : j.status === 'queued' ? '📅 รอผลิต' : '✅ เสร็จ'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
