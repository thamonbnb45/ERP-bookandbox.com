"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';

// Mock Quotation data — derived from approved Estimates
const MOCK_QUOTATIONS = [
  { id: 'QT6905-0201', estimateRef: 'JEG6905-0765', name: 'Annual Report 2026 BnB', customer: 'Goldentime Co.', type: 'หนังสือ Catalog', quantities: [1000, 3000, 5000], prices: [5000, 6000, 7750], status: 'ส่งแล้ว', validUntil: '2026-06-11', createdAt: '2026-05-12', salesperson: 'คุณวิไล' },
  { id: 'QT6905-0200', estimateRef: 'JEG6905-0762', name: 'นามบัตร Team 2026', customer: 'BookAndBox', type: 'นามบัตร', quantities: [500, 1000], prices: [1200, 1800], status: 'ลูกค้าอนุมัติ', validUntil: '2026-06-08', createdAt: '2026-05-10', salesperson: 'คุณวิไล' },
  { id: 'QT6905-0199', estimateRef: 'JEG6905-0761', name: 'ใบปลิว Summer Sale', customer: 'ShopDee Online', type: 'ใบปลิว', quantities: [5000, 10000], prices: [3500, 5200], status: 'ส่งแล้ว', validUntil: '2026-06-07', createdAt: '2026-05-08', salesperson: 'คุณน้ำ' },
  { id: 'QT6905-0198', estimateRef: 'JEG6905-0757', name: 'Menu Book Restaurant', customer: 'TasteGood Ltd.', type: 'หนังสือ Catalog', quantities: [500, 1000], prices: [8500, 12000], status: 'ลูกค้าอนุมัติ', validUntil: '2026-06-03', createdAt: '2026-05-05', salesperson: 'คุณน้ำ' },
  { id: 'QT6905-0197', estimateRef: 'JEG6905-0756', name: 'Plastic Card Member', customer: 'FitClub Gym', type: 'บัตรพลาสติก', quantities: [500, 1000, 2000], prices: [4500, 7000, 11000], status: 'แปลงเป็น JO', validUntil: '2026-06-02', createdAt: '2026-05-03', salesperson: 'คุณวิไล' },
  { id: 'QT6905-0196', estimateRef: 'JEG6905-0764', name: 'Product Brochure Q3', customer: 'PrintMax Ltd.', type: 'โบรชัวร์', quantities: [2000, 5000], prices: [6800, 12500], status: 'ร่าง', validUntil: '2026-06-10', createdAt: '2026-05-11', salesperson: 'คุณน้ำ' },
  { id: 'QT6905-0195', estimateRef: 'JEG6905-0755', name: 'Packaging ครีมบำรุงผิว', customer: 'BeautySkin Co.', type: 'กล่อง', quantities: [5000, 10000], prices: [25000, 42000], status: 'หมดอายุ', validUntil: '2026-05-10', createdAt: '2026-04-28', salesperson: 'คุณวิไล' },
  { id: 'QT6905-0194', estimateRef: 'JEG6905-0760', name: 'แคตตาล็อก Furniture 2026', customer: 'HomeStyle Co.', type: 'หนังสือ Catalog', quantities: [1000, 2000], prices: [18000, 28000], status: 'ปฏิเสธ', validUntil: '2026-05-15', createdAt: '2026-05-06', salesperson: 'คุณน้ำ' },
];

const STATUS_MAP: Record<string, { bg: string; color: string; dot: string }> = {
  'ร่าง':       { bg: 'rgba(148,163,184,0.12)', color: '#64748b', dot: '#94a3b8' },
  'ส่งแล้ว':     { bg: 'rgba(59,130,246,0.1)',   color: '#1d4ed8', dot: '#3b82f6' },
  'ลูกค้าอนุมัติ': { bg: 'rgba(34,197,94,0.1)',    color: '#15803d', dot: '#22c55e' },
  'แปลงเป็น JO': { bg: 'rgba(139,92,246,0.1)',   color: '#7c3aed', dot: '#8b5cf6' },
  'ปฏิเสธ':     { bg: 'rgba(239,68,68,0.1)',     color: '#dc2626', dot: '#ef4444' },
  'หมดอายุ':    { bg: 'rgba(251,186,2,0.1)',     color: '#a16207', dot: '#eab308' },
};

const STATUS_OPTIONS = ['ทั้งหมด', 'ร่าง', 'ส่งแล้ว', 'ลูกค้าอนุมัติ', 'แปลงเป็น JO', 'ปฏิเสธ', 'หมดอายุ'];

export default function QuotationPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ทั้งหมด');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = [...MOCK_QUOTATIONS];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(e => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.customer.toLowerCase().includes(q));
    }
    if (filterStatus !== 'ทั้งหมด') items = items.filter(e => e.status === filterStatus);
    return items;
  }, [search, filterStatus]);

  const stats = useMemo(() => ({
    total: MOCK_QUOTATIONS.length,
    sent: MOCK_QUOTATIONS.filter(e => e.status === 'ส่งแล้ว').length,
    approved: MOCK_QUOTATIONS.filter(e => e.status === 'ลูกค้าอนุมัติ').length,
    converted: MOCK_QUOTATIONS.filter(e => e.status === 'แปลงเป็น JO').length,
    totalValue: MOCK_QUOTATIONS.reduce((sum, q) => sum + (q.prices[0] || 0), 0),
  }), []);

  const card: React.CSSProperties = {
    background: 'white', borderRadius: '16px', padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.03)',
    border: '1px solid rgba(226,232,240,0.8)',
  };

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B1320', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              fontSize: '1.2rem',
            }}>📄</span>
            ใบเสนอราคา — Quotation
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.35rem', fontSize: '0.9rem' }}>จัดการใบเสนอราคาทั้งหมด • สร้างจากใบคิดราคาที่อนุมัติ</p>
        </div>
        <Link href="/sales/estimate" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.7rem 1.5rem', borderRadius: '12px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white', fontWeight: 700, fontSize: '0.9rem',
          textDecoration: 'none', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
        }}>
          ✨ สร้างใบเสนอราคาจาก Estimate
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'ใบเสนอราคาทั้งหมด', value: stats.total, icon: '📄', gradient: 'linear-gradient(135deg, #0B1320, #1a2a44)', textColor: '#60a5fa' },
          { label: 'ส่งลูกค้าแล้ว', value: stats.sent, icon: '📤', gradient: 'linear-gradient(135deg, #1e3a5f, #3b82f6)', textColor: '#93c5fd' },
          { label: 'ลูกค้าอนุมัติ', value: stats.approved, icon: '✅', gradient: 'linear-gradient(135deg, #065f46, #0d9488)', textColor: '#6ee7b7' },
          { label: 'แปลงเป็น JO แล้ว', value: stats.converted, icon: '🏭', gradient: 'linear-gradient(135deg, #3b1d8d, #7c3aed)', textColor: '#c4b5fd' },
          { label: 'มูลค่ารวม (ขั้นต่ำ)', value: `฿${stats.totalValue.toLocaleString()}`, icon: '💰', gradient: 'linear-gradient(135deg, #78350f, #d97706)', textColor: '#fde68a' },
        ].map((s, i) => (
          <div key={i} style={{
            ...card, background: s.gradient, border: 'none', padding: '1.25rem',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '3.5rem', opacity: 0.08 }}>{s.icon}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '0.5rem' }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.textColor }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ ...card, marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', opacity: 0.4 }}>🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่ QT, ชื่องาน, ลูกค้า..."
              style={{
                width: '100%', padding: '0.6rem 1rem 0.6rem 2.25rem',
                borderRadius: '10px', border: '1px solid #e2e8f0',
                outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit', background: '#f8fafc',
              }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0',
              fontSize: '0.85rem', fontFamily: 'inherit', background: '#f8fafc', cursor: 'pointer', outline: 'none', minWidth: '150px',
            }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'ทั้งหมด' ? '📊 สถานะทั้งหมด' : s}</option>)}
          </select>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>พบ {filtered.length} รายการ</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)' }}>
                {[
                  { label: 'เลขที่ QT', w: '130px' },
                  { label: 'Ref. Estimate', w: '130px' },
                  { label: 'ชื่องาน', w: '' },
                  { label: 'ลูกค้า', w: '150px' },
                  { label: 'ประเภท', w: '120px' },
                  { label: 'ราคาเสนอ', w: '150px' },
                  { label: 'สถานะ', w: '120px' },
                  { label: 'ใช้ได้ถึง', w: '100px' },
                  { label: 'เซลส์', w: '80px' },
                ].map(h => (
                  <th key={h.label} style={{
                    padding: '0.85rem 0.75rem', textAlign: 'left', fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', width: h.w || undefined, whiteSpace: 'nowrap',
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                    <div style={{ fontWeight: 600 }}>ไม่พบใบเสนอราคา</div>
                  </td>
                </tr>
              ) : filtered.map((q, idx) => {
                const st = STATUS_MAP[q.status] || STATUS_MAP['ร่าง'];
                const isExpired = new Date(q.validUntil) < new Date();
                return (
                  <tr key={q.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: expandedId === q.id ? '#eff6ff' : idx % 2 === 0 ? 'white' : '#fafbfc',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    onMouseEnter={e => { if (expandedId !== q.id) e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
                    onMouseLeave={e => { if (expandedId !== q.id) e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafbfc'; }}
                  >
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700, fontSize: '0.82rem' }}>
                      {q.id}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <Link href={`/sales/estimate/${q.estimateRef}`} onClick={e => e.stopPropagation()}
                        style={{ fontFamily: 'monospace', color: '#2EC4B6', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600 }}>
                        {q.estimateRef}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{q.name}</td>
                    <td style={{ padding: '0.75rem', color: '#475569' }}>{q.customer}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        background: 'rgba(59,130,246,0.08)', color: '#1d4ed8',
                      }}>{q.type}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {q.quantities.map((qty, i) => (
                          <span key={i} style={{
                            padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                            background: '#f1f5f9', color: '#475569',
                          }}>{qty.toLocaleString()} = ฿{q.prices[i]?.toLocaleString()}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                        background: st.bg, color: st.color,
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot }} />
                        {q.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: isExpired ? '#ef4444' : '#64748b', fontSize: '0.8rem', fontWeight: isExpired ? 700 : 400 }}>
                      {q.validUntil}
                      {isExpired && q.status !== 'หมดอายุ' && q.status !== 'ปฏิเสธ' && q.status !== 'แปลงเป็น JO' && (
                        <span style={{ fontSize: '0.65rem', display: 'block', color: '#ef4444' }}>⚠️ หมดอายุ</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.8rem' }}>{q.salesperson}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem 1.25rem', borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.8rem', color: '#94a3b8',
        }}>
          <span>แสดง {filtered.length} จาก {MOCK_QUOTATIONS.length} รายการ</span>
          <span style={{ fontStyle: 'italic' }}>Quotation System — BookAndBox ERP</span>
        </div>
      </div>

      {/* Flow Description */}
      <div style={{ marginTop: '1.5rem', ...card, background: 'linear-gradient(135deg, #f8fafc, #eff6ff)', padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', color: '#1e293b', fontSize: '0.95rem', fontWeight: 700 }}>
          📋 Flow การทำงาน
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.82rem' }}>
          {[
            { icon: '🧮', label: 'คิดราคา (JE)', color: '#2EC4B6' },
            { icon: '→', label: '', color: '#94a3b8' },
            { icon: '✅', label: 'อนุมัติราคา', color: '#22c55e' },
            { icon: '→', label: '', color: '#94a3b8' },
            { icon: '📄', label: 'สร้างใบเสนอราคา', color: '#3b82f6' },
            { icon: '→', label: '', color: '#94a3b8' },
            { icon: '📤', label: 'ส่งลูกค้า', color: '#f59e0b' },
            { icon: '→', label: '', color: '#94a3b8' },
            { icon: '✅', label: 'ลูกค้าอนุมัติ', color: '#22c55e' },
            { icon: '→', label: '', color: '#94a3b8' },
            { icon: '🏭', label: 'แปลงเป็น JO → ผลิต', color: '#8b5cf6' },
          ].map((s, i) => (
            <span key={i} style={{
              padding: s.label ? '0.3rem 0.6rem' : '0',
              borderRadius: '8px',
              background: s.label ? s.color + '15' : 'transparent',
              color: s.color, fontWeight: 700, fontSize: s.label ? '0.78rem' : '0.9rem',
            }}>{s.icon} {s.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
