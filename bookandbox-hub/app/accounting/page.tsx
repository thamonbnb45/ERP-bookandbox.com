"use client";
import { useState, useEffect } from 'react';

const API = typeof window !== 'undefined' ? `${window.location.origin}/api` : '';

export default function AccountingPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/dashboard/metrics`).then(r => r.json()).then(d => { setMetrics(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const card = { background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>📒 บัญชีการเงิน</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>ตรวจสอบรายรับ-รายจ่าย Reconcile ยอดบัญชี</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'รายรับรวม', value: metrics?.totalRevenue ? `฿${parseFloat(metrics.totalRevenue).toLocaleString()}` : '฿0', color: '#22c55e', icon: '💰' },
          { label: 'คำสั่งซื้อทั้งหมด', value: metrics?.totalOrders || 0, color: '#3b82f6', icon: '📦' },
          { label: 'ยอดเรียกเก็บรอชำระ', value: metrics?.pendingPayments || 0, color: '#f97316', icon: '⏳' },
          { label: 'ชำระแล้ว', value: metrics?.completedOrders || 0, color: '#8b5cf6', icon: '✅' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bank Feed Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div style={{ ...card, borderTop: '4px solid #22c55e' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>🏦 เงินเข้าบัญชีธนาคาร (Statement)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>วันที่</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#475569' }}>จำนวนเงิน</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>ต้นทาง</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: '15/05/2569', amount: 45000, from: 'บจก. มูส เทรดดิ้ง' },
                { date: '14/05/2569', amount: 12500, from: 'บจก. ฟินน์ ครีเอชั่น' },
                { date: '14/05/2569', amount: 8900, from: 'โอน PromptPay' },
              ].map((tx, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', color: '#64748b' }}>{tx.date}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>+฿{tx.amount.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}>{tx.from}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #3b82f6', color: '#3b82f6', background: 'white', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Match</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ ...card, borderTop: '4px solid #f97316' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>📄 บิลรอชำระ (Unmatched)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>เลขที่</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>ลูกค้า</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#475569' }}>ยอดเรียกเก็บ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { inv: 'INV-2569-0042', customer: 'บจก. ABC Trading', amount: 35000 },
                { inv: 'INV-2569-0041', customer: 'ร้าน XYZ Design', amount: 8500 },
                { inv: 'INV-2569-0039', customer: 'บจก. สยามพาณิชย์', amount: 125000 },
              ].map((inv, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>{inv.inv}</td>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{inv.customer}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>฿{inv.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit System */}
      <div style={{ ...card, marginTop: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>🏷️ ระบบเครดิต (ผลิตก่อนจ่าย)</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>สำหรับลูกค้าเครดิตที่เซ็นสัญญากับฝ่ายขาย</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              {['ใบสั่งงาน', 'ลูกค้า', 'ยอดเงิน', 'วงเงินคงเหลือ', 'อนุมัติ'].map(h => (
                <th key={h} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { jo: 'JOG6905-0280', customer: 'บจก. บุ๊คกิ้ง โกลน์', amount: 2000, credit: 150000 },
              { jo: 'JOG6905-0275', customer: 'บจก. มูส เทรดดิ้ง', amount: 45000, credit: 80000 },
            ].map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>{c.jo}</td>
                <td style={{ padding: '0.5rem', fontWeight: 600 }}>{c.customer}</td>
                <td style={{ padding: '0.5rem' }}>฿{c.amount.toLocaleString()}</td>
                <td style={{ padding: '0.5rem', color: '#16a34a', fontWeight: 600 }}>฿{c.credit.toLocaleString()}</td>
                <td style={{ padding: '0.5rem' }}>
                  <button style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', background: '#22c55e', color: 'white', border: 'none', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>✅ ปล่อยผลิต</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
