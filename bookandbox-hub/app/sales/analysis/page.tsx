"use client";
import { useState, useEffect } from 'react';

const API = 'https://erp-bookandboxcom-production.up.railway.app/api';
const card = { background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' };
const STATUS: Record<string, string> = { i: '🟡สนใจ', o: '🔵เสนอราคา', c: '🟢ปิดขาย', nt: '⚪ไม่ทัก', na: '🔴ไม่ซื้อ', al: '❌หลุด', q: '📋เสนอแล้ว' };

export default function SalesAnalysisPage() {
  const [tab, setTab] = useState('analysis');
  const [analysis, setAnalysis] = useState<any>(null);
  const [matching, setMatching] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('issues');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [aRes, mRes, dRes] = await Promise.allSettled([
        fetch(`${API}/chat-analysis`).then(r => r.json()),
        fetch(`${API}/sales-matching`).then(r => r.json()),
        fetch(`${API}/dashboard-stats`).then(r => r.json()),
      ]);
      const a = aRes.status === 'fulfilled' ? aRes.value : null;
      const m = mRes.status === 'fulfilled' ? mRes.value : [];
      const d = dRes.status === 'fulfilled' ? dRes.value : null;
      // Ensure analysis has required structure
      if (a && a.summary && Array.isArray(a.leads)) {
        setAnalysis(a);
      } else {
        setAnalysis({ summary: { withMessages: 0, withPriceMention: 0, withOrderMention: 0, withQuotes: 0, withPurchases: 0, withIssues: 0, totalLeads: 0 }, leads: [] });
      }
      setMatching(Array.isArray(m) ? m : []);
      if (d && d.pipeline && d.monthly) {
        setDashboard(d);
      } else {
        setDashboard({ totalLeads: 0, totalMessages: 0, totalQuotes: 0, totalPurchases: 0, totalRevenue: 0, pipeline: {}, monthly: [] });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { id: 'analysis', label: '🔍 วิเคราะห์แชท', color: '#7c3aed' },
    { id: 'matching', label: '👔 Sales Matching', color: '#3b82f6' },
    { id: 'dashboard', label: '📊 Dashboard', color: '#10b981' },
  ];

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>⏳ กำลังวิเคราะห์ข้อมูล...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>🔍 Sales Intelligence</h1>
        <button onClick={loadAll} style={{ padding: '0.3rem 0.8rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}>🔄 รีเฟรช</button>
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
        {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: tab === t.id ? `2px solid ${t.color}` : '1px solid #e2e8f0', background: tab === t.id ? t.color + '15' : 'white', color: tab === t.id ? t.color : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>{t.label}</button>))}
      </div>

      {tab === 'analysis' && analysis && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
            {[{ l: 'มีข้อความ', v: analysis.summary.withMessages, c: '#3b82f6' }, { l: '💰 พูดถึงราคา', v: analysis.summary.withPriceMention, c: '#f59e0b' }, { l: '📦 พูดถึงสั่งซื้อ', v: analysis.summary.withOrderMention, c: '#10b981' }, { l: '📋 ใบเสนอราคา', v: analysis.summary.withQuotes, c: '#06b6d4' }, { l: '🛒 บันทึกซื้อ', v: analysis.summary.withPurchases, c: '#8b5cf6' }, { l: '⚠️ มีปัญหา', v: analysis.summary.withIssues, c: '#dc2626' }].map((c, i) => (
              <div key={i} style={{ ...card, borderTop: `3px solid ${c.c}`, textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: c.c }}>{c.v}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.l}</div></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.8rem' }}>
            {[{ id: 'issues', l: '⚠️ มีปัญหา', c: analysis.summary.withIssues }, { id: 'price', l: '💰 ราคา', c: analysis.summary.withPriceMention }, { id: 'order', l: '📦 สั่งซื้อ', c: analysis.summary.withOrderMention }, { id: 'all', l: '📋 ทั้งหมด', c: analysis.summary.totalLeads }].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', border: filter === f.id ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: filter === f.id ? '#eff6ff' : 'white', fontWeight: filter === f.id ? 'bold' : 'normal' }}>{f.l} ({f.c})</button>
            ))}
          </div>
          <div style={{ ...card, maxHeight: '55vh', overflowY: 'auto' }}>
            {analysis.leads.filter((l: any) => { if (filter === 'issues') return l.issues.length > 0; if (filter === 'price') return l.hasPriceMention; if (filter === 'order') return l.hasOrderMention; return l.msgCount > 0; }).map((l: any) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}><span style={{ fontSize: '0.7rem' }}>{STATUS[l.status] || l.status}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span></div>
                  {l.issues.length > 0 && <div style={{ fontSize: '0.65rem', color: '#dc2626', marginTop: '0.1rem' }}>{l.issues.join(' | ')}</div>}
                  {l.priceMatches.length > 0 && <div style={{ fontSize: '0.6rem', color: '#f59e0b', marginTop: '0.1rem' }}>💰 {l.priceMatches.join(', ')}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', fontSize: '0.6rem', flexShrink: 0 }}>
                  <span style={{ background: '#eff6ff', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>💬{l.msgCount}</span>
                  {l.quoteCount > 0 && <span style={{ background: '#d1fae5', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>📋{l.quoteCount}</span>}
                  {l.hasPriceMention && <span style={{ background: '#fef3c7', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>💰</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'matching' && matching && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {matching.filter((s: any) => s.name !== 'ไม่ระบุ' || s.totalLeads > 5).map((s: any) => (
            <div key={s.name} style={{ ...card, borderLeft: `4px solid ${s.conversionRate > 5 ? '#10b981' : s.totalLeads > 20 ? '#3b82f6' : '#94a3b8'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>👤 {s.name}</h3><span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{s.conversionRate}% Conv.</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem', marginBottom: '0.6rem' }}><div>👥 Leads: <b>{s.totalLeads}</b></div><div>💬 แชท: <b>{s.withChat}</b></div><div>📋 เสนอ: <b>{s.withQuote}</b></div><div>🛒 ปิดขาย: <b>{s.withPurchase}</b></div><div>📨 ข้อความ: <b>{s.totalMsgs}</b></div><div>⏱ ตอบ: <b>{s.avgResponseTime > 0 ? s.avgResponseTime + ' นาที' : '-'}</b></div></div>
              {s.totalRevenue > 0 && <div style={{ background: '#f0fdf4', padding: '0.3rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#16a34a' }}>💰 ยอดขาย ฿{s.totalRevenue.toLocaleString()}</div>}
              <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.5rem', fontSize: '0.6rem' }}>{Object.entries(s.statusBreakdown).filter(([, v]) => (v as number) > 0).map(([k, v]) => (<span key={k} style={{ background: k === 'c' ? '#dcfce7' : k === 'i' ? '#fef3c7' : '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{STATUS[k]?.substring(0, 2) || k} {v as number}</span>))}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dashboard' && dashboard && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
            {[{ l: '👥 Leads', v: dashboard.totalLeads, c: '#3b82f6' }, { l: '💬 ข้อความ', v: dashboard.totalMessages?.toLocaleString(), c: '#7c3aed' }, { l: '📋 ใบเสนอราคา', v: dashboard.totalQuotes, c: '#f59e0b' }, { l: '🛒 สั่งซื้อ', v: dashboard.totalPurchases, c: '#10b981' }, { l: '💰 ยอดขายรวม', v: '฿' + dashboard.totalRevenue.toLocaleString(), c: '#16a34a' }].map((c, i) => (
              <div key={i} style={{ ...card, borderTop: `3px solid ${c.c}`, textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: c.c }}>{c.v}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.l}</div></div>
            ))}
          </div>
          <div style={{ ...card, marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>📊 Sales Pipeline</h3>
            {Object.entries(dashboard.pipeline).filter(([, v]) => (v as number) > 0).map(([key, count]) => { const colors: Record<string, string> = { i: '#f59e0b', o: '#3b82f6', c: '#10b981', nt: '#94a3b8', na: '#ef4444', al: '#dc2626', q: '#06b6d4' }; const pct = Math.round((count as number) / dashboard.totalLeads * 100); return (<div key={key} style={{ marginBottom: '0.4rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span>{STATUS[key] || key}</span><span style={{ fontWeight: 'bold' }}>{count as number} ({pct}%)</span></div><div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px' }}><div style={{ background: colors[key] || '#94a3b8', height: '100%', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.5s' }}></div></div></div>); })}
          </div>
          <div style={card}>
            <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem' }}>📈 แนวโน้มรายเดือน</h3>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '0.4rem', textAlign: 'left' }}>เดือน</th><th style={{ padding: '0.4rem', textAlign: 'center' }}>Leads</th><th style={{ padding: '0.4rem', textAlign: 'center' }}>เสนอ</th><th style={{ padding: '0.4rem', textAlign: 'center' }}>ซื้อ</th><th style={{ padding: '0.4rem', textAlign: 'right' }}>ยอดขาย</th></tr></thead>
              <tbody>{dashboard.monthly.map((m: any) => { const [y, mo] = m.month.split('-'); const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']; return (<tr key={m.month} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.4rem' }}>{months[parseInt(mo)]} {parseInt(y) + 543}</td><td style={{ padding: '0.4rem', textAlign: 'center', fontWeight: m.leads > 0 ? 'bold' : 'normal', color: m.leads > 0 ? '#3b82f6' : '#cbd5e1' }}>{m.leads}</td><td style={{ padding: '0.4rem', textAlign: 'center', color: m.quotes > 0 ? '#f59e0b' : '#cbd5e1' }}>{m.quotes}</td><td style={{ padding: '0.4rem', textAlign: 'center', color: m.purchases > 0 ? '#10b981' : '#cbd5e1' }}>{m.purchases}</td><td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: m.revenue > 0 ? 'bold' : 'normal', color: m.revenue > 0 ? '#16a34a' : '#cbd5e1' }}>{m.revenue > 0 ? '฿' + m.revenue.toLocaleString() : '-'}</td></tr>); })}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
