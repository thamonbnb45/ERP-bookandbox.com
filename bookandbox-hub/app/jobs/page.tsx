"use client";
import { useState, useEffect, useCallback } from 'react';

const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api`)
  : 'http://localhost:4001/api';

const TYPE_COLORS: Record<string, string> = {
  'ใบปลิว': '#3b82f6', 'โบรชัวร์': '#8b5cf6', 'กล่อง': '#f97316',
  'สติกเกอร์': '#ef4444', 'นามบัตร': '#22c55e', 'ป้ายสินค้า': '#eab308',
  'ปฏิทิน': '#06b6d4', 'Sameday': '#ec4899', 'ซองจดหมาย': '#6366f1',
  'บิล': '#78716c', 'หนังสือ': '#14b8a6', 'แฟ้ม': '#a855f7',
  'default': '#94a3b8'
};

function getTypeColor(type: string) {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type?.includes(key)) return color;
  }
  return TYPE_COLORS.default;
}

function formatMoney(n: number) {
  if (!n) return '-';
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface JO {
  id: number; jog_no: string; sog_no: string; ref: string;
  order_date: string; customer: string; salesperson: string;
  job_name: string; job_type: string; qty: number;
  amount: number; profit: number; year: string; status: string;
}

interface Stats {
  summary: { total_jo: string; total_customers: string; total_sales: string; total_revenue: string; total_profit: string; total_qty: string };
  by_type: { job_type: string; count: string; revenue: string }[];
  by_sales: { salesperson: string; count: string; revenue: string }[];
  by_year: { year: string; count: string; revenue: string }[];
}

export default function JobsPage() {
  const [data, setData] = useState<JO[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [salesFilter, setSalesFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [view, setView] = useState<'table' | 'summary'>('table');
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (yearFilter) params.set('year', yearFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (salesFilter) params.set('salesperson', salesFilter);
      const res = await fetch(`${API_URL}/jo?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, yearFilter, typeFilter, salesFilter]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/jo/stats`);
      const json = await res.json();
      setStats(json);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); fetchStats(); }, [fetchData]);

  const handleSeed = async () => {
    if (!confirm('ต้องการนำเข้าข้อมูล JO จาก Excel (8,640 รายการ)?')) return;
    setSeeding(true);
    try {
      const res = await fetch(`${API_URL}/jo/seed`);
      const json = await res.json();
      alert(json.message || JSON.stringify(json));
      fetchData();
      fetchStats();
    } catch (e: any) { alert('Error: ' + e.message); }
    setSeeding(false);
  };

  const totalPages = Math.ceil(total / limit);

  const cardStyle = { background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 ใบสั่งงาน (Job Orders)
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
            รวม {total.toLocaleString()} รายการ | ข้อมูลจากระบบ ช้าง ERP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setView('table')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: view === 'table' ? '#3b82f6' : '#e2e8f0', color: view === 'table' ? 'white' : '#475569' }}>
            📊 ตาราง
          </button>
          <button onClick={() => setView('summary')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: view === 'summary' ? '#3b82f6' : '#e2e8f0', color: view === 'summary' ? 'white' : '#475569' }}>
            📈 สรุป
          </button>
          <button onClick={handleSeed} disabled={seeding}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: '#7c3aed', color: 'white', opacity: seeding ? 0.5 : 1 }}>
            {seeding ? '⏳ กำลังนำเข้า...' : '📥 นำเข้าข้อมูล JO'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ ...cardStyle, borderTop: '3px solid #3b82f6' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ใบสั่งงานทั้งหมด</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{parseInt(stats.summary.total_jo).toLocaleString()}</div>
          </div>
          <div style={{ ...cardStyle, borderTop: '3px solid #22c55e' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ลูกค้า</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{parseInt(stats.summary.total_customers).toLocaleString()}</div>
          </div>
          <div style={{ ...cardStyle, borderTop: '3px solid #f97316' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ยอดรวม</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>฿{formatMoney(parseFloat(stats.summary.total_revenue))}</div>
          </div>
          <div style={{ ...cardStyle, borderTop: '3px solid #06b6d4' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>พนักงานขาย</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{parseInt(stats.summary.total_sales).toLocaleString()}</div>
          </div>
        </div>
      )}

      {view === 'summary' && stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* By Type */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>🏷️ แยกตามประเภทงาน</h3>
            {stats.by_type.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getTypeColor(t.job_type), display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>{t.job_type || '(ไม่ระบุ)'}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>{parseInt(t.count).toLocaleString()} งาน</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>฿{formatMoney(parseFloat(t.revenue))}</span>
                </div>
              </div>
            ))}
          </div>
          {/* By Sales */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>👤 แยกตามพนักงานขาย</h3>
            {stats.by_sales.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 600 }}>{s.salesperson}</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>{parseInt(s.count).toLocaleString()} งาน</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>฿{formatMoney(parseFloat(s.revenue))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Search + Filters */}
          <div style={{ ...cardStyle, marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="🔍 ค้นหา JOG, ลูกค้า, ชื่องาน, เซลส์..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ flex: '1 1 250px', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
            <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <option value="">ทุกปี</option>
              <option value="2568">ปี 2568</option>
              <option value="2569">ปี 2569</option>
            </select>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <option value="">ทุกประเภท</option>
              <option value="ใบปลิว">ใบปลิว</option>
              <option value="กล่อง">กล่อง</option>
              <option value="โบรชัวร์">โบรชัวร์</option>
              <option value="สติกเกอร์">สติกเกอร์</option>
              <option value="นามบัตร">นามบัตร</option>
              <option value="ป้าย">ป้ายสินค้า</option>
              <option value="Sameday">Sameday</option>
              <option value="บิล">บิล/ใบเสร็จ</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ ...cardStyle, overflow: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>⏳ กำลังโหลด...</div>
            ) : data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ fontWeight: 600 }}>ยังไม่มีข้อมูล JO</p>
                <p style={{ fontSize: '0.85rem' }}>กดปุ่ม {'"'}📥 นำเข้าข้อมูล JO{'"'} เพื่อ import จาก Excel</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['เลขที่ JOG', 'วันที่', 'ลูกค้า', 'ชื่องาน', 'ประเภท', 'จำนวน', 'ยอดเงิน', 'เซลส์'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((jo, i) => (
                    <tr key={jo.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>{jo.jog_no}</td>
                      <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap', color: '#64748b' }}>{jo.order_date}</td>
                      <td style={{ padding: '0.6rem 0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{jo.customer}</td>
                      <td style={{ padding: '0.6rem 0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jo.job_name}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        {jo.job_type && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: getTypeColor(jo.job_type) + '20', color: getTypeColor(jo.job_type) }}>{jo.job_type}</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>{jo.qty?.toLocaleString() || '-'}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{jo.amount ? `฿${formatMoney(jo.amount)}` : '-'}</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jo.salesperson}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.85rem', background: 'white' }}>← ก่อน</button>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>หน้า {page} / {totalPages} ({total.toLocaleString()} รายการ)</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.85rem', background: 'white' }}>ถัดไป →</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
