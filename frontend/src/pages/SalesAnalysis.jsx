import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
const card = { background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

export default function SalesAnalysis() {
  const [tab, setTab] = useState('analysis'); // analysis | matching | dashboard
  const [analysis, setAnalysis] = useState(null);
  const [matching, setMatching] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('issues'); // issues | price | order | all

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, m, d] = await Promise.all([
        axios.get(`${API_URL}/chat-analysis`),
        axios.get(`${API_URL}/sales-matching`),
        axios.get(`${API_URL}/dashboard-stats`),
      ]);
      setAnalysis(a.data);
      setMatching(m.data);
      setDashboard(d.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const STATUS = { i: '🟡สนใจ', o: '🔵เสนอราคา', c: '🟢ปิดขาย', nt: '⚪ไม่ทัก', na: '🔴ไม่ซื้อ', al: '❌หลุด', q: '📋เสนอแล้ว' };
  const tabs = [
    { id: 'analysis', label: '🔍 วิเคราะห์แชท', color: '#7c3aed' },
    { id: 'matching', label: '👔 Sales Matching', color: '#3b82f6' },
    { id: 'dashboard', label: '📊 Dashboard', color: '#10b981' },
  ];

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>⏳ กำลังวิเคราะห์ข้อมูล...</div>;

  return (
    <div className="view-section active" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--primary)' }}><i className="fa-solid fa-magnifying-glass-chart"></i> Sales Intelligence</h2>
        <button onClick={loadAll} className="btn btn-sm btn-primary" style={{ fontSize: '0.8rem' }}><i className="fa-solid fa-rotate"></i> รีเฟรช</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.id ? `2px solid ${t.color}` : '1px solid #e2e8f0',
            background: tab === t.id ? t.color + '15' : 'white', color: tab === t.id ? t.color : '#64748b',
            fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Chat Analysis */}
      {tab === 'analysis' && analysis && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
            {[
              { label: 'มีข้อความ', val: analysis.summary.withMessages, color: '#3b82f6' },
              { label: '💰 พูดถึงราคา', val: analysis.summary.withPriceMention, color: '#f59e0b' },
              { label: '📦 พูดถึงสั่งซื้อ', val: analysis.summary.withOrderMention, color: '#10b981' },
              { label: '📋 มีใบเสนอราคา', val: analysis.summary.withQuotes, color: '#06b6d4' },
              { label: '🛒 มีบันทึกซื้อ', val: analysis.summary.withPurchases, color: '#8b5cf6' },
              { label: '⚠️ มีปัญหา', val: analysis.summary.withIssues, color: '#dc2626' },
            ].map((c, i) => (
              <div key={i} style={{ ...card, borderTop: `3px solid ${c.color}`, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: c.color }}>{c.val}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.8rem' }}>
            {[
              { id: 'issues', label: '⚠️ มีปัญหา', count: analysis.summary.withIssues },
              { id: 'price', label: '💰 พูดถึงราคา', count: analysis.summary.withPriceMention },
              { id: 'order', label: '📦 พูดถึงสั่งซื้อ', count: analysis.summary.withOrderMention },
              { id: 'all', label: '📋 ทั้งหมด', count: analysis.summary.totalLeads },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer',
                border: filter === f.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                background: filter === f.id ? '#eff6ff' : 'white', fontWeight: filter === f.id ? 'bold' : 'normal'
              }}>{f.label} ({f.count})</button>
            ))}
          </div>

          {/* Lead List */}
          <div style={{ ...card, maxHeight: '55vh', overflowY: 'auto' }}>
            {analysis.leads
              .filter(l => {
                if (filter === 'issues') return l.issues.length > 0;
                if (filter === 'price') return l.hasPriceMention;
                if (filter === 'order') return l.hasOrderMention;
                return l.msgCount > 0;
              })
              .map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem' }}>{STATUS[l.status] || l.status}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                    </div>
                    {l.issues.length > 0 && (
                      <div style={{ fontSize: '0.65rem', color: '#dc2626', marginTop: '0.1rem' }}>{l.issues.join(' | ')}</div>
                    )}
                    {l.priceMatches.length > 0 && (
                      <div style={{ fontSize: '0.6rem', color: '#f59e0b', marginTop: '0.1rem' }}>💰 {l.priceMatches.join(', ')}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', fontSize: '0.6rem', flexShrink: 0 }}>
                    <span style={{ background: '#eff6ff', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>💬{l.msgCount}</span>
                    {l.quoteCount > 0 && <span style={{ background: '#d1fae5', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>📋{l.quoteCount}</span>}
                    {l.hasPriceMention && <span style={{ background: '#fef3c7', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>💰</span>}
                    {l.hasOrderMention && <span style={{ background: '#dcfce7', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>📦</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab: Sales Matching */}
      {tab === 'matching' && matching && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {matching.filter(s => s.name !== 'ไม่ระบุ' || s.totalLeads > 5).map(s => (
              <div key={s.name} style={{ ...card, borderLeft: `4px solid ${s.conversionRate > 5 ? '#10b981' : s.totalLeads > 20 ? '#3b82f6' : '#94a3b8'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>👤 {s.name}</h3>
                  <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {s.conversionRate}% Conv.
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem', marginBottom: '0.6rem' }}>
                  <div>👥 Leads: <b>{s.totalLeads}</b></div>
                  <div>💬 แชท: <b>{s.withChat}</b></div>
                  <div>📋 เสนอราคา: <b>{s.withQuote}</b></div>
                  <div>🛒 ปิดขาย: <b>{s.withPurchase}</b></div>
                  <div>📨 ข้อความ: <b>{s.totalMsgs}</b></div>
                  <div>⏱ ตอบเฉลี่ย: <b>{s.avgResponseTime > 0 ? s.avgResponseTime + ' นาที' : '-'}</b></div>
                </div>
                {s.totalRevenue > 0 && (
                  <div style={{ background: '#f0fdf4', padding: '0.3rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#16a34a' }}>
                    💰 ยอดขาย ฿{s.totalRevenue.toLocaleString()}
                  </div>
                )}
                {/* Status breakdown bar */}
                <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.5rem', fontSize: '0.6rem' }}>
                  {Object.entries(s.statusBreakdown).filter(([,v]) => v > 0).map(([k, v]) => (
                    <span key={k} style={{ background: k === 'c' ? '#dcfce7' : k === 'i' ? '#fef3c7' : '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                      {STATUS[k]?.substring(0, 2) || k} {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Dashboard */}
      {tab === 'dashboard' && dashboard && (
        <div>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
            {[
              { label: '👥 Leads ทั้งหมด', val: dashboard.totalLeads, color: '#3b82f6' },
              { label: '💬 ข้อความ', val: dashboard.totalMessages?.toLocaleString(), color: '#7c3aed' },
              { label: '📋 ใบเสนอราคา', val: dashboard.totalQuotes, color: '#f59e0b' },
              { label: '🛒 สั่งซื้อ', val: dashboard.totalPurchases, color: '#10b981' },
              { label: '💰 ยอดขายรวม', val: '฿' + dashboard.totalRevenue.toLocaleString(), color: '#16a34a' },
            ].map((c, i) => (
              <div key={i} style={{ ...card, borderTop: `3px solid ${c.color}`, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: c.color }}>{c.val}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div style={{ ...card, marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>📊 Sales Pipeline</h4>
            {Object.entries(dashboard.pipeline).filter(([,v]) => v > 0).map(([key, count]) => {
              const colors = { i: '#f59e0b', o: '#3b82f6', c: '#10b981', nt: '#94a3b8', na: '#ef4444', al: '#dc2626', q: '#06b6d4' };
              const pct = Math.round(count / dashboard.totalLeads * 100);
              return (
                <div key={key} style={{ marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span>{STATUS[key] || key}</span>
                    <span style={{ fontWeight: 'bold' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: colors[key] || '#94a3b8', height: '100%', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.5s' }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly Trend */}
          <div style={{ ...card }}>
            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>📈 แนวโน้มรายเดือน (12 เดือนล่าสุด)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '0.4rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>เดือน</th>
                    <th style={{ padding: '0.4rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>👥 Leads</th>
                    <th style={{ padding: '0.4rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>📋 เสนอราคา</th>
                    <th style={{ padding: '0.4rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>🛒 ซื้อ</th>
                    <th style={{ padding: '0.4rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>💰 ยอดขาย</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.monthly.map(m => {
                    const [y, mo] = m.month.split('-');
                    const months = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
                    return (
                      <tr key={m.month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.4rem' }}>{months[parseInt(mo)]} {parseInt(y) + 543}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', fontWeight: m.leads > 0 ? 'bold' : 'normal', color: m.leads > 0 ? '#3b82f6' : '#cbd5e1' }}>{m.leads}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', color: m.quotes > 0 ? '#f59e0b' : '#cbd5e1' }}>{m.quotes}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', color: m.purchases > 0 ? '#10b981' : '#cbd5e1' }}>{m.purchases}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: m.revenue > 0 ? 'bold' : 'normal', color: m.revenue > 0 ? '#16a34a' : '#cbd5e1' }}>{m.revenue > 0 ? '฿' + m.revenue.toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
