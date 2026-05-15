"use client";
import { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' ? `${window.location.origin}/api` : '';

interface Chat {
  id: string; line_user_id: string; original_name: string; erp_name: string;
  status: string; last_message: string; created_at: string; updated_at: string;
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/chats`).then(r => r.json()).then(d => { setChats(d || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const statusColors: Record<string, { bg: string; label: string }> = {
    new: { bg: '#3b82f6', label: '🆕 ใหม่' },
    lead: { bg: '#f97316', label: '🔥 Lead' },
    customer: { bg: '#22c55e', label: '✅ ลูกค้า' },
    quoted: { bg: '#8b5cf6', label: '💬 เสนอราคาแล้ว' },
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>💬 Chat / LINE CRM</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>จัดการข้อความลูกค้าจาก LINE Official — {chats.length} รายชื่อ</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'ทั้งหมด', value: chats.length, color: '#3b82f6' },
          { label: 'Lead', value: chats.filter(c => c.status === 'lead').length, color: '#f97316' },
          { label: 'ลูกค้า', value: chats.filter(c => c.status === 'customer').length, color: '#22c55e' },
          { label: 'ใหม่', value: chats.filter(c => c.status === 'new').length, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chat List */}
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1rem', minHeight: '500px' }}>
        {/* Contact List */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#1e293b' }}>📋 รายชื่อ ({chats.length})</div>
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>⏳ กำลังโหลด...</div>
            ) : chats.map(chat => {
              const st = statusColors[chat.status] || { bg: '#94a3b8', label: chat.status };
              return (
                <div key={chat.id} onClick={() => setSelected(chat)}
                  style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s',
                    background: selected?.id === chat.id ? '#eff6ff' : 'transparent' }}
                  onMouseEnter={e => { if (selected?.id !== chat.id) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (selected?.id !== chat.id) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{chat.erp_name || chat.original_name || 'ไม่ระบุชื่อ'}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '8px', background: st.bg + '20', color: st.bg, fontWeight: 600 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.last_message || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Detail */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontWeight: 700, color: '#1e293b' }}>{selected.erp_name || selected.original_name}</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>LINE ID: {selected.line_user_id?.slice(0, 15)}... | สถานะ: {selected.status}</p>
              </div>
              <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💬</div>
                <p>ข้อความจะแสดงที่นี่</p>
                <p style={{ fontSize: '0.8rem' }}>เชื่อมต่อกับ LINE Messaging API</p>
              </div>
              <div style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="พิมพ์ข้อความ..." style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} />
                <button style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#06c755', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>ส่ง</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
              <p style={{ fontWeight: 600 }}>เลือกแชทเพื่อดูข้อความ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
