"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

const API = typeof window !== 'undefined' ? `${window.location.origin}/api` : '';

interface Message { id: number; lead_id: string; sender: string; type: string; text_content: string; media_url?: string; created_at: string; }
interface Lead { id: string; original_name: string; erp_alias_name: string; platform: string; avatar_url?: string; sales_status: string; tags: string[]; messages: Message[]; customer_tier?: string; }

const PLAT: Record<string, { icon: string; color: string }> = {
  line: { icon: '🟢', color: '#06C755' },
  facebook: { icon: '🔵', color: '#0084FF' },
  tiktok: { icon: '⚫', color: '#010101' },
};

function timeAgo(d: string) {
  const h = (Date.now() - new Date(d).getTime()) / 3600000;
  if (h < 1) return `${Math.round(h * 60)}น.`;
  if (h < 24) return `${Math.round(h)}ชม.`;
  return `${Math.round(h / 24)}ว.`;
}

export default function ChatPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [platFilter, setPlatFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chats`);
      const data = await res.json();
      const safe = data.map((l: any) => ({
        ...l,
        tags: Array.isArray(l.tags) ? l.tags : typeof l.tags === 'string' ? (() => { try { return JSON.parse(l.tags); } catch { return []; } })() : [],
        messages: l.messages || [],
      }));
      setLeads(safe);
      if (!activeId && safe.length > 0) setActiveId(safe[0].id);
      setLoading(false);
    } catch { setLoading(false); }
  }, [activeId]);

  useEffect(() => { fetchChats(); const iv = setInterval(fetchChats, 8000); return () => clearInterval(iv); }, [fetchChats]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeId, leads]);

  const activeLead = leads.find(l => l.id === activeId);

  const filtered = leads.filter(l => {
    if (platFilter !== 'all' && (l.platform || 'line') !== platFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (l.erp_alias_name || l.original_name || '').toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const sendMessage = async () => {
    if (!inputRef.current?.value.trim() || !activeId) return;
    const text = inputRef.current.value;
    inputRef.current.value = '';
    setSending(true);
    try {
      await fetch(`${API}/chats/${activeId}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      fetchChats();
    } catch (e) { alert('ส่งไม่สำเร็จ'); }
    setSending(false);
  };

  const getUnread = (l: Lead) => {
    if (!l.messages?.length) return 0;
    const lastAdmin = [...l.messages].reverse().find(m => m.sender === 'admin');
    if (!lastAdmin) return l.messages.filter(m => m.sender === 'client').length;
    return l.messages.filter(m => m.sender === 'client' && new Date(m.created_at) > new Date(lastAdmin.created_at)).length;
  };

  // Stats
  const today = new Date().toDateString();
  const newToday = leads.filter(l => l.messages?.[0] && new Date(l.messages[0].created_at).toDateString() === today).length;
  const pending = leads.filter(l => l.messages?.length && l.messages[l.messages.length - 1].sender === 'client').length;
  const totalActive = leads.filter(l => !['nt', 'na', 'al'].includes(l.sales_status)).length;

  const card: React.CSSProperties = { background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>💬 Chat Center</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.8rem' }}>CRM & Social Chat — {leads.length} รายชื่อ</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[
            { label: 'ลูกค้าใหม่วันนี้', value: newToday, color: '#7c3aed', bg: '#ede9fe' },
            { label: 'แชทค้าง', value: pending, color: '#dc2626', bg: '#fee2e2' },
            { label: 'Active', value: totalActive, color: '#0284c7', bg: '#e0f2fe' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: '10px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: '70px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', color: s.color, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0.75rem', minHeight: 0, overflow: 'hidden' }}>
        {/* Contact List */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Platform tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
            {[
              { key: 'all', label: 'ทั้งหมด', count: leads.length },
              { key: 'line', label: '🟢 LINE', count: leads.filter(l => (l.platform || 'line') === 'line').length },
              { key: 'facebook', label: '🔵 FB', count: leads.filter(l => l.platform === 'facebook').length },
            ].map(t => (
              <button key={t.key} onClick={() => setPlatFilter(t.key)}
                style={{
                  flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                  background: platFilter === t.key ? 'white' : '#f8fafc',
                  borderBottom: platFilter === t.key ? '3px solid #3b82f6' : '3px solid transparent',
                  color: platFilter === t.key ? '#1e293b' : '#94a3b8',
                }}>{t.label} <span style={{ fontSize: '0.65rem', background: platFilter === t.key ? '#3b82f6' : '#cbd5e1', color: 'white', borderRadius: '10px', padding: '0 0.4rem' }}>{t.count}</span></button>
            ))}
          </div>
          {/* Search */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <input placeholder="🔍 ค้นหาชื่อ..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none' }} />
          </div>
          {/* List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>⏳ กำลังโหลด...</div> :
              filtered.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>ไม่พบรายชื่อ</div> :
              filtered.map(lead => {
                const unread = getUnread(lead);
                const lastMsg = lead.messages?.[lead.messages.length - 1];
                const preview = lastMsg ? (lastMsg.type === 'image' ? '📷 รูปภาพ' : lastMsg.text_content?.slice(0, 40) || '') : 'ไม่มีข้อความ';
                const plat = PLAT[lead.platform || 'line'] || PLAT.line;
                return (
                  <div key={lead.id} onClick={() => setActiveId(lead.id)}
                    style={{
                      padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                      background: activeId === lead.id ? '#eff6ff' : 'white',
                      borderLeft: `3px solid ${plat.color}`,
                      transition: 'background 0.15s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                        {lead.avatar_url ? (
                          <img src={lead.avatar_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: plat.color + '20', color: plat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                            {(lead.erp_alias_name || lead.original_name || '?')[0]}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: unread > 0 ? 800 : 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {plat.icon} {lead.erp_alias_name || lead.original_name || 'ไม่ระบุ'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{lastMsg ? timeAgo(lastMsg.created_at) : ''}</span>
                        {unread > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '10px', padding: '0 0.4rem', fontSize: '0.65rem', fontWeight: 700 }}>{unread}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Chat Thread */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeLead ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activeLead.avatar_url ? (
                    <img src={activeLead.avatar_url} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {(activeLead.erp_alias_name || activeLead.original_name || '?')[0]}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeLead.erp_alias_name || activeLead.original_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {(PLAT[activeLead.platform || 'line'] || PLAT.line).icon} {activeLead.platform || 'LINE'} • {activeLead.messages?.length || 0} ข้อความ
                      {activeLead.tags?.length > 0 && activeLead.tags.slice(0, 3).map(t => (
                        <span key={t} style={{ marginLeft: '0.3rem', background: '#f1f5f9', padding: '0.05rem 0.35rem', borderRadius: '6px', fontSize: '0.65rem' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {['I', 'O', 'C', 'NA'].map(s => {
                    const colors: Record<string, string> = { I: '#3b82f6', O: '#f59e0b', C: '#22c55e', NA: '#ef4444' };
                    const labels: Record<string, string> = { I: 'สนใจ', O: 'เสนอราคา', C: 'ปิดขาย', NA: 'ไม่ซื้อ' };
                    const isActive = activeLead.sales_status === s.toLowerCase() || (s === 'I' && activeLead.sales_status === 'i') || (s === 'O' && activeLead.sales_status === 'o') || (s === 'C' && activeLead.sales_status === 'c') || (s === 'NA' && ['nt', 'na', 'al'].includes(activeLead.sales_status));
                    return (
                      <span key={s} style={{
                        padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                        background: isActive ? colors[s] : '#f1f5f9',
                        color: isActive ? 'white' : '#94a3b8',
                      }}>{labels[s]}</span>
                    );
                  })}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: '1rem', background: '#f0f4f8', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(!activeLead.messages || activeLead.messages.length === 0) ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>ยังไม่มีข้อความ</div>
                ) : activeLead.messages.map(msg => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '65%', padding: '0.5rem 0.75rem', borderRadius: isAdmin ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isAdmin ? '#3b82f6' : 'white',
                        color: isAdmin ? 'white' : '#1e293b',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        fontSize: '0.85rem', lineHeight: 1.5,
                      }}>
                        {msg.type === 'image' ? (
                          <img src={msg.media_url} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: '8px' }} alt="" />
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text_content}</div>
                        )}
                        <div style={{ fontSize: '0.6rem', opacity: 0.6, textAlign: 'right', marginTop: '0.2rem' }}>
                          {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input ref={inputRef} type="text" placeholder="พิมพ์ข้อความ..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '20px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.85rem' }}
                />
                <button onClick={sendMessage} disabled={sending}
                  style={{
                    padding: '0.6rem 1.2rem', borderRadius: '20px', background: '#06c755', color: 'white', border: 'none',
                    fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: sending ? 0.5 : 1,
                  }}>{sending ? '⏳' : '📤 ส่ง'}</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>เลือกแชทเพื่อดูข้อความ</p>
              <p style={{ fontSize: '0.85rem' }}>Chat Center เชื่อมต่อ LINE / Facebook / TikTok</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
