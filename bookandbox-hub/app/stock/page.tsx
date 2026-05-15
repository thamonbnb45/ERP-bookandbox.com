"use client";

export default function StockPage() {
  const card = { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B1320' }}>📦 คลังวัตถุดิบ / Stock</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>ติดตามวัตถุดิบคงคลัง ระดับ Safety Stock และการสั่งซื้อ</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'กระดาษ Art Card', stock: '45 ตัน', level: 'ปกติ', color: '#22c55e' },
          { label: 'กระดาษ Offset', stock: '12 ตัน', level: 'ต่ำ ⚠️', color: '#f97316' },
          { label: 'หมึก CMYK', stock: '85 กก.', level: 'ปกติ', color: '#22c55e' },
          { label: 'แม่พิมพ์ CTP', stock: '320 แผ่น', level: 'ปกติ', color: '#22c55e' },
        ].map((item, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${item.color}` }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{item.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1320', marginTop: '0.25rem' }}>{item.stock}</div>
            <div style={{ fontSize: '0.75rem', color: item.color, fontWeight: 600, marginTop: '0.25rem' }}>{item.level}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card }}>
        <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: '#0B1320' }}>🗃️ รายการวัตถุดิบ</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              {['รหัส', 'ชื่อวัตถุดิบ', 'หน่วย', 'คงเหลือ', 'Safety Stock', 'สถานะ'].map(h => (
                <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { code: 'PAP-001', name: 'Art Card 260g (31x43)', unit: 'รีม', qty: 450, safety: 200, ok: true },
              { code: 'PAP-002', name: 'Offset 80g (A4)', unit: 'รีม', qty: 120, safety: 150, ok: false },
              { code: 'PAP-003', name: 'กระดาษลูกฟูก E-Flute', unit: 'แผ่น', qty: 2800, safety: 1000, ok: true },
              { code: 'INK-001', name: 'หมึก Cyan (Heidelberg)', unit: 'กก.', qty: 25, safety: 10, ok: true },
              { code: 'INK-002', name: 'หมึก Magenta (Heidelberg)', unit: 'กก.', qty: 22, safety: 10, ok: true },
              { code: 'INK-003', name: 'หมึก Yellow (Heidelberg)', unit: 'กก.', qty: 18, safety: 10, ok: true },
              { code: 'INK-004', name: 'หมึก Black (Heidelberg)', unit: 'กก.', qty: 20, safety: 10, ok: true },
              { code: 'CTP-001', name: 'แม่พิมพ์ CTP Plate', unit: 'แผ่น', qty: 320, safety: 100, ok: true },
              { code: 'FOI-001', name: 'ฟอยล์ทอง (Gold)', unit: 'ม้วน', qty: 8, safety: 5, ok: true },
              { code: 'GLU-001', name: 'กาว PVA สำหรับปะกล่อง', unit: 'กก.', qty: 45, safety: 20, ok: true },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>{row.code}</td>
                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{row.name}</td>
                <td style={{ padding: '0.6rem 0.5rem', color: '#64748b' }}>{row.unit}</td>
                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{row.qty.toLocaleString()}</td>
                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#94a3b8' }}>{row.safety.toLocaleString()}</td>
                <td style={{ padding: '0.6rem 0.5rem' }}>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                    background: row.ok ? '#dcfce7' : '#fef3c7', color: row.ok ? '#15803d' : '#a16207' }}>
                    {row.ok ? '✅ ปกติ' : '⚠️ ต่ำกว่า Safety'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
