"use client";
import { useState, useEffect } from 'react';

const API = 'https://erp-bookandboxcom-production.up.railway.app/api';

function safeTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  'i': { label: 'สนใจ', color: '#f59e0b', icon: '🟡' },
  'o': { label: 'เสนอราคา', color: '#3b82f6', icon: '🔵' },
  'c': { label: 'ปิดขาย ✅', color: '#10b981', icon: '🟢' },
  'nt': { label: 'ไม่ทัก', color: '#94a3b8', icon: '⚪' },
  'na': { label: 'ไม่ซื้อ', color: '#ef4444', icon: '🔴' },
  'al': { label: 'หลุด', color: '#dc2626', icon: '❌' },
};

const QUICK_TAGS = [
  { tag: 'รอราคา', icon: '💰', color: '#f59e0b', bg: '#fef3c7' },
  { tag: 'รอไฟล์', icon: '📁', color: '#8b5cf6', bg: '#ede9fe' },
  { tag: 'รอโอน', icon: '💳', color: '#ec4899', bg: '#fce7f3' },
  { tag: 'รอตรวจแบบ', icon: '👁️', color: '#06b6d4', bg: '#cffafe' },
  { tag: 'รอยืนยัน', icon: '✋', color: '#f97316', bg: '#fff7ed' },
  { tag: 'เข้าผลิต', icon: '🏭', color: '#10b981', bg: '#d1fae5' },
  { tag: 'รอจัดส่ง', icon: '📦', color: '#3b82f6', bg: '#dbeafe' },
  { tag: 'ส่งแล้ว', icon: '✈️', color: '#16a34a', bg: '#f0fdf4' },
  { tag: 'Follow Up', icon: '📞', color: '#6366f1', bg: '#e0e7ff' },
  { tag: 'VIP', icon: '👑', color: '#b45309', bg: '#fef3c7' },
];

export default function SalesReportPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickPick, setQuickPick] = useState('today');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');
  const [showPendingDetail, setShowPendingDetail] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/chats`); setLeads(await r.json()); } catch {}
    setLoading(false);
  };

  const toggleTag = async (leadId: string, tag: string) => {
    const lead = leads.find(l => l.id === leadId); if (!lead) return;
    const currentTags = safeTags(lead.tags);
    const newTags = currentTags.includes(tag) ? currentTags.filter((t: string) => t !== tag) : [...currentTags, tag];
    try { await fetch(`${API}/leads/${leadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ erp_alias_name: lead.erp_alias_name || lead.original_name, tags: newTags, sales_status: lead.sales_status }) }); fetchData(); } catch {}
  };

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const handleQuickPick = (p: string) => { setQuickPick(p); if (p === 'today') setSelectedDate(todayStr); else setSelectedDate(yesterdayStr); };

  const dateStr = selectedDate;
  const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const newLeads = leads.filter(l => l.messages?.length > 0 && new Date(l.messages[0].created_at).toISOString().split('T')[0] === dateStr);
  const activeLeads = leads.filter(l => l.messages?.some((m: any) => new Date(m.created_at).toISOString().split('T')[0] === dateStr));
  const dayMessages = leads.reduce((sum, l) => sum + (l.messages?.filter((m: any) => new Date(m.created_at).toISOString().split('T')[0] === dateStr).length || 0), 0);

  const statusBreakdown: Record<string, number> = {};
  activeLeads.forEach(l => { const s = l.sales_status || 'i'; statusBreakdown[s] = (statusBreakdown[s] || 0) + 1; });

  const waitingReplyLeads = leads.filter(l => l.messages?.length > 0 && l.messages[l.messages.length - 1].sender === 'client');
  const tagBreakdown: Record<string, number> = {};
  waitingReplyLeads.forEach(l => { const tags = safeTags(l.tags); if (!tags.length) tagBreakdown['ไม่มี tag'] = (tagBreakdown['ไม่มี tag'] || 0) + 1; tags.forEach((t: string) => { tagBreakdown[t] = (tagBreakdown[t] || 0) + 1; }); });
  const filteredPending = tagFilter === 'all' ? waitingReplyLeads : waitingReplyLeads.filter(l => safeTags(l.tags).includes(tagFilter));

  const salesStats: Record<string, { total: number; closed: number; pending: number; lost: number }> = {};
  activeLeads.forEach(l => { const sp = ((l.erp_alias_name || '').split('-')[1]) || 'ยังไม่มีเซล'; if (!salesStats[sp]) salesStats[sp] = { total: 0, closed: 0, pending: 0, lost: 0 }; salesStats[sp].total++; if (l.sales_status === 'c') salesStats[sp].closed++; else if (['nt', 'na', 'al'].includes(l.sales_status)) salesStats[sp].lost++; else salesStats[sp].pending++; });

  const calYear = viewMonth.getFullYear(); const calMonth = viewMonth.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay(); const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays: (number | null)[] = []; for (let i = 0; i < firstDay; i++) calDays.push(null); for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
  const getDayStats = (day: number) => { const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return leads.filter(l => l.messages?.some((m: any) => new Date(m.created_at).toISOString().split('T')[0] === ds)).length; };

  const card = { background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div><h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>📈 Sales Daily Report</h1><p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>รายงานยอดขายรายวัน • ค้างตอบ {waitingReplyLeads.length} คน</p></div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button onClick={() => handleQuickPick('today')} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: quickPick === 'today' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: quickPick === 'today' ? '#eff6ff' : 'white', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>📅 วันนี้</button>
          <button onClick={() => handleQuickPick('yesterday')} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: quickPick === 'yesterday' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: quickPick === 'yesterday' ? '#eff6ff' : 'white', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>⏪ เมื่อวาน</button>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setQuickPick('custom'); }} style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
          <button onClick={fetchData} style={{ padding: '0.3rem 0.8rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}>🔄</button>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>📊 {dateLabel}</div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
        {[{ label: '💜 ลูกค้าใหม่ทัก', val: newLeads.length, color: '#7c3aed' }, { label: '💬 แชทกิจกรรม', val: activeLeads.length, color: '#3b82f6' }, { label: '✅ ปิดขายได้', val: statusBreakdown['c'] || 0, color: '#10b981' }, { label: '🟡 สนใจ/เสนอ', val: (statusBreakdown['i'] || 0) + (statusBreakdown['o'] || 0), color: '#f59e0b' }, { label: '🔴 ค้างตอบ', val: waitingReplyLeads.length, color: '#dc2626' }, { label: '💬 ข้อความทั้งวัน', val: dayMessages, color: '#06b6d4' }].map((c, i) => (
          <div key={i} onClick={() => { if (c.label.includes('ค้างตอบ')) setShowPendingDetail(!showPendingDetail); }} style={{ ...card, borderTop: `3px solid ${c.color}`, textAlign: 'center', cursor: c.label.includes('ค้างตอบ') ? 'pointer' : 'default' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: c.color }}>{c.val}</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Detail */}
      {showPendingDetail && (
        <div style={{ ...card, marginBottom: '1.5rem', borderTop: '3px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}><h3 style={{ margin: 0, fontSize: '0.9rem' }}>🔴 ค้างตอบ {waitingReplyLeads.length} คน</h3><button onClick={() => setShowPendingDetail(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button></div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <button onClick={() => setTagFilter('all')} style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', border: tagFilter === 'all' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: tagFilter === 'all' ? '#eff6ff' : 'white', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>ทั้งหมด ({waitingReplyLeads.length})</button>
            {QUICK_TAGS.map(qt => (<button key={qt.tag} onClick={() => setTagFilter(qt.tag)} style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', border: tagFilter === qt.tag ? `2px solid ${qt.color}` : '1px solid #e2e8f0', background: tagFilter === qt.tag ? qt.bg : 'white', fontSize: '0.7rem', cursor: 'pointer' }}>{qt.icon} {qt.tag} {tagBreakdown[qt.tag] ? `(${tagBreakdown[qt.tag]})` : ''}</button>))}
          </div>
          <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            {filteredPending.map(l => { const lastMsg = l.messages[l.messages.length - 1]; const mins = Math.round((Date.now() - new Date(lastMsg.created_at).getTime()) / 60000); const timeLabel = mins < 60 ? `${mins} นาที` : mins < 1440 ? `${Math.round(mins / 60)} ชม.` : `${Math.round(mins / 1440)} วัน`; return (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9', gap: '0.3rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{l.erp_alias_name || l.original_name}</div><div style={{ fontSize: '0.65rem', color: '#dc2626' }}>⏰ ค้าง {timeLabel}</div></div>
                <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', maxWidth: '200px' }}>{safeTags(l.tags).map((t: string) => { const qtConf = QUICK_TAGS.find(q => q.tag === t); return (<span key={t} onClick={() => toggleTag(l.id, t)} style={{ background: qtConf?.bg || '#f1f5f9', color: qtConf?.color || '#475569', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer' }}>{qtConf?.icon} {t} ✕</span>); })}</div>
                <select value="" onChange={e => { if (e.target.value) toggleTag(l.id, e.target.value); }} style={{ padding: '0.2rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.65rem' }}><option value="">+ Tag</option>{QUICK_TAGS.filter(qt => !safeTags(l.tags).includes(qt.tag)).map(qt => (<option key={qt.tag} value={qt.tag}>{qt.icon} {qt.tag}</option>))}</select>
              </div>
            ); })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Status Funnel */}
          <div style={card}><h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>📊 สถานะลูกค้าวันนี้</h3>
            {Object.entries(STATUS_MAP).map(([key, conf]) => { const count = statusBreakdown[key] || 0; const pct = activeLeads.length > 0 ? Math.round(count / activeLeads.length * 100) : 0; return (<div key={key} style={{ marginBottom: '0.4rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span>{conf.icon} {conf.label}</span><span style={{ fontWeight: 'bold' }}>{count} ({pct}%)</span></div><div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px' }}><div style={{ background: conf.color, height: '100%', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.5s' }}></div></div></div>); })}
          </div>
          {/* Tag Summary */}
          <div style={card}><h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>🏷️ สรุป Tag</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{QUICK_TAGS.map(qt => { const cnt = leads.filter(l => safeTags(l.tags).includes(qt.tag)).length; return (<div key={qt.tag} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: qt.bg, padding: '0.3rem 0.6rem', borderRadius: '8px' }}><span style={{ fontSize: '0.7rem', color: qt.color, fontWeight: 'bold' }}>{qt.icon} {qt.tag}</span><span style={{ background: qt.color, color: 'white', padding: '0 0.3rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold' }}>{cnt}</span></div>); })}</div>
          </div>
          {/* Sales Person */}
          <div style={card}><h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>👔 ผลงานเซลส์</h3>
            {Object.entries(salesStats).sort((a, b) => b[1].closed - a[1].closed).map(([name, stats]) => (<div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${stats.closed > 0 ? '#10b981' : '#f59e0b'}`, marginBottom: '0.4rem' }}><div><div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{name}</div><div style={{ fontSize: '0.65rem', color: '#64748b' }}>{stats.total} ราย</div></div><div style={{ display: 'flex', gap: '0.3rem' }}><span style={{ background: '#dcfce7', color: '#166534', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>✅{stats.closed}</span><span style={{ background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>⏳{stats.pending}</span><span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>❌{stats.lost}</span></div></div>))}
          </div>
        </div>

        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Calendar */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <button onClick={() => setViewMonth(new Date(calYear, calMonth - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>◀</button>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{viewMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</h4>
              <button onClick={() => setViewMonth(new Date(calYear, calMonth + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>▶</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', fontSize: '0.7rem' }}>
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (<div key={d} style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b', padding: '0.3rem' }}>{d}</div>))}
              {calDays.map((day, idx) => { if (day === null) return <div key={`e-${idx}`}></div>; const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const count = getDayStats(day); const isSel = ds === selectedDate; const isToday = ds === todayStr; return (<div key={day} onClick={() => { setSelectedDate(ds); setQuickPick('custom'); }} style={{ textAlign: 'center', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', background: isSel ? '#3b82f6' : count > 10 ? '#dcfce7' : count > 5 ? '#fef3c7' : count > 0 ? '#f8fafc' : 'transparent', color: isSel ? 'white' : '#1e293b', border: isToday ? '2px solid #3b82f6' : '1px solid transparent', fontWeight: isSel || isToday ? 'bold' : 'normal' }}>{day}{count > 0 && !isSel && <div style={{ fontSize: '0.5rem', color: count > 10 ? '#16a34a' : '#f59e0b' }}>{count}</div>}</div>); })}
            </div>
          </div>
          {/* New Leads */}
          <div style={card}>
            <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>🆕 ลูกค้าใหม่ ({newLeads.length})</h3>
            <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
              {newLeads.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>ไม่มีลูกค้าใหม่ในวันนี้</p>}
              {newLeads.map(l => { const conf = STATUS_MAP[l.sales_status] || STATUS_MAP['i']; const time = new Date(l.messages[0].created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); return (<div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}><div><div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{l.erp_alias_name || l.original_name}</div><div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>ทัก {time} • {l.messages.length} ข้อความ</div></div><span style={{ background: conf.color + '20', color: conf.color, padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold' }}>{conf.icon} {conf.label}</span></div>); })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
