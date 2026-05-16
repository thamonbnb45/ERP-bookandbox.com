"use client";
import { useState, useEffect } from 'react';

const TEAM = [
  { id: 'nam', name: 'หน่ำ', role: 'CEO', color: '#dc2626', emoji: '👔' },
  { id: 'sun', name: 'ซัน', role: 'GM', color: '#8b5cf6', emoji: '🎯' },
  { id: 'kwang', name: 'กวาง', role: 'Sales Lead', color: '#f59e0b', emoji: '💼' },
  { id: 'big', name: 'บิ๊ก', role: 'Production Lead', color: '#3b82f6', emoji: '🏭' },
  { id: 'or', name: 'อ้อ', role: 'บัญชี/จัดซื้อ/จัดส่ง', color: '#10b981', emoji: '📦' },
  { id: 'sa', name: 'ซ่า', role: 'HR', color: '#ec4899', emoji: '👥' },
  { id: 'nueng', name: 'หนึ่ง', role: 'IT/AI/QA', color: '#06b6d4', emoji: '💻' },
];

type Task = {
  id: string; title: string; detail: string; from: string; to: string;
  status: 'pending' | 'doing' | 'stuck' | 'done';
  priority: 'urgent' | 'high' | 'normal';
  createdAt: string; dueDate: string; stuckReason?: string;
};

const STATUS_MAP = {
  pending: { label: '📋 รอรับ', bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
  doing: { label: '⚙️ กำลังทำ', bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  stuck: { label: '🚨 ติดปัญหา', bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  done: { label: '✅ เสร็จแล้ว', bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
};

const PRIORITY_MAP = {
  urgent: { label: '🔥 ด่วนมาก', color: '#dc2626' },
  high: { label: '⚡ สำคัญ', color: '#f59e0b' },
  normal: { label: '📌 ปกติ', color: '#64748b' },
};

const today = new Date().toISOString().split('T')[0];

const MOCK_TASKS: Task[] = [
  { id: 'T001', title: 'ซื้อกระดาษ Art Card 260g', detail: '100 รีม สำหรับงาน Salonpas', from: 'big', to: 'or', status: 'stuck', priority: 'urgent', createdAt: '2026-05-14', dueDate: '2026-05-16', stuckReason: 'ร้านค้าแจ้งหมดสต็อก รออีก 2 วัน' },
  { id: 'T002', title: 'โอนเงินค่าเพลท', detail: 'บ.ฟูจิ ใบแจ้งหนี้ #INV-2605', from: 'nam', to: 'or', status: 'pending', priority: 'urgent', createdAt: '2026-05-16', dueDate: '2026-05-16' },
  { id: 'T003', title: 'แก้ไขไฟล์งาน PTT ป้ายโปร', detail: 'ลูกค้าส่งไฟล์ใหม่ แก้โลโก้', from: 'kwang', to: 'nueng', status: 'doing', priority: 'high', createdAt: '2026-05-15', dueDate: '2026-05-17' },
  { id: 'T004', title: 'เช็คสต็อกหมึก Pantone 185C', detail: 'งาน Chevrolet ใช้สีพิเศษ', from: 'big', to: 'or', status: 'done', priority: 'normal', createdAt: '2026-05-13', dueDate: '2026-05-15' },
  { id: 'T005', title: 'ซ่อม SM102F ลูกปืนแตก', detail: 'ซันแจ้งในกลุ่ม เปลี่ยน 1 ตัว เหลืออีก 1', from: 'sun', to: 'big', status: 'doing', priority: 'urgent', createdAt: '2026-05-16', dueDate: '2026-05-17' },
  { id: 'T006', title: 'ส่งใบเสนอราคางาน BNI', detail: 'กล่อง 500 ใบ ลูกค้ารอ', from: 'nam', to: 'kwang', status: 'pending', priority: 'high', createdAt: '2026-05-16', dueDate: '2026-05-18' },
  { id: 'T007', title: 'สัมภาษณ์พนักงานใหม่ ช่างพิมพ์', detail: 'นัดวันจันทร์ 10:00', from: 'sun', to: 'sa', status: 'doing', priority: 'normal', createdAt: '2026-05-14', dueDate: '2026-05-19' },
  { id: 'T008', title: 'อัปเดตระบบ ERP หน้า Capacity', detail: 'รอข้อมูลจากบิ๊ก', from: 'nam', to: 'nueng', status: 'doing', priority: 'high', createdAt: '2026-05-16', dueDate: '2026-05-20' },
];

export default function TaskTracker() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [view, setView] = useState<'board' | 'list' | 'calendar'>('board');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filtered = tasks.filter(t => {
    if (filterPerson !== 'all' && t.to !== filterPerson && t.from !== filterPerson) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const getTeam = (id: string) => TEAM.find(t => t.id === id) || TEAM[0];
  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  const stuckCount = tasks.filter(t => t.status === 'stuck').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const overdueCount = tasks.filter(t => t.status !== 'done' && daysLeft(t.dueDate) < 0).length;
  const todayDue = tasks.filter(t => t.status !== 'done' && t.dueDate === today).length;

  if (!mounted) return null;

  const card = (t: Task) => {
    const st = STATUS_MAP[t.status];
    const pr = PRIORITY_MAP[t.priority];
    const dl = daysLeft(t.dueDate);
    const overdue = dl < 0 && t.status !== 'done';
    const from = getTeam(t.from);
    const to = getTeam(t.to);
    return (
      <div key={t.id} style={{ background: 'white', borderRadius: '12px', padding: '1rem', border: `1px solid ${overdue ? '#fca5a5' : '#e2e8f0'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderLeft: `4px solid ${overdue ? '#dc2626' : pr.color}`, transition: 'transform 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', color: pr.color, fontWeight: 700 }}>{pr.label}</span>
          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', background: st.bg, color: st.text, fontWeight: 600, border: `1px solid ${st.border}` }}>{st.label}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', marginBottom: '0.3rem' }}>{t.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{t.detail}</div>
        {t.status === 'stuck' && t.stuckReason && (
          <div style={{ fontSize: '0.72rem', color: '#dc2626', background: '#fef2f2', padding: '0.4rem', borderRadius: '6px', marginBottom: '0.5rem', fontWeight: 600 }}>🚨 {t.stuckReason}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
          <div><span style={{ color: from.color }}>{from.emoji}{from.name}</span> → <span style={{ color: to.color, fontWeight: 700 }}>{to.emoji}{to.name}</span></div>
          <div style={{ color: overdue ? '#dc2626' : dl <= 1 ? '#f59e0b' : '#64748b', fontWeight: overdue ? 700 : 400 }}>
            {overdue ? `⏰ เกิน ${Math.abs(dl)} วัน!` : dl === 0 ? '📅 วันนี้!' : `${dl} วัน`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0B1320', margin: 0 }}>📋 Task Tracker</h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>ติดตามงาน — ใครสั่ง ใครทำ ติดอะไร</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['board', 'list', 'calendar'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: view === v ? '2px solid #2EC4B6' : '1px solid #e2e8f0', background: view === v ? 'rgba(46,196,182,0.1)' : 'white', color: view === v ? '#0d9488' : '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
              {v === 'board' ? '📊 Board' : v === 'list' ? '📋 List' : '📅 Calendar'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: '🚨 ติดปัญหา', val: stuckCount, bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
          { label: '⏰ เกินกำหนด', val: overdueCount, bg: overdueCount > 0 ? '#fef2f2' : '#f0fdf4', color: overdueCount > 0 ? '#dc2626' : '#15803d', border: overdueCount > 0 ? '#fecaca' : '#bbf7d0' },
          { label: '📋 รอรับงาน', val: pendingCount, bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
          { label: '📅 Due วันนี้', val: todayDue, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
          { label: '✅ เสร็จแล้ว', val: tasks.filter(t => t.status === 'done').length, bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: '12px', padding: '0.85rem', border: `1px solid ${k.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: '0.72rem', color: k.color, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>กรอง:</span>
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>
          <option value="all">👥 ทุกคน</option>
          {TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name} ({t.role})</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>
          <option value="all">ทุกสถานะ</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Board View */}
      {view === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          {(Object.keys(STATUS_MAP) as Array<keyof typeof STATUS_MAP>).map(status => {
            const st = STATUS_MAP[status];
            const items = filtered.filter(t => t.status === status);
            return (
              <div key={status} style={{ background: st.bg, borderRadius: '14px', padding: '0.75rem', border: `1px solid ${st.border}`, minHeight: '300px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: st.text, marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{st.label}</span>
                  <span style={{ background: 'rgba(0,0,0,0.08)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {items.length === 0 && <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>ไม่มีงาน</div>}
                  {items.map(t => card(t))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['', 'งาน', 'จาก', 'ถึง', 'สถานะ', 'กำหนด', 'ปัญหา'].map(h => (
                  <th key={h} style={{ padding: '0.6rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => {
                const ps = { urgent: 0, high: 1, normal: 2 };
                return ps[a.priority] - ps[b.priority];
              }).map((t, i) => {
                const dl = daysLeft(t.dueDate);
                const overdue = dl < 0 && t.status !== 'done';
                const st = STATUS_MAP[t.status];
                const pr = PRIORITY_MAP[t.priority];
                const from = getTeam(t.from);
                const to = getTeam(t.to);
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: overdue ? '#fef2f2' : i % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={{ padding: '0.5rem', color: pr.color, fontSize: '0.7rem', fontWeight: 700 }}>{pr.label.split(' ')[0]}</td>
                    <td style={{ padding: '0.5rem' }}><strong>{t.title}</strong><br /><span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.detail}</span></td>
                    <td style={{ padding: '0.5rem', color: from.color, fontWeight: 600 }}>{from.emoji}{from.name}</td>
                    <td style={{ padding: '0.5rem', color: to.color, fontWeight: 700 }}>{to.emoji}{to.name}</td>
                    <td style={{ padding: '0.5rem' }}><span style={{ padding: '0.15rem 0.4rem', borderRadius: '6px', background: st.bg, color: st.text, fontSize: '0.72rem', fontWeight: 600 }}>{st.label}</span></td>
                    <td style={{ padding: '0.5rem', color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? 700 : 400 }}>{t.dueDate}{overdue && ' ⏰'}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.72rem', color: '#dc2626' }}>{t.stuckReason || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (() => {
        const days: string[] = [];
        for (let i = -1; i < 13; i++) { const d = new Date(); d.setDate(d.getDate() + i); days.push(d.toISOString().split('T')[0]); }
        const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {days.map(d => {
              const dayTasks = filtered.filter(t => t.dueDate === d && t.status !== 'done');
                const isToday = d === today;
              const dow = new Date(d).getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <div key={d} style={{ background: isToday ? '#eff6ff' : isWeekend ? '#fafafa' : 'white', borderRadius: '10px', padding: '0.6rem', border: isToday ? '2px solid #3b82f6' : '1px solid #e2e8f0', minHeight: '120px' }}>
                  <div style={{ fontSize: '0.72rem', color: isToday ? '#1d4ed8' : '#64748b', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {dayNames[dow]} {new Date(d).getDate()}/{new Date(d).getMonth() + 1}
                    {isToday && <span style={{ background: '#3b82f6', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px', marginLeft: '0.3rem', fontSize: '0.6rem' }}>วันนี้</span>}
                  </div>
                  {dayTasks.length === 0 && <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>—</div>}
                  {dayTasks.map(t => {
                    const pr = PRIORITY_MAP[t.priority];
                    const to = getTeam(t.to);
                    return (
                      <div key={t.id} style={{ fontSize: '0.68rem', padding: '0.25rem 0.4rem', borderRadius: '5px', background: t.status === 'stuck' ? '#fef2f2' : '#f8fafc', marginBottom: '0.3rem', borderLeft: `3px solid ${pr.color}` }}>
                        <span style={{ color: to.color, fontWeight: 600 }}>{to.emoji}</span> {t.title.substring(0, 18)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
