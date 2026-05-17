"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ── Mock Data ──────────────────────────────────────────
const MOCK_ESTIMATES = [
  { id: 'JEG6905-0765', name: 'Annual Report 2026 BnB', customer: 'Goldentime Co.', type: 'หนังสือ Catalog', size: '21.00 x 29.70 ซม.', status: 'อนุมัติ', createdAt: '2026-05-11', createdBy: 'ceo789', pages: 80, quantities: [1000, 2000, 3000, 5000] },
  { id: 'JEG6905-0764', name: 'Product Brochure Q3', customer: 'PrintMax Ltd.', type: 'โบรชัวร์', size: '21.00 x 29.70 ซม.', status: 'รออนุมัติ', createdAt: '2026-05-10', createdBy: 'est001', pages: 16, quantities: [2000, 5000] },
  { id: 'JEG6905-0763', name: 'กล่องสินค้า Premium Box', customer: 'TrueBox Co.', type: 'กล่อง', size: '15.00 x 20.00 ซม.', status: 'ร่าง', createdAt: '2026-05-09', createdBy: 'est002', pages: 0, quantities: [3000, 5000, 10000] },
  { id: 'JEG6905-0762', name: 'นามบัตร Team 2026', customer: 'BookAndBox', type: 'นามบัตร', size: '9.00 x 5.50 ซม.', status: 'อนุมัติ', createdAt: '2026-05-08', createdBy: 'ceo789', pages: 2, quantities: [500, 1000] },
  { id: 'JEG6905-0761', name: 'ใบปลิว Summer Sale', customer: 'ShopDee Online', type: 'ใบปลิว', size: '14.80 x 21.00 ซม.', status: 'อนุมัติ', createdAt: '2026-05-07', createdBy: 'est001', pages: 2, quantities: [5000, 10000, 20000] },
  { id: 'JEG6905-0760', name: 'แคตตาล็อก Furniture 2026', customer: 'HomeStyle Co.', type: 'หนังสือ Catalog', size: '21.00 x 29.70 ซม.', status: 'รออนุมัติ', createdAt: '2026-05-06', createdBy: 'est002', pages: 120, quantities: [1000, 2000, 3000] },
  { id: 'JEG6905-0759', name: 'Calendar 2027 Desktop', customer: 'PrintMaster', type: 'ปฏิทิน', size: '15.00 x 21.00 ซม.', status: 'ร่าง', createdAt: '2026-05-05', createdBy: 'ceo789', pages: 14, quantities: [1000, 2000, 5000] },
  { id: 'JEG6905-0758', name: 'สติกเกอร์ QR Code', customer: 'SmartLabel Co.', type: 'สติกเกอร์', size: '5.00 x 5.00 ซม.', status: 'ยกเลิก', createdAt: '2026-05-04', createdBy: 'est001', pages: 1, quantities: [10000, 20000, 50000] },
  { id: 'JEG6905-0757', name: 'Menu Book Restaurant', customer: 'TasteGood Ltd.', type: 'หนังสือ Catalog', size: '18.50 x 26.00 ซม.', status: 'อนุมัติ', createdAt: '2026-05-03', createdBy: 'est002', pages: 24, quantities: [500, 1000, 2000] },
  { id: 'JEG6905-0756', name: 'Plastic Card Member', customer: 'FitClub Gym', type: 'บัตรพลาสติก', size: '8.60 x 5.40 ซม.', status: 'อนุมัติ', createdAt: '2026-05-02', createdBy: 'ceo789', pages: 2, quantities: [500, 1000, 2000, 5000] },
  { id: 'JEG6905-0755', name: 'Packaging ครีมบำรุงผิว', customer: 'BeautySkin Co.', type: 'กล่อง', size: '8.00 x 12.00 ซม.', status: 'รออนุมัติ', createdAt: '2026-05-01', createdBy: 'est001', pages: 0, quantities: [5000, 10000] },
  { id: 'JEG6905-0754', name: 'โปสเตอร์ Concert A2', customer: 'MusicLive Inc.', type: 'โปสเตอร์', size: '42.00 x 59.40 ซม.', status: 'ร่าง', createdAt: '2026-04-30', createdBy: 'est002', pages: 1, quantities: [500, 1000, 3000] },
];

const STATUS_MAP: Record<string, { bg: string; color: string; dot: string }> = {
  'อนุมัติ':   { bg: 'rgba(34,197,94,0.1)',  color: '#15803d', dot: '#22c55e' },
  'รออนุมัติ': { bg: 'rgba(251,186,2,0.12)',  color: '#a16207', dot: '#FEBA02' },
  'ร่าง':      { bg: 'rgba(148,163,184,0.15)',color: '#64748b', dot: '#94a3b8' },
  'ยกเลิก':   { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', dot: '#ef4444' },
};

const JOB_TYPES = ['ทั้งหมด', 'หนังสือ Catalog', 'โบรชัวร์', 'กล่อง', 'นามบัตร', 'ใบปลิว', 'ปฏิทิน', 'สติกเกอร์', 'โปสเตอร์', 'บัตรพลาสติก'];
const STATUS_OPTIONS = ['ทั้งหมด', 'ร่าง', 'รออนุมัติ', 'อนุมัติ', 'ยกเลิก'];

// สถานะการทำรายการ — ตาม Chang system
const DOC_WORKFLOW_OPTIONS = [
  'ทั้งหมด',
  'ผู้สร้างใบประเมิน',
  'สร้างใบเสนอ (ใบเสนอราคาแทน)',
  'แปลงใบเสนอ',
  'คัดลอกจากงานเดิม (Copy Pattern)',
  'ใบเสนอราคา (Quotation)',
  'ใบเรียกเก็บ',
  'ผู้อนุมัติราคา',
];

const TAB_OPTIONS = [
  { key: 'all', label: 'เลือกทั้งหมด', icon: '📋' },
  { key: 'je', label: 'Job ใบคิดราคา', icon: '🧮' },
  { key: 'incoming', label: 'Incoming Request', icon: '📥' },
  { key: 'note', label: 'หมายเหตุข้อมูลฯ', icon: '📝' },
];

export default function EstimateSearchPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ทั้งหมด');
  const [filterType, setFilterType] = useState('ทั้งหมด');
  const [sortField, setSortField] = useState<'createdAt' | 'id'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [docWorkflow, setDocWorkflow] = useState('ทั้งหมด');
  const [activeTab, setActiveTab] = useState('all');

  const filtered = useMemo(() => {
    let items = [...MOCK_ESTIMATES];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(e => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.customer.toLowerCase().includes(q));
    }
    if (filterStatus !== 'ทั้งหมด') items = items.filter(e => e.status === filterStatus);
    if (filterType !== 'ทั้งหมด') items = items.filter(e => e.type === filterType);
    items.sort((a, b) => {
      const v = sortDir === 'asc' ? 1 : -1;
      return a[sortField] > b[sortField] ? v : -v;
    });
    return items;
  }, [search, filterStatus, filterType, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: MOCK_ESTIMATES.length,
    approved: MOCK_ESTIMATES.filter(e => e.status === 'อนุมัติ').length,
    pending: MOCK_ESTIMATES.filter(e => e.status === 'รออนุมัติ').length,
    draft: MOCK_ESTIMATES.filter(e => e.status === 'ร่าง').length,
  }), []);

  const card: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
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
              background: 'linear-gradient(135deg, #2EC4B6, #0B1320)',
              fontSize: '1.2rem',
            }}>🧮</span>
            คิดราคา — Estimate
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.35rem', fontSize: '0.9rem' }}>ค้นหาและจัดการใบประเมินราคาทั้งหมด • Chang Estimate System</p>
        </div>
        <Link href="/sales/estimate/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.7rem 1.5rem', borderRadius: '12px',
          background: 'linear-gradient(135deg, #2EC4B6, #1a9e92)',
          color: 'white', fontWeight: 700, fontSize: '0.9rem',
          textDecoration: 'none', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(46,196,182,0.3)',
          transition: 'all 0.2s',
        }}>
          ✨ สร้างใบประเมินใหม่
        </Link>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'ใบประเมินทั้งหมด', value: stats.total, icon: '📋', gradient: 'linear-gradient(135deg, #0B1320, #1a2a44)', textColor: '#2EC4B6' },
          { label: 'อนุมัติแล้ว', value: stats.approved, icon: '✅', gradient: 'linear-gradient(135deg, #065f46, #0d9488)', textColor: '#6ee7b7' },
          { label: 'รออนุมัติ', value: stats.pending, icon: '⏳', gradient: 'linear-gradient(135deg, #78350f, #d97706)', textColor: '#fde68a' },
          { label: 'ฉบับร่าง', value: stats.draft, icon: '📝', gradient: 'linear-gradient(135deg, #334155, #64748b)', textColor: '#e2e8f0' },
        ].map((s, i) => (
          <div key={i} style={{
            ...card,
            background: s.gradient,
            border: 'none',
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-10px', right: '-10px', fontSize: '3.5rem', opacity: 0.08,
            }}>{s.icon}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '0.5rem' }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.textColor }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ ...card, marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', opacity: 0.4 }}>🔍</span>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่งาน, ชื่องาน, ลูกค้า..."
              style={{
                width: '100%', padding: '0.6rem 1rem 0.6rem 2.25rem',
                borderRadius: '10px', border: '1px solid #e2e8f0',
                outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit',
                background: '#f8fafc',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#2EC4B6'; e.target.style.boxShadow = '0 0 0 3px rgba(46,196,182,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          {/* Status Filter */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0',
              fontSize: '0.85rem', fontFamily: 'inherit', background: '#f8fafc', cursor: 'pointer',
              outline: 'none', minWidth: '130px',
            }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'ทั้งหมด' ? '📊 สถานะทั้งหมด' : s}</option>)}
          </select>
          {/* Type Filter */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{
              padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0',
              fontSize: '0.85rem', fontFamily: 'inherit', background: '#f8fafc', cursor: 'pointer',
              outline: 'none', minWidth: '150px',
            }}>
            {JOB_TYPES.map(t => <option key={t} value={t}>{t === 'ทั้งหมด' ? '📦 ประเภททั้งหมด' : t}</option>)}
          </select>
          {/* Doc Workflow Filter — ตาม Chang */}
          <select value={docWorkflow} onChange={e => setDocWorkflow(e.target.value)}
            style={{
              padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #2EC4B6',
              fontSize: '0.85rem', fontFamily: 'inherit', background: 'rgba(46,196,182,0.05)', cursor: 'pointer',
              outline: 'none', minWidth: '200px', color: '#0B1320', fontWeight: 600,
            }}>
            {DOC_WORKFLOW_OPTIONS.map(d => <option key={d} value={d}>{d === 'ทั้งหมด' ? '📑 สถานะการทำรายการ' : d}</option>)}
          </select>
          {/* Result count */}
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            พบ {filtered.length} รายการ
          </div>
        </div>
        {/* Tabs — ตาม Chang system */}
        <div style={{ display: 'flex', gap: '2px', marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
          {TAB_OPTIONS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                padding: '0.4rem 1rem', borderRadius: '8px',
                border: activeTab === t.key ? '2px solid #2EC4B6' : '1px solid #e2e8f0',
                background: activeTab === t.key ? 'rgba(46,196,182,0.08)' : 'white',
                color: activeTab === t.key ? '#0d9488' : '#64748b',
                fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #0B1320, #1a2a44)' }}>
                {[
                  { key: 'id', label: 'เลขที่งาน', w: '140px' },
                  { key: 'name', label: 'ชื่องาน', w: '' },
                  { key: 'customer', label: 'ลูกค้า', w: '160px' },
                  { key: 'type', label: 'ประเภท', w: '130px' },
                  { key: 'size', label: 'ขนาด', w: '140px' },
                  { key: 'quantities', label: 'ยอดพิมพ์', w: '160px' },
                  { key: 'status', label: 'สถานะ', w: '110px' },
                  { key: 'createdAt', label: 'วันที่', w: '100px' },
                  { key: 'createdBy', label: 'ผู้สร้าง', w: '80px' },
                ].map(h => (
                  <th key={h.key} style={{
                    padding: '0.85rem 0.75rem', textAlign: 'left', fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', letterSpacing: '0.02em',
                    width: h.w || undefined, whiteSpace: 'nowrap',
                    cursor: (h.key === 'id' || h.key === 'createdAt') ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                    onClick={() => {
                      if (h.key === 'id' || h.key === 'createdAt') {
                        if (sortField === h.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setSortField(h.key as any); setSortDir('desc'); }
                      }
                    }}
                  >
                    {h.label}
                    {(h.key === 'id' || h.key === 'createdAt') && (
                      <span style={{ marginLeft: '4px', opacity: sortField === h.key ? 1 : 0.3, fontSize: '0.7rem' }}>
                        {sortField === h.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                    <div style={{ fontWeight: 600 }}>ไม่พบข้อมูลที่ค้นหา</div>
                  </td>
                </tr>
              ) : filtered.map((e, idx) => {
                const st = STATUS_MAP[e.status] || STATUS_MAP['ร่าง'];
                return (
                  <tr key={e.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? 'white' : '#fafbfc',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                    onClick={() => router.push(`/sales/estimate/${e.id}`)}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(46,196,182,0.04)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafbfc')}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <Link href={`/sales/estimate/${e.id}`} style={{
                        fontFamily: 'monospace', color: '#2EC4B6', fontWeight: 700,
                        textDecoration: 'none', fontSize: '0.82rem',
                      }}>
                        {e.id}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{e.name}</td>
                    <td style={{ padding: '0.75rem', color: '#475569' }}>{e.customer}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        background: 'rgba(46,196,182,0.08)', color: '#0d9488',
                      }}>{e.type}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.82rem', fontFamily: 'monospace' }}>{e.size}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {e.quantities.map(q => (
                          <span key={q} style={{
                            padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                            background: '#f1f5f9', color: '#475569',
                          }}>{q.toLocaleString()}</span>
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
                        {e.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.8rem' }}>{e.createdAt}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.8rem' }}>{e.createdBy}</td>
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
          fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <span>แสดง {filtered.length} จาก {MOCK_ESTIMATES.length} รายการ</span>
          <Link href="/sales/quotation" style={{
            padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
            border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.05)', color: '#1d4ed8',
            cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>📄 แปลงเป็นใบเสนอราคา</Link>
          <span style={{ fontStyle: 'italic' }}>Chang Estimate v2.0 — BookAndBox ERP</span>
        </div>
      </div>
    </div>
  );
}
