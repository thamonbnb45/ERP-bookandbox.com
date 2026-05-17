'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = 'https://erp-bookandboxcom-production.up.railway.app';
const TEAM = [
  { id: 'หน่ำ', name: 'Nam', color: '#2563eb', emoji: '👨‍💼' },
  { id: 'ซัน', name: 'SUN', color: '#f59e0b', emoji: '☀️' },
  { id: 'หนึ่ง', name: 'Nueng', color: '#9333ea', emoji: '⚡' },
  { id: 'อ้อ', name: 'Aor', color: '#dc2626', emoji: '📋' },
  { id: 'บิ๊ก', name: 'BIG', color: '#16a34a', emoji: '🔧' },
  { id: 'กวาง', name: 'Kwang', color: '#ea580c', emoji: '🦌' },
  { id: 'สา', name: 'Sa', color: '#06b6d4', emoji: '💎' },
];
const COLS = [
  { id: 'pending', label: '📋 รอรับ', color: '#64748b', bg: '#f8fafc' },
  { id: 'doing', label: '⚙️ กำลังทำ', color: '#2563eb', bg: '#eff6ff' },
  { id: 'stuck', label: '🚨 ติดปัญหา', color: '#dc2626', bg: '#fef2f2' },
  { id: 'done', label: '✅ เสร็จ', color: '#16a34a', bg: '#f0fdf4' },
];
const PRI: Record<string, { l: string; c: string }> = {
  urgent: { l: '🔥 ด่วนมาก', c: '#dc2626' },
  high: { l: '⚡ สำคัญ', c: '#f59e0b' },
  normal: { l: '📌 ปกติ', c: '#64748b' },
};
type Task = { id: string; title: string; detail: string; from_person: string; to_person: string; status: string; priority: string; due_date: string; stuck_reason?: string; image_url?: string; created_at: string; parent_task_id?: string; child_task_ids?: string; gang_run_label?: string; };
const tm = (id: string) => TEAM.find(t => t.id === id) || { id, name: id, color: '#888', emoji: '👤' };
const dl = (d: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 999;

// ── Sortable Card ──
function SortableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const pr = PRI[task.priority] || PRI.normal;
  const to = tm(task.to_person);
  const d = dl(task.due_date);
  const od = d < 0 && task.status !== 'done';
  return (
    <div ref={setNodeRef} style={{ ...style, background: '#fff', borderRadius: 10, padding: '10px 12px', border: `1px solid ${od ? '#fca5a5' : '#e5e7eb'}`, borderLeft: `4px solid ${od ? '#dc2626' : pr.c}`, marginBottom: 6, cursor: 'grab', boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,.15)' : '0 1px 3px rgba(0,0,0,.06)' }}
      {...attributes} {...listeners} onClick={e => { e.stopPropagation(); onClick(); }}>
      <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#1e293b', marginBottom: 4 }}>{task.title}</div>
      {task.detail && <div style={{ fontSize: '.7rem', color: '#94a3b8', marginBottom: 4, lineHeight: 1.3 }}>{task.detail.substring(0, 60)}{task.detail.length > 60 ? '...' : ''}</div>}
      {task.image_url && <div style={{ width: '100%', height: 60, borderRadius: 6, marginBottom: 4, background: `url(${task.image_url}) center/cover`, border: '1px solid #e5e7eb' }} />}
      {task.stuck_reason && <div style={{ fontSize: '.65rem', color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: 4, marginBottom: 4 }}>🚨 {task.stuck_reason}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '.95rem' }}>{to.emoji}</span>
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: to.color }}>{to.name}</span>
        {task.due_date && <span style={{ marginLeft: 'auto', fontSize: '.65rem', color: od ? '#dc2626' : d <= 1 ? '#f59e0b' : '#94a3b8', fontWeight: od ? 700 : 400 }}>{od ? `⏰ ${Math.abs(d)}d` : d === 0 ? '📅' : `${d}d`}</span>}
        {task.gang_run_label && <span style={{ fontSize: '.6rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>🔗{task.gang_run_label}</span>}
      </div>
    </div>
  );
}

// ── Detail Panel (Trello-style slide-in) ──
function DetailPanel({ task, onClose, onUpdate, onDelete }: { task: Task; onClose: () => void; onUpdate: (t: Task) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [detail, setDetail] = useState(task.detail || '');
  const [comments, setComments] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newCheck, setNewCheck] = useState('');
  const [commentAs, setCommentAs] = useState('หน่ำ');
  const [tab, setTab] = useState<'detail' | 'activity'>('detail');
  const to = tm(task.to_person), f = tm(task.from_person);
  const pr = PRI[task.priority] || PRI.normal;
  const col = COLS.find(c => c.id === task.status) || COLS[0];

  const loadData = useCallback(async () => {
    const [c, cl, a] = await Promise.all([
      fetch(`${API}/api/tasks/${task.id}/comments`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/tasks/${task.id}/checklist`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/tasks/${task.id}/activity`).then(r => r.json()).catch(() => []),
    ]);
    setComments(c); setChecklist(cl); setActivity(a);
  }, [task.id]);
  useEffect(() => { loadData(); }, [loadData]);

  const save = async (field: string, value: any) => {
    const r = await fetch(`${API}/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
    const updated = await r.json(); onUpdate(updated);
  };
  const addComment = async () => { if (!newComment.trim()) return; await fetch(`${API}/api/tasks/${task.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: commentAs, content: newComment }) }); setNewComment(''); loadData(); };
  const addCheck = async () => { if (!newCheck.trim()) return; await fetch(`${API}/api/tasks/${task.id}/checklist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newCheck }) }); setNewCheck(''); loadData(); };
  const toggleCheck = async (c: any) => { await fetch(`${API}/api/tasks/checklist/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !c.done }) }); loadData(); };
  const delCheck = async (id: string) => { await fetch(`${API}/api/tasks/checklist/${id}`, { method: 'DELETE' }); loadData(); };
  const checkDone = checklist.filter(c => c.done).length;
  const checkPct = checklist.length > 0 ? Math.round((checkDone / checklist.length) * 100) : 0;
  const d = dl(task.due_date); const od = d < 0 && task.status !== 'done';

  const S: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' },
    panel: { width: '100%', maxWidth: 560, height: '100%', background: '#fff', overflowY: 'auto', boxShadow: '-4px 0 30px rgba(0,0,0,.15)', padding: '20px 24px' },
    label: { fontSize: '.7rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '.5px' },
    inp: { width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '.85rem', boxSizing: 'border-box' as const },
  };
  const btnS = (bg: string): React.CSSProperties => ({ padding: '6px 14px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.8rem' });

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '3px 10px', borderRadius: 6, background: col.bg, color: col.color, fontWeight: 700, fontSize: '.78rem', border: `1px solid ${col.color}30` }}>{col.label}</span>
            <span style={{ fontSize: '.7rem', color: pr.c, fontWeight: 600 }}>{pr.l}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onDelete} style={{ ...btnS('#ef4444'), fontSize: '.72rem', padding: '4px 10px' }}>🗑 ลบ</button>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '.8rem' }}>✕</button>
          </div>
        </div>

        {/* Title (inline edit) */}
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title !== task.title && save('title', title)}
          style={{ width: '100%', fontSize: '1.2rem', fontWeight: 800, border: 'none', borderBottom: '2px solid transparent', padding: '4px 0', marginBottom: 12, outline: 'none', color: '#1e293b' }}
          onFocus={e => (e.target.style.borderBottomColor = '#2563eb')} />

        {/* Task ID */}
        <div style={{ fontSize: '.68rem', color: '#94a3b8', marginBottom: 12 }}>ID: #{task.id} — LINE: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>เสร็จ #{task.id}</code></div>

        {/* Members + Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={S.label}>จาก</div>
            <select value={task.from_person} onChange={e => save('from_person', e.target.value)} style={S.inp}>
              {TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
            </select>
          </div>
          <div>
            <div style={S.label}>ผู้รับผิดชอบ</div>
            <select value={task.to_person} onChange={e => save('to_person', e.target.value)} style={S.inp}>
              {TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
            </select>
          </div>
          <div>
            <div style={S.label}>กำหนดส่ง</div>
            <input type="date" value={task.due_date ? task.due_date.slice(0, 10) : ''} onChange={e => save('due_date', e.target.value)} style={{ ...S.inp, color: od ? '#dc2626' : '#1e293b', fontWeight: od ? 700 : 400 }} />
          </div>
          <div>
            <div style={S.label}>ความเร่ง</div>
            <select value={task.priority} onChange={e => save('priority', e.target.value)} style={S.inp}>
              {Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </div>

        {/* Status buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {COLS.map(c => <button key={c.id} onClick={() => save('status', c.id)} style={{ padding: '5px 12px', borderRadius: 6, border: task.status === c.id ? `2px solid ${c.color}` : '1px solid #e5e7eb', background: task.status === c.id ? c.bg : '#fff', color: c.color, fontWeight: task.status === c.id ? 700 : 400, fontSize: '.75rem', cursor: 'pointer' }}>{c.label}</button>)}
        </div>

        {/* Description */}
        <div style={S.label}>📝 รายละเอียด</div>
        <textarea value={detail} onChange={e => setDetail(e.target.value)} onBlur={() => detail !== (task.detail || '') && save('detail', detail)}
          rows={3} placeholder="เพิ่มรายละเอียด..." style={{ ...S.inp, resize: 'vertical', marginBottom: 16, fontFamily: 'inherit' }} />

        {/* Image */}
        {task.image_url && <img src={task.image_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 200, objectFit: 'cover' }} />}

        {/* Checklist */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '.85rem' }}>☑️ รายการตรวจสอบ</span>
            <span style={{ fontSize: '.7rem', color: '#94a3b8' }}>{checkPct}%</span>
          </div>
          {checklist.length > 0 && <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}><div style={{ height: '100%', width: `${checkPct}%`, background: checkPct === 100 ? '#16a34a' : '#2563eb', borderRadius: 2, transition: 'width .3s' }} /></div>}
          {checklist.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '.82rem' }}>
              <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <span style={{ flex: 1, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? '#94a3b8' : '#1e293b' }}>{c.content}</span>
              <button onClick={() => delCheck(c.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '.7rem' }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input value={newCheck} onChange={e => setNewCheck(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCheck()} placeholder="เพิ่มรายการ..." style={{ ...S.inp, flex: 1, fontSize: '.8rem' }} />
            <button onClick={addCheck} style={btnS('#2563eb')}>+</button>
          </div>
        </div>

        {/* Tabs: Comments / Activity */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={() => setTab('detail')} style={{ padding: '6px 14px', border: 'none', borderBottom: tab === 'detail' ? '2px solid #2563eb' : '2px solid transparent', background: 'none', fontWeight: tab === 'detail' ? 700 : 400, color: tab === 'detail' ? '#2563eb' : '#94a3b8', cursor: 'pointer', fontSize: '.82rem' }}>💬 Comments ({comments.length})</button>
          <button onClick={() => setTab('activity')} style={{ padding: '6px 14px', border: 'none', borderBottom: tab === 'activity' ? '2px solid #2563eb' : '2px solid transparent', background: 'none', fontWeight: tab === 'activity' ? 700 : 400, color: tab === 'activity' ? '#2563eb' : '#94a3b8', cursor: 'pointer', fontSize: '.82rem' }}>📊 Activity ({activity.length})</button>
        </div>

        {tab === 'detail' && <>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
            {comments.length === 0 && <div style={{ color: '#cbd5e1', fontSize: '.8rem', padding: 8 }}>ยังไม่มี comment</div>}
            {comments.map((c: any) => { const a = tm(c.author); return (
              <div key={c.id} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, color: a.color, fontSize: '.8rem' }}>{a.emoji} {a.name}</span>
                  <span style={{ fontSize: '.65rem', color: '#94a3b8' }}>{new Date(c.created_at).toLocaleString('th-TH')}</span>
                </div>
                <div style={{ fontSize: '.82rem' }}>{c.content}</div>
              </div>
            ); })}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={commentAs} onChange={e => setCommentAs(e.target.value)} style={{ ...S.inp, width: 80 }}>{TEAM.map(t => <option key={t.id} value={t.id}>{t.emoji}</option>)}</select>
            <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="พิมพ์..." style={{ ...S.inp, flex: 1 }} />
            <button onClick={addComment} style={btnS('#2EC4B6')}>ส่ง</button>
          </div>
        </>}

        {tab === 'activity' && (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {activity.length === 0 && <div style={{ color: '#cbd5e1', fontSize: '.8rem', padding: 8 }}>ยังไม่มี activity</div>}
            {activity.map((a: any) => (
              <div key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.78rem', display: 'flex', gap: 8, alignItems: 'start' }}>
                <span style={{ color: '#2563eb', fontSize: '.7rem', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('th-TH')}</span>
                <span><b>{a.actor}</b> {a.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { SortableCard, DetailPanel, TEAM, COLS, PRI, API, tm, dl };
export type { Task };
