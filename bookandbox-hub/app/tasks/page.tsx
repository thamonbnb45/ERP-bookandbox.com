'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableCard, DetailPanel, TEAM, COLS, PRI, API, tm, dl } from './TaskBoard';
import type { Task } from './TaskBoard';

function DroppableColumn({ id, label, color, bg, tasks, onCardClick }: { id: string; label: string; color: string; bg: string; tasks: Task[]; onCardClick: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{ flex: 1, minWidth: 260, maxWidth: 340, background: isOver ? `${color}08` : bg, borderRadius: 12, padding: '10px 10px 60px', border: isOver ? `2px dashed ${color}` : '1px solid #e5e7eb', transition: 'all .2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '6px 8px', borderBottom: `3px solid ${color}`, borderRadius: '4px 4px 0 0' }}>
        <span style={{ fontWeight: 800, fontSize: '.85rem', color }}>{label}</span>
        <span style={{ background: color, color: '#fff', fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map(t => <SortableCard key={t.id} task={t} onClick={() => onCardClick(t)} />)}
      </SortableContext>
      {tasks.length === 0 && <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '.78rem', padding: '20px 0' }}>ลากงานมาวางที่นี่</div>}
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'board' | 'list' | 'calendar'>('board');
  const [fp, setFp] = useState('all');
  const [fs, setFs] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', detail: '', from_person: 'หน่ำ', to_person: '', priority: 'normal', due_date: '', image_url: '' });
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }));

  const load = useCallback(async () => {
    try { const r = await fetch(`${API}/api/tasks`); setTasks(await r.json()); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title || !form.to_person) return alert('กรอกชื่องานและผู้รับผิดชอบ');
    await fetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ title: '', detail: '', from_person: 'หน่ำ', to_person: '', priority: 'normal', due_date: '', image_url: '' }); load();
  };
  const del = async (id: string) => { if (!confirm('ลบงานนี้?')) return; await fetch(`${API}/api/tasks/${id}`, { method: 'DELETE' }); setSelected(null); load(); };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    if (!COLS.find(c => c.id === newStatus)) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await fetch(`${API}/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    load();
  };

  const filtered = tasks.filter(t => { if (fp !== 'all' && t.to_person !== fp && t.from_person !== fp) return false; if (fs !== 'all' && t.status !== fs) return false; return true; });
  const cnt = (s: string) => tasks.filter(t => t.status === s).length;
  const done = cnt('done'), total = tasks.length, pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const exportCSV = () => {
    const h = 'ชื่องาน,รายละเอียด,จาก,ผู้รับผิดชอบ,สถานะ,ความเร่ง,กำหนดส่ง,ติดปัญหา,สร้างเมื่อ';
    const rows = filtered.map(t => `"${t.title}","${t.detail}","${t.from_person}","${t.to_person}","${t.status}","${t.priority}","${t.due_date ? t.due_date.slice(0, 10) : ''}","${t.stuck_reason || ''}","${t.created_at ? t.created_at.slice(0, 10) : ''}"`);
    const blob = new Blob(['\uFEFF' + h + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '.85rem', marginBottom: 8, boxSizing: 'border-box' };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>⏳ Loading...</div>;

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>📋 Task Tracker <span style={{ fontSize: '.72rem', fontWeight: 500, color: '#64748b' }}>LIVE</span></h1>
          <p style={{ color: '#64748b', fontSize: '.76rem', margin: '2px 0 0' }}>ลากการ์ดเปลี่ยนสถานะ | ✅ {pct}% ({done}/{total})</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['board', 'list', 'calendar'] as const).map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', borderRadius: 8, border: view === v ? '2px solid #2563eb' : '1px solid #e5e7eb', background: view === v ? '#eff6ff' : '#fff', color: view === v ? '#2563eb' : '#64748b', fontWeight: 600, fontSize: '.76rem', cursor: 'pointer' }}>{v === 'board' ? '📊 Board' : v === 'list' ? '📋 List' : '📅 Calendar'}</button>)}
          <button onClick={() => setShowForm(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer' }}>＋ เพิ่มงาน</button>
          <button onClick={exportCSV} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #10b981', background: '#fff', color: '#10b981', fontWeight: 600, fontSize: '.76rem', cursor: 'pointer' }}>📄 CSV</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {COLS.map(c => <button key={c.id} onClick={() => setFs(fs === c.id ? 'all' : c.id)} style={{ padding: '4px 10px', borderRadius: 8, border: fs === c.id ? `2px solid ${c.color}` : '1px solid #e5e7eb', background: fs === c.id ? c.bg : '#fff', fontSize: '.74rem', fontWeight: 600, color: c.color, cursor: 'pointer' }}>{c.label} {cnt(c.id)}</button>)}
        <span style={{ color: '#e5e7eb' }}>|</span>
        {TEAM.map(t => <button key={t.id} onClick={() => setFp(fp === t.id ? 'all' : t.id)} style={{ padding: '3px 8px', borderRadius: 6, border: fp === t.id ? `2px solid ${t.color}` : '1px solid #e5e7eb', background: fp === t.id ? `${t.color}10` : '#fff', fontSize: '.72rem', cursor: 'pointer', fontWeight: fp === t.id ? 700 : 400 }}>{t.emoji} {t.name}</button>)}
        <button onClick={load} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: '.72rem', cursor: 'pointer' }}>🔄</button>
      </div>

      {/* Board View */}
      {view === 'board' && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 20 }}>
            {COLS.map(col => <DroppableColumn key={col.id} {...col} tasks={filtered.filter(t => t.status === col.id)} onCardClick={t => setSelected(t)} />)}
          </div>
        </DndContext>
      )}

      {/* List View */}
      {view === 'list' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              {['#', 'ความเร่ง', 'ชื่องาน', 'จาก', 'ผู้รับผิดชอบ', 'สถานะ', 'กำหนดส่ง'].map(h => <th key={h} style={{ padding: '8px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '.75rem' }}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map(t => { const pr = PRI[t.priority] || PRI.normal; const st = COLS.find(c => c.id === t.status) || COLS[0]; const to = tm(t.to_person); const f = tm(t.from_person); const d = dl(t.due_date); const od = d < 0 && t.status !== 'done';
              return <tr key={t.id} onClick={() => setSelected(t)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ padding: '6px 8px', color: '#94a3b8', fontSize: '.7rem' }}>#{t.id}</td>
                <td style={{ padding: '6px', color: pr.c, fontSize: '.7rem', fontWeight: 600 }}>{pr.l}</td>
                <td style={{ padding: '6px' }}><b>{t.title}</b>{t.detail && <><br /><span style={{ fontSize: '.7rem', color: '#94a3b8' }}>{t.detail.substring(0, 40)}</span></>}</td>
                <td style={{ padding: '6px', fontSize: '.78rem' }}>{f.emoji} {f.name}</td>
                <td style={{ padding: '6px', fontWeight: 700, color: to.color, fontSize: '.82rem' }}>{to.emoji} {to.name}</td>
                <td style={{ padding: '6px' }}><span style={{ padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color, fontSize: '.7rem', fontWeight: 600 }}>{st.label}</span></td>
                <td style={{ padding: '6px', color: od ? '#dc2626' : '#64748b', fontWeight: od ? 700 : 400, fontSize: '.78rem' }}>{t.due_date ? t.due_date.slice(0, 10) : '-'}{od && ' ⏰'}</td>
              </tr>; })}</tbody>
          </table>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (() => {
        const year = calMonth.getFullYear(), month = calMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date().toISOString().split('T')[0];
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        while (cells.length % 7 !== 0) cells.push(null);
        const mName = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>◀</button>
            <span style={{ fontWeight: 700 }}>{mName[month]} {year + 543}</span>
            <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>▶</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: '.75rem', color: d === 'อา' || d === 'ส' ? '#dc2626' : '#64748b', padding: 4 }}>{d}</div>)}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ background: '#fafafa', borderRadius: 6, minHeight: 70 }} />;
              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dt = filtered.filter(t => t.due_date && t.due_date.slice(0, 10) === ds);
              const isT = ds === today;
              return <div key={ds} style={{ background: isT ? '#eff6ff' : '#fff', borderRadius: 6, padding: 3, border: isT ? '2px solid #2563eb' : '1px solid #f1f5f9', minHeight: 70 }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: isT ? '#1d4ed8' : '#64748b', marginBottom: 2 }}>{day} {isT && <span style={{ background: '#2563eb', color: '#fff', padding: '0 3px', borderRadius: 3, fontSize: '.55rem' }}>วันนี้</span>}</div>
                {dt.map(t => { const to = tm(t.to_person); const st = COLS.find(c => c.id === t.status) || COLS[0];
                  return <div key={t.id} onClick={() => setSelected(t)} style={{ fontSize: '.6rem', padding: '1px 3px', borderRadius: 4, background: st.bg, marginBottom: 1, cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}><b style={{ color: to.color }}>{to.emoji}</b> {t.title.substring(0, 10)}</div>; })}
              </div>;
            })}
          </div>
        </div>; })()}

      {/* Detail Panel */}
      {selected && <DetailPanel task={selected} onClose={() => { setSelected(null); load(); }} onUpdate={t => { setSelected(t); setTasks(prev => prev.map(p => p.id === t.id ? t : p)); }} onDelete={() => del(selected.id)} />}

      {/* New Task Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>＋ เพิ่มงานใหม่</h3>
            <input placeholder="ชื่องาน *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} />
            <input placeholder="รายละเอียด" value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} style={inp} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <select value={form.from_person} onChange={e => setForm({ ...form, from_person: e.target.value })} style={inp}><option value="">— จาก —</option>{TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</select>
              <select value={form.to_person} onChange={e => setForm({ ...form, to_person: e.target.value })} style={inp}><option value="">— ผู้รับผิดชอบ * —</option>{TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inp}>{Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={inp} />
            </div>
            <input placeholder="📎 ลิงก์รูปภาพ (ไม่บังคับ)" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={{ ...inp, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={save} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>💾 บันทึก</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
