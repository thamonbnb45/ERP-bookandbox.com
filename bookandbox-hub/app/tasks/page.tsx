"use client";
import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '' : 'https://erp-bookandboxcom-production.up.railway.app';
const TEAM = [
  { id: 'หน่ำ', name: 'หน่ำ', role: 'CEO', color: '#dc2626', emoji: '👔' },
  { id: 'ซัน', name: 'ซัน', role: 'GM', color: '#8b5cf6', emoji: '🎯' },
  { id: 'กวาง', name: 'กวาง', role: 'Sales', color: '#f59e0b', emoji: '💼' },
  { id: 'บิ๊ก', name: 'บิ๊ก', role: 'ผลิต', color: '#3b82f6', emoji: '🏭' },
  { id: 'อ้อ', name: 'อ้อ', role: 'บัญชี/จัดซื้อ', color: '#10b981', emoji: '📦' },
  { id: 'ซ่า', name: 'ซ่า', role: 'HR', color: '#ec4899', emoji: '👥' },
  { id: 'หนึ่ง', name: 'หนึ่ง', role: 'IT/QA', color: '#06b6d4', emoji: '💻' },
];
const STATUS = { pending: { l: '📋 รอรับ', bg: '#f1f5f9', c: '#64748b', b: '#cbd5e1' }, doing: { l: '⚙️ กำลังทำ', bg: '#dbeafe', c: '#1d4ed8', b: '#93c5fd' }, stuck: { l: '🚨 ติดปัญหา', bg: '#fef2f2', c: '#dc2626', b: '#fca5a5' }, done: { l: '✅ เสร็จ', bg: '#f0fdf4', c: '#15803d', b: '#86efac' } };
const PRI = { urgent: { l: '🔥 ด่วนมาก', c: '#dc2626' }, high: { l: '⚡ สำคัญ', c: '#f59e0b' }, normal: { l: '📌 ปกติ', c: '#64748b' } };
type Task = { id: string; title: string; detail: string; from_person: string; to_person: string; status: string; priority: string; due_date: string; stuck_reason?: string; created_at: string; };
const tm = (id: string) => TEAM.find(t => t.id === id) || { id, name: id, role: '', color: '#888', emoji: '👤' };
const dl = (d: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 999;

export default function TaskTracker() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fp, setFp] = useState('all');
  const [fs, setFs] = useState('all');
  const [view, setView] = useState<'board'|'list'|'calendar'>('board');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [selectedTask, setSelectedTask] = useState<Task|null>(null);
  const [form, setForm] = useState({ title: '', detail: '', from_person: 'หน่ำ', to_person: '', priority: 'normal', due_date: '' });
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAs, setCommentAs] = useState('หน่ำ');

  const load = useCallback(async () => {
    try { const r = await fetch(`${API}/api/tasks`); setTasks(await r.json()); } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title || !form.to_person) return alert('กรุณาใส่ชื่องาน + ผู้รับผิดชอบ');
    if (editId) {
      await fetch(`${API}/api/tasks/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await fetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setShowForm(false); setEditId(null); setForm({ title: '', detail: '', from_person: 'หน่ำ', to_person: '', priority: 'normal', due_date: '' }); load();
  };
  const setStatus = async (id: string, status: string, stuck_reason?: string) => {
    const body: any = { status };
    if (stuck_reason) body.stuck_reason = stuck_reason;
    await fetch(`${API}/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); load();
  };
  const del = async (id: string) => { if (!confirm('ลบงานนี้?')) return; await fetch(`${API}/api/tasks/${id}`, { method: 'DELETE' }); load(); };
  const loadComments = async (id: string) => { try { const r = await fetch(`${API}/api/tasks/${id}/comments`); setComments(await r.json()); } catch(e) { console.error(e); } };
  const addComment = async (taskId: string) => { if (!newComment.trim()) return; await fetch(`${API}/api/tasks/${taskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: commentAs, content: newComment }) }); setNewComment(''); loadComments(taskId); };

  const filtered = tasks.filter(t => { if (fp !== 'all' && t.to_person !== fp && t.from_person !== fp) return false; if (fs !== 'all' && t.status !== fs) return false; return true; });
  const cnt = (s: string) => tasks.filter(t => t.status === s).length;
  const overdue = tasks.filter(t => t.status !== 'done' && dl(t.due_date) < 0).length;
  const todayDue = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date.slice(0,10) === new Date().toISOString().slice(0,10)).length;
  const total = tasks.length; const done = cnt('done');
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const card = (t: Task) => {
    const st = (STATUS as any)[t.status] || STATUS.pending;
    const pr = (PRI as any)[t.priority] || PRI.normal;
    const d = dl(t.due_date); const od = d < 0 && t.status !== 'done';
    const f = tm(t.from_person), to = tm(t.to_person);
    return (
      <div key={t.id} style={{ background: '#fff', borderRadius: 12, padding: '0.8rem', border: `1px solid ${od ? '#fca5a5' : '#e2e8f0'}`, borderLeft: `4px solid ${od ? '#dc2626' : pr.c}`, marginBottom: '0.5rem', transition: 'transform .15s', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.68rem', color: pr.c, fontWeight: 700 }}>{pr.l}</span>
          <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 6, background: st.bg, color: st.c, fontWeight: 600, border: `1px solid ${st.b}` }}>{st.l}</span>
        </div>
        <div onClick={() => { setSelectedTask(t); loadComments(t.id); }} style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 3, textDecoration: 'underline', textDecorationColor: '#e2e8f0' }}>{t.title}</div>
        {t.detail && <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6 }}>{t.detail}</div>}
        {t.status === 'stuck' && t.stuck_reason && <div style={{ fontSize: '0.7rem', color: '#dc2626', background: '#fef2f2', padding: 4, borderRadius: 6, marginBottom: 6, fontWeight: 600 }}>🚨 {t.stuck_reason}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '4px 8px', background: `${to.color}10`, borderRadius: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>{to.emoji}</span>
          <div><div style={{ fontSize: '0.95rem', fontWeight: 800, color: to.color }}>{to.name}</div><div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>จาก {f.name}</div></div>
          <div style={{ marginLeft: 'auto', color: od ? '#dc2626' : d <= 1 ? '#f59e0b' : '#64748b', fontWeight: od ? 700 : 400, fontSize: '0.72rem' }}>{!t.due_date ? '' : od ? `⏰ เกิน ${Math.abs(d)} วัน!` : d === 0 ? '📅 วันนี้!' : `${d} วัน`}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {t.status === 'pending' && <button onClick={() => setStatus(t.id, 'doing')} style={btn('#3b82f6')}>▶ เริ่มทำ</button>}
          {t.status === 'doing' && <button onClick={() => setStatus(t.id, 'done')} style={btn('#15803d')}>✅ เสร็จ</button>}
          {t.status === 'doing' && <button onClick={() => { const r = prompt('ติดปัญหาอะไร?'); if (r) setStatus(t.id, 'stuck', r); }} style={btn('#dc2626')}>🚨 ติด</button>}
          {t.status === 'stuck' && <button onClick={() => setStatus(t.id, 'doing')} style={btn('#3b82f6')}>▶ แก้แล้ว</button>}
          {t.status === 'done' && <button onClick={() => setStatus(t.id, 'pending')} style={btn('#64748b')}>↩ เปิดใหม่</button>}
          <button onClick={() => { setEditId(t.id); setForm({ title: t.title, detail: t.detail, from_person: t.from_person, to_person: t.to_person, priority: t.priority, due_date: t.due_date ? t.due_date.slice(0,10) : '' }); setShowForm(true); }} style={btn('#8b5cf6')}>✏️ แก้ไข</button>
          <button onClick={() => del(t.id)} style={btn('#94a3b8')}>🗑</button>
        </div>
      </div>
    );
  };
  const btn = (c: string): React.CSSProperties => ({ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 6, border: `1px solid ${c}`, background: 'white', color: c, fontWeight: 600, cursor: 'pointer' });

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>⏳ กำลังโหลดจาก Production API...</div>;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0B1320', margin: 0 }}>📋 Task Tracker <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>LIVE — เชื่อม Production API</span></h1>
          <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '2px 0 0' }}>ติดตามงาน — ใครสั่ง ใครทำ ติดอะไร | ความสำเร็จ: <b style={{ color: pct >= 80 ? '#15803d' : pct >= 50 ? '#f59e0b' : '#dc2626' }}>{pct}%</b> ({done}/{total})</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['board','list','calendar'] as const).map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', borderRadius: 8, border: view === v ? '2px solid #2EC4B6' : '1px solid #e2e8f0', background: view === v ? 'rgba(46,196,182,0.1)' : '#fff', color: view === v ? '#0d9488' : '#64748b', fontWeight: 600, fontSize: '0.76rem', cursor: 'pointer' }}>{v === 'board' ? '📊 Board' : v === 'list' ? '📋 List' : '📅 Calendar'}</button>)}
          <button onClick={() => setShowForm(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2EC4B6', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>＋ เพิ่มงาน</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
        {[{ l: '🚨 ติดปัญหา', v: cnt('stuck'), bg: '#fef2f2', c: '#dc2626', b: '#fecaca' },
          { l: '⏰ เกินกำหนด', v: overdue, bg: overdue ? '#fef2f2' : '#f0fdf4', c: overdue ? '#dc2626' : '#15803d', b: overdue ? '#fecaca' : '#bbf7d0' },
          { l: '📋 รอรับ', v: cnt('pending'), bg: '#fffbeb', c: '#d97706', b: '#fde68a' },
          { l: '⚙️ กำลังทำ', v: cnt('doing'), bg: '#eff6ff', c: '#1d4ed8', b: '#bfdbfe' },
          { l: '📅 Due วันนี้', v: todayDue, bg: '#f5f3ff', c: '#7c3aed', b: '#ddd6fe' },
          { l: '✅ เสร็จ', v: done, bg: '#f0fdf4', c: '#15803d', b: '#bbf7d0' },
        ].map(k => <div key={k.l} style={{ background: k.bg, borderRadius: 10, padding: '0.65rem', border: `1px solid ${k.b}`, textAlign: 'center' }}><div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.c }}>{k.v}</div><div style={{ fontSize: '0.68rem', color: k.c, fontWeight: 600 }}>{k.l}</div></div>)}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>กรอง:</span>
        <select value={fp} onChange={e => setFp(e.target.value)} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 600 }}>
          <option value="all">👥 ทุกคน</option>
          {TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
        </select>
        <select value={fs} onChange={e => setFs(e.target.value)} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 600 }}>
          <option value="all">ทุกสถานะ</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        <button onClick={load} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.76rem', cursor: 'pointer' }}>🔄 รีเฟรช</button>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>|</span>
        {TEAM.map(t => <button key={t.id} onClick={() => setFp(fp === t.id ? 'all' : t.id)} style={{ padding: '3px 8px', borderRadius: 6, border: fp === t.id ? `2px solid ${t.color}` : '1px solid #e2e8f0', background: fp === t.id ? `${t.color}15` : '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: fp === t.id ? 700 : 400 }}>{t.emoji}</button>)}
      </div>

      {/* Detail Modal */}
      {selectedTask && (() => { const t = selectedTask; const st = (STATUS as any)[t.status]||STATUS.pending; const pr = (PRI as any)[t.priority]||PRI.normal; const f = tm(t.from_person), to = tm(t.to_person); const d = dl(t.due_date); const od = d < 0 && t.status !== 'done';
        return <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedTask(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: '0.78rem', color: pr.c, fontWeight: 700 }}>{pr.l}</span><span style={{ padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.c, fontWeight: 600, fontSize: '0.78rem' }}>{st.l}</span></div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>{t.title}</h2>
            <p style={{ color: '#64748b', margin: '0 0 12px', fontSize: '0.9rem' }}>{t.detail || 'ไม่มีรายละเอียด'}</p>
            {t.stuck_reason && <div style={{ background: '#fef2f2', padding: 8, borderRadius: 8, marginBottom: 12, color: '#dc2626', fontWeight: 600 }}>🚨 {t.stuck_reason}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: '#f8fafc', borderRadius: 10 }}><div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>จาก</div><div style={{ fontSize: '1rem', fontWeight: 700, color: f.color }}>{f.emoji} {f.name}</div></div>
              <div style={{ padding: 10, background: `${to.color}10`, borderRadius: 10, border: `2px solid ${to.color}30` }}><div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ผู้รับผิดชอบ</div><div style={{ fontSize: '1.1rem', fontWeight: 800, color: to.color }}>{to.emoji} {to.name}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, padding: 8, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>กำหนดส่ง</div><div style={{ fontWeight: 700, color: od ? '#dc2626' : '#1e293b', fontSize: '0.9rem' }}>{t.due_date ? t.due_date.slice(0,10) : '-'}</div></div>
              <div style={{ flex: 1, padding: 8, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>สร้างเมื่อ</div><div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.created_at ? t.created_at.slice(0,10) : '-'}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {t.status==='pending' && <button onClick={() => { setStatus(t.id,'doing'); setSelectedTask(null); }} style={{ ...btn('#3b82f6'), padding: '6px 14px', fontSize: '0.8rem' }}>▶ เริ่มทำ</button>}
              {t.status==='doing' && <button onClick={() => { setStatus(t.id,'done'); setSelectedTask(null); }} style={{ ...btn('#15803d'), padding: '6px 14px', fontSize: '0.8rem' }}>✅ เสร็จ</button>}
              <button onClick={() => { setEditId(t.id); setForm({ title: t.title, detail: t.detail, from_person: t.from_person, to_person: t.to_person, priority: t.priority, due_date: t.due_date ? t.due_date.slice(0,10) : '' }); setSelectedTask(null); setShowForm(true); }} style={{ ...btn('#8b5cf6'), padding: '6px 14px', fontSize: '0.8rem' }}>✏️ แก้ไข</button>
              <button onClick={() => setSelectedTask(null)} style={{ ...btn('#94a3b8'), padding: '6px 14px', fontSize: '0.8rem', marginLeft: 'auto' }}>ปิด</button>
            </div>
            {/* Comments */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>💬 คอมเมนต์ ({comments.length})</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                {comments.length === 0 && <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: 8 }}>ยังไม่มีคอมเมนต์</div>}
                {comments.map((c: any) => { const a = tm(c.author); return <div key={c.id} style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: 8, marginBottom: 4, fontSize: '0.8rem' }}><span style={{ fontWeight: 700, color: a.color }}>{a.emoji}{a.name}</span> <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>{new Date(c.created_at).toLocaleString('th-TH')}</span><div style={{ marginTop: 2 }}>{c.content}</div></div>; })}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={commentAs} onChange={e => setCommentAs(e.target.value)} style={{ padding: '6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem', width: 80 }}>{TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji}{t.name}</option>)}</select>
                <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment(t.id)} placeholder="พิมพ์คอมเมนต์..." style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.82rem' }} />
                <button onClick={() => addComment(t.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2EC4B6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>ส่ง</button>
              </div>
            </div>
          </div>
        </div>; })()}

      {/* New/Edit Task Modal */}
      {showForm && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowForm(false); setEditId(null); }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: '90%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{editId ? '✏️ แก้ไขงาน' : '＋ เพิ่มงานใหม่'}</h3>
          <input placeholder="ชื่องาน *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inp} />
          <input placeholder="รายละเอียด" value={form.detail} onChange={e => setForm({...form, detail: e.target.value})} style={inp} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select value={form.from_person} onChange={e => setForm({...form, from_person: e.target.value})} style={inp}><option value="">— จาก —</option>{TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</select>
            <select value={form.to_person} onChange={e => setForm({...form, to_person: e.target.value})} style={inp}><option value="">— ผู้รับผิดชอบ * —</option>{TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={inp}>{Object.entries(PRI).map(([k,v]) => <option key={k} value={k}>{v.l}</option>)}</select>
            <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#2EC4B6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>💾 บันทึก</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
          </div>
        </div>
      </div>}

      {/* Board */}
      {view === 'board' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
        {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map(s => {
          const st = STATUS[s]; const items = filtered.filter(t => t.status === s);
          return <div key={s} style={{ background: st.bg, borderRadius: 14, padding: '0.65rem', border: `1px solid ${st.b}`, minHeight: 200 }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: st.c, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}><span>{st.l}</span><span style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 8px', borderRadius: 10, fontSize: '0.72rem' }}>{items.length}</span></div>
            {items.length === 0 && <div style={{ fontSize: '0.76rem', color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>ไม่มีงาน</div>}
            {items.map(t => card(t))}
          </div>;
        })}
      </div>}

      {/* List */}
      {view === 'list' && <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['','งาน','จาก','ถึง','สถานะ','กำหนด','Actions'].map(h => <th key={h} style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.map((t, i) => { const d = dl(t.due_date); const od = d < 0 && t.status !== 'done'; const st = (STATUS as any)[t.status]||STATUS.pending; const pr = (PRI as any)[t.priority]||PRI.normal; const f = tm(t.from_person), to = tm(t.to_person);
            return <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: od ? '#fef2f2' : i%2===0 ? '#fff' : '#fafbfc' }}>
              <td style={{ padding: '0.4rem', color: pr.c, fontSize: '0.7rem' }}>{pr.l.split(' ')[0]}</td>
              <td style={{ padding: '0.4rem' }}><b>{t.title}</b>{t.detail && <><br/><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.detail}</span></>}</td>
              <td style={{ padding: '0.4rem', color: f.color, fontWeight: 600, fontSize: '0.78rem' }}>{f.emoji}{f.name}</td>
              <td style={{ padding: '0.4rem', color: to.color, fontWeight: 700, fontSize: '0.78rem' }}>{to.emoji}{to.name}</td>
              <td style={{ padding: '0.4rem' }}><span style={{ padding: '2px 6px', borderRadius: 6, background: st.bg, color: st.c, fontSize: '0.7rem', fontWeight: 600 }}>{st.l}</span></td>
              <td style={{ padding: '0.4rem', color: od ? '#dc2626' : '#64748b', fontWeight: od ? 700 : 400, fontSize: '0.78rem' }}>{t.due_date ? t.due_date.slice(0,10) : '-'}{od && ' ⏰'}</td>
              <td style={{ padding: '0.4rem' }}><div style={{ display: 'flex', gap: 3 }}>
                {t.status==='pending' && <button onClick={() => setStatus(t.id,'doing')} style={btn('#3b82f6')}>▶</button>}
                {t.status==='doing' && <button onClick={() => setStatus(t.id,'done')} style={btn('#15803d')}>✅</button>}
                {t.status==='doing' && <button onClick={() => { const r=prompt('ติดอะไร?'); if(r) setStatus(t.id,'stuck',r); }} style={btn('#dc2626')}>🚨</button>}
                {t.status==='stuck' && <button onClick={() => setStatus(t.id,'doing')} style={btn('#3b82f6')}>▶</button>}
                <button onClick={() => del(t.id)} style={btn('#94a3b8')}>🗑</button>
              </div></td>
            </tr>; })}</tbody>
        </table>
      </div>}

      {/* Calendar — Full Month */}
      {view === 'calendar' && (() => {
        const year = calMonth.getFullYear(), month = calMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date().toISOString().split('T')[0];
        const cells: (number|null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        while (cells.length % 7 !== 0) cells.push(null);
        const mName = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        const prev = () => setCalMonth(new Date(year, month - 1, 1));
        const next = () => setCalMonth(new Date(year, month + 1, 1));
        return <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={prev} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>◀</button>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{mName[month]} {year + 543}</span>
            <button onClick={next} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>▶</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: d==='อา'||d==='ส' ? '#dc2626' : '#64748b', padding: 4 }}>{d}</div>)}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ background: '#fafafa', borderRadius: 6, minHeight: 70 }} />;
              const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dt = filtered.filter(t => t.due_date && t.due_date.slice(0,10) === ds);
              const isT = ds === today; const dow = new Date(ds).getDay();
              return <div key={ds} style={{ background: isT ? '#eff6ff' : dow===0||dow===6 ? '#fafafa' : '#fff', borderRadius: 6, padding: 3, border: isT ? '2px solid #3b82f6' : '1px solid #f1f5f9', minHeight: 70 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isT ? '#1d4ed8' : dow===0 ? '#dc2626' : '#64748b', marginBottom: 2 }}>{day} {isT && <span style={{ background: '#3b82f6', color: '#fff', padding: '0 3px', borderRadius: 3, fontSize: '0.55rem' }}>วันนี้</span>}</div>
                {dt.map(t => { const pr = (PRI as any)[t.priority]||PRI.normal; const to = tm(t.to_person); const st = (STATUS as any)[t.status]||STATUS.pending;
                  return <div key={t.id} onClick={() => setSelectedTask(t)} style={{ fontSize: '0.6rem', padding: '1px 3px', borderRadius: 4, background: st.bg, marginBottom: 1, borderLeft: `2px solid ${pr.c}`, cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}><b style={{ color: to.color }}>{to.emoji}</b> {t.title.substring(0,10)}</div>; })}
              </div>;
            })}
          </div>
        </div>; })()}
    </div>
  );
}
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: 8, boxSizing: 'border-box' };
