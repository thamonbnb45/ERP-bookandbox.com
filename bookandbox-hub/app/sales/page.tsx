"use client";
import { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' ? `${window.location.origin}/api` : '';

interface Customer { id: string; name: string; phone: string; email: string; address: string; line_id: string; status: string; }

export default function SalesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'orders' | 'customers' | 'quote'>('orders');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/customers`).then(r => r.json()).catch(() => []),
      fetch(`${API}/job_orders`).then(r => r.json()).catch(() => []),
      fetch(`${API}/dashboard/metrics`).then(r => r.json()).catch(() => null),
    ]).then(([c, o, m]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setOrders(Array.isArray(o) ? o : []);
      setMetrics(m);
      setLoading(false);
    });
  }, []);

  const card = { background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>💰 Sales & เสนอราคา</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>จัดการคำสั่งซื้อ ใบเสนอราคา และลูกค้า</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'คำสั่งซื้อ', value: orders.length, color: '#3b82f6', icon: '📦' },
          { label: 'ลูกค้าในระบบ', value: customers.length, color: '#22c55e', icon: '👥' },
          { label: 'รอชำระ', value: orders.filter((o: any) => o.status === 'pending_payment').length, color: '#f97316', icon: '⏳' },
          { label: 'เสร็จแล้ว', value: orders.filter((o: any) => o.status === 'completed' || o.status === 'shipped').length, color: '#8b5cf6', icon: '✅' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { key: 'orders', label: '📦 คำสั่งซื้อ' },
          { key: 'customers', label: '👥 ลูกค้า' },
          { key: 'quote', label: '📝 สร้างใบเสนอราคา' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: tab === t.key ? '#3b82f6' : '#e2e8f0', color: tab === t.key ? 'white' : '#475569' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ ...card, overflow: 'auto' }}>
        {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>⏳ กำลังโหลด...</div> : (
          tab === 'orders' ? (
            orders.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                <p style={{ fontWeight: 600 }}>ยังไม่มีคำสั่งซื้อ</p>
                <p style={{ fontSize: '0.85rem' }}>คำสั่งซื้อจะมาจากระบบ Chat/LINE หรือสร้างใบเสนอราคา</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'ลูกค้า', 'สินค้า', 'จำนวน', 'ราคารวม', 'สถานะ', 'วันที่'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>#{o.id}</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{o.customer_name || o.customer?.name || '-'}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{o.product_name || o.product?.name || '-'}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>{o.quantity?.toLocaleString()}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>฿{parseFloat(o.total_price || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                          background: o.status === 'completed' ? '#dcfce7' : o.status === 'shipped' ? '#dbeafe' : '#fef9c3',
                          color: o.status === 'completed' ? '#15803d' : o.status === 'shipped' ? '#1d4ed8' : '#a16207' }}>
                          {o.status || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#64748b', fontSize: '0.8rem' }}>{o.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : tab === 'customers' ? (
            customers.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                <p style={{ fontWeight: 600 }}>ลูกค้าจากระบบ Supabase</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['ชื่อ', 'โทร', 'Email', 'สถานะ'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{c.phone || '-'}</td>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#64748b' }}>{c.email || '-'}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{c.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* Quote Builder */
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📝 สร้างใบเสนอราคา</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>ลูกค้า</label>
                  <input type="text" placeholder="ค้นหาชื่อลูกค้า..." style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>ประเภทงาน</label>
                    <select style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <option>ใบปลิว</option><option>โบรชัวร์</option><option>กล่อง</option><option>สติกเกอร์</option><option>นามบัตร</option><option>ปฏิทิน</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>จำนวน</label>
                    <input type="number" defaultValue={1000} style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>รายละเอียด</label>
                  <textarea rows={3} placeholder="ขนาด, กระดาษ, เคลือบ, ไดคัท..." style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', resize: 'vertical' }} />
                </div>
                <button style={{ padding: '0.75rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                  💰 คำนวณราคา & สร้างใบเสนอราคา
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
