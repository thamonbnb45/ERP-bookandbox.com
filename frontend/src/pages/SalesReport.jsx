import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const STATUS_MAP = {
  'i': { label: 'สนใจ', color: '#f59e0b', icon: '🟡' },
  'o': { label: 'เสนอราคา', color: '#3b82f6', icon: '🔵' },
  'c': { label: 'ปิดขาย ✅', color: '#10b981', icon: '🟢' },
  'nt': { label: 'ไม่ทัก', color: '#94a3b8', icon: '⚪' },
  'na': { label: 'ไม่ซื้อ', color: '#ef4444', icon: '🔴' },
  'al': { label: 'หลุด', color: '#dc2626', icon: '❌' },
};

// Quick tags that sales can apply to leads
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

export default function SalesReport() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickPick, setQuickPick] = useState('today');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');
  const [showPendingDetail, setShowPendingDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/chats`);
      setLeads(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleTag = async (leadId, tag) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const currentTags = lead.tags || [];
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter(t => t !== tag) 
      : [...currentTags, tag];
    try {
      await axios.put(`${API_URL}/leads/${leadId}`, {
        erp_alias_name: lead.erp_alias_name || lead.original_name,
        tags: newTags,
        sales_status: lead.sales_status
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  // Date helpers
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const handleQuickPick = (pick) => {
    setQuickPick(pick);
    if (pick === 'today') setSelectedDate(todayStr);
    else if (pick === 'yesterday') setSelectedDate(yesterdayStr);
  };

  const dateStr = selectedDate;
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // New leads: first message on selected date
  const newLeads = leads.filter(l => {
    if (!l.messages || l.messages.length === 0) return false;
    const firstMsg = new Date(l.messages[0].created_at);
    return firstMsg.toISOString().split('T')[0] === dateStr;
  });

  // Active leads on that date
  const activeLeads = leads.filter(l => {
    return l.messages?.some(m => new Date(m.created_at).toISOString().split('T')[0] === dateStr);
  });

  // Messages on that date
  const dayMessages = leads.reduce((sum, l) => {
    return sum + (l.messages?.filter(m => new Date(m.created_at).toISOString().split('T')[0] === dateStr).length || 0);
  }, 0);

  // Status breakdown
  const statusBreakdown = {};
  activeLeads.forEach(l => {
    const s = l.sales_status || 'i';
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
  });

  // ★ Waiting reply = count as PEOPLE (ลูกค้า not ข้อความ)
  const waitingReplyLeads = leads.filter(l => {
    if (!l.messages || l.messages.length === 0) return false;
    const lastMsg = l.messages[l.messages.length - 1];
    return lastMsg.sender === 'client';
  });

  // Tag breakdown for waiting leads
  const tagBreakdown = {};
  waitingReplyLeads.forEach(l => {
    const tags = l.tags || [];
    if (tags.length === 0) { tagBreakdown['ไม่มี tag'] = (tagBreakdown['ไม่มี tag'] || 0) + 1; }
    tags.forEach(t => { tagBreakdown[t] = (tagBreakdown[t] || 0) + 1; });
  });

  // Filtered pending leads
  const filteredPending = tagFilter === 'all' 
    ? waitingReplyLeads 
    : waitingReplyLeads.filter(l => (l.tags || []).includes(tagFilter));

  // Sales person breakdown
  const getSalesPerson = (lead) => {
    const alias = lead.erp_alias_name || '';
    const parts = alias.split('-');
    if (parts.length >= 2) return parts[1] || 'ยังไม่มีเซล';
    return 'ยังไม่มีเซล';
  };

  const salesStats = {};
  activeLeads.forEach(l => {
    const sp = getSalesPerson(l);
    if (!salesStats[sp]) salesStats[sp] = { total: 0, closed: 0, pending: 0, lost: 0 };
    salesStats[sp].total++;
    if (l.sales_status === 'c') salesStats[sp].closed++;
    else if (['nt', 'na', 'al'].includes(l.sales_status)) salesStats[sp].lost++;
    else salesStats[sp].pending++;
  });

  // Calendar
  const calYear = viewMonth.getFullYear();
  const calMonth = viewMonth.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  const getDayStats = (day) => {
    if (!day) return null;
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leads.filter(l => l.messages?.some(m => new Date(m.created_at).toISOString().split('T')[0] === ds)).length;
  };

  const cardStyle = { background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

  return (
    <div className="view-section active" style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}><i className="fa-solid fa-chart-line"></i> Sales Daily Report</h2>
          <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>รายงานยอดขายรายวัน • ค้างตอบ {waitingReplyLeads.length} คน</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button onClick={() => handleQuickPick('today')} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: quickPick === 'today' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: quickPick === 'today' ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>📅 วันนี้</button>
          <button onClick={() => handleQuickPick('yesterday')} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: quickPick === 'yesterday' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: quickPick === 'yesterday' ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>⏪ เมื่อวาน</button>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setQuickPick('custom'); }} style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
          <button onClick={fetchData} className="btn btn-sm btn-primary" style={{ fontSize: '0.8rem' }}><i className="fa-solid fa-rotate"></i></button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>
        📊 {dateLabel}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <div style={{ ...cardStyle, borderTop: '4px solid #7c3aed', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{newLeads.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#5b21b6' }}>💜 ลูกค้าใหม่ทัก</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #3b82f6', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{activeLeads.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>💬 แชทที่มีกิจกรรม</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #10b981', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{statusBreakdown['c'] || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#166534' }}>✅ ปิดขายได้</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #f59e0b', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{(statusBreakdown['i'] || 0) + (statusBreakdown['o'] || 0)}</div>
          <div style={{ fontSize: '0.75rem', color: '#92400e' }}>🟡 สนใจ/เสนอราคา</div>
        </div>
        {/* ★ Pending = count as PEOPLE */}
        <div style={{ ...cardStyle, borderTop: '4px solid #dc2626', textAlign: 'center', cursor: 'pointer', outline: showPendingDetail ? '2px solid #dc2626' : 'none' }} onClick={() => setShowPendingDetail(!showPendingDetail)}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{waitingReplyLeads.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>🔴 ค้างตอบ (คน)</div>
          <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>กดเพื่อดูรายชื่อ</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #06b6d4', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#06b6d4' }}>{dayMessages}</div>
          <div style={{ fontSize: '0.75rem', color: '#155e75' }}>💬 ข้อความทั้งวัน</div>
        </div>
      </div>

      {/* ★ Pending Detail Panel (expandable) */}
      {showPendingDetail && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem', borderTop: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>🔴 ลูกค้าค้างตอบ {waitingReplyLeads.length} คน — กรองตาม Tag</h4>
            <button onClick={() => setShowPendingDetail(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
          
          {/* Tag Filter Chips */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <button onClick={() => setTagFilter('all')} style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', border: tagFilter === 'all' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: tagFilter === 'all' ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}>
              ทั้งหมด ({waitingReplyLeads.length})
            </button>
            {QUICK_TAGS.map(qt => {
              const cnt = tagBreakdown[qt.tag] || 0;
              return (
                <button key={qt.tag} onClick={() => setTagFilter(qt.tag)} style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', border: tagFilter === qt.tag ? `2px solid ${qt.color}` : '1px solid #e2e8f0', background: tagFilter === qt.tag ? qt.bg : 'white', cursor: 'pointer', fontSize: '0.7rem' }}>
                  {qt.icon} {qt.tag} {cnt > 0 && <strong>({cnt})</strong>}
                </button>
              );
            })}
          </div>

          {/* Pending Leads List */}
          <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            {filteredPending.map(l => {
              const lastMsg = l.messages[l.messages.length - 1];
              const timeSince = Math.round((Date.now() - new Date(lastMsg.created_at).getTime()) / 60000);
              const timeLabel = timeSince < 60 ? `${timeSince} นาที` : timeSince < 1440 ? `${Math.round(timeSince/60)} ชม.` : `${Math.round(timeSince/1440)} วัน`;
              return (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9', gap: '0.3rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.erp_alias_name || l.original_name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#dc2626' }}>⏰ ค้าง {timeLabel} • {lastMsg.type === 'text' ? lastMsg.text_content?.substring(0, 30) + '...' : '📷 รูปภาพ'}</div>
                  </div>
                  {/* Current Tags */}
                  <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', maxWidth: '200px' }}>
                    {(l.tags || []).map(t => {
                      const qtConf = QUICK_TAGS.find(q => q.tag === t);
                      return (
                        <span key={t} onClick={() => toggleTag(l.id, t)} title="คลิกเพื่อลบ tag" style={{ background: qtConf?.bg || '#f1f5f9', color: qtConf?.color || '#475569', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {qtConf?.icon || '🏷️'} {t} ✕
                        </span>
                      );
                    })}
                  </div>
                  {/* Quick Tag Buttons */}
                  <div style={{ position: 'relative' }}>
                    <select 
                      value="" 
                      onChange={e => { if (e.target.value) toggleTag(l.id, e.target.value); }} 
                      style={{ padding: '0.2rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.65rem', background: '#f8fafc', cursor: 'pointer', width: '70px' }}
                    >
                      <option value="">+ Tag</option>
                      {QUICK_TAGS.filter(qt => !(l.tags || []).includes(qt.tag)).map(qt => (
                        <option key={qt.tag} value={qt.tag}>{qt.icon} {qt.tag}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
            {filteredPending.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>ไม่มีลูกค้าค้างตอบใน tag นี้</p>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Status Funnel */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>📊 สถานะลูกค้าวันนี้</h4>
            {Object.entries(STATUS_MAP).map(([key, conf]) => {
              const count = statusBreakdown[key] || 0;
              const pct = activeLeads.length > 0 ? Math.round(count / activeLeads.length * 100) : 0;
              return (
                <div key={key} style={{ marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.1rem' }}>
                    <span>{conf.icon} {conf.label}</span>
                    <span style={{ fontWeight: 'bold' }}>{count} ราย ({pct}%)</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: conf.color, height: '100%', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.5s' }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tag Summary */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>🏷️ สรุป Tag ทั้งหมด</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {QUICK_TAGS.map(qt => {
                const cnt = leads.filter(l => (l.tags || []).includes(qt.tag)).length;
                return (
                  <div key={qt.tag} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: qt.bg, padding: '0.3rem 0.6rem', borderRadius: '8px', border: `1px solid ${qt.color}20` }}>
                    <span style={{ fontSize: '0.8rem' }}>{qt.icon}</span>
                    <span style={{ fontSize: '0.7rem', color: qt.color, fontWeight: 'bold' }}>{qt.tag}</span>
                    <span style={{ background: qt.color, color: 'white', padding: '0 0.3rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold', minWidth: '18px', textAlign: 'center' }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sales Person */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>👔 ผลงานเซลส์</h4>
            {Object.entries(salesStats).length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>ยังไม่มีข้อมูล</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(salesStats).sort((a, b) => b[1].closed - a[1].closed).map(([name, stats]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${stats.closed > 0 ? '#10b981' : '#f59e0b'}` }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>{name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{stats.total} ราย</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>✅ {stats.closed}</span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>⏳ {stats.pending}</span>
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>❌ {stats.lost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Calendar */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <button onClick={() => setViewMonth(new Date(calYear, calMonth - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>◀</button>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{viewMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</h4>
              <button onClick={() => setViewMonth(new Date(calYear, calMonth + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>▶</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', fontSize: '0.7rem' }}>
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b', padding: '0.3rem' }}>{d}</div>
              ))}
              {calDays.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`}></div>;
                const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const count = getDayStats(day);
                const isSelected = ds === selectedDate;
                const isToday = ds === todayStr;
                return (
                  <div 
                    key={day}
                    onClick={() => { setSelectedDate(ds); setQuickPick('custom'); }}
                    style={{
                      textAlign: 'center', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer',
                      background: isSelected ? '#3b82f6' : count > 10 ? '#dcfce7' : count > 5 ? '#fef3c7' : count > 0 ? '#f8fafc' : 'transparent',
                      color: isSelected ? 'white' : '#1e293b',
                      border: isToday ? '2px solid #3b82f6' : '1px solid transparent',
                      fontWeight: isSelected || isToday ? 'bold' : 'normal',
                    }}
                  >
                    {day}
                    {count > 0 && !isSelected && (
                      <div style={{ fontSize: '0.5rem', color: count > 10 ? '#16a34a' : '#f59e0b' }}>{count}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'center', fontSize: '0.6rem', color: '#64748b' }}>
              <span>⬜ 0</span>
              <span style={{ background: '#f8fafc', padding: '0 0.3rem', borderRadius: '3px' }}>1-5</span>
              <span style={{ background: '#fef3c7', padding: '0 0.3rem', borderRadius: '3px' }}>6-10</span>
              <span style={{ background: '#dcfce7', padding: '0 0.3rem', borderRadius: '3px' }}>10+</span>
            </div>
          </div>

          {/* New Leads List */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>🆕 ลูกค้าใหม่ {new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ({newLeads.length} ราย)</h4>
            <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
              {newLeads.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>ไม่มีลูกค้าใหม่ในวันนี้</p>}
              {newLeads.map(l => {
                const conf = STATUS_MAP[l.sales_status] || STATUS_MAP['i'];
                const firstMsgTime = new Date(l.messages[0].created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b' }}>{l.erp_alias_name || l.original_name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>ทักเวลา {firstMsgTime} • {l.messages.length} ข้อความ</div>
                      <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        {(l.tags || []).map(t => {
                          const qtConf = QUICK_TAGS.find(q => q.tag === t);
                          return <span key={t} style={{ background: qtConf?.bg || '#f1f5f9', color: qtConf?.color || '#475569', padding: '0.05rem 0.3rem', borderRadius: '8px', fontSize: '0.55rem', fontWeight: 'bold' }}>{qtConf?.icon} {t}</span>;
                        })}
                      </div>
                    </div>
                    <span style={{ background: conf.color + '20', color: conf.color, padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {conf.icon} {conf.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
