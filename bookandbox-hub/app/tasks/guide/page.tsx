'use client';
export default function TaskGuide() {
  const S = { page: { maxWidth: 700, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '20px' } as React.CSSProperties,
    h1: { fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: '#1e293b' } as React.CSSProperties,
    h2: { fontSize: '1.1rem', fontWeight: 700, color: '#2563eb', marginTop: 24, marginBottom: 8, borderBottom: '2px solid #eff6ff', paddingBottom: 4 } as React.CSSProperties,
    card: { background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 10, border: '1px solid #e5e7eb' } as React.CSSProperties,
    tip: { background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '8px 12px', borderRadius: '0 8px 8px 0', marginBottom: 10, fontSize: '.85rem' } as React.CSSProperties,
    code: { background: '#e0e7ff', padding: '2px 6px', borderRadius: 4, fontWeight: 600, fontSize: '.85rem' } as React.CSSProperties,
  };
  const items = [
    { icon: '🖱️', title: 'ลากการ์ดเปลี่ยนสถานะ', desc: 'กดค้างที่การ์ด → ลากไปคอลัมน์ที่ต้องการ → ปล่อย = สถานะเปลี่ยนทันที + บันทึกเวลาอัตโนมัติ' },
    { icon: '📋', title: 'ดูรายละเอียด + แก้ไข', desc: 'กดที่การ์ด → เปิดแผงด้านขวา → แก้ชื่อ/คน/วัน/สถานะได้เลย (กดข้างนอก = บันทึก)' },
    { icon: '☑️', title: 'Checklist', desc: 'ในแผงรายละเอียด → พิมพ์รายการ → กด + → ติ๊กเมื่อเสร็จ → ดู % ที่แถบสี' },
    { icon: '💬', title: 'Comments', desc: 'แท็บ Comments → เลือก emoji ตัวเอง → พิมพ์ → กดส่ง' },
    { icon: '📊', title: 'Activity Log', desc: 'แท็บ Activity → เห็นทุกการเปลี่ยนแปลง (ใคร ทำอะไร เมื่อไหร่)' },
    { icon: '👤', title: 'กรองงานรายคน', desc: 'กดปุ่ม emoji ที่แถบบน → เห็นเฉพาะงานของคนนั้น' },
    { icon: '📅', title: 'Calendar', desc: 'กดปุ่ม Calendar → ดูงานตามวันกำหนดส่ง → ◀▶ เลื่อนเดือน' },
    { icon: '📄', title: 'Export CSV', desc: 'กดปุ่ม CSV → ดาวน์โหลด → เปิดใน Google Sheets / Excel' },
  ];
  return (
    <div style={S.page}>
      <h1 style={S.h1}>📋 คู่มือใช้งาน Task Tracker V3</h1>
      <p style={{ color: '#64748b', marginBottom: 16, fontSize: '.9rem' }}>คู่มือฉบับย่อ — กดเข้าใช้ที่ <a href="/tasks" style={{ color: '#2563eb', fontWeight: 600 }}>/tasks</a></p>

      <h2 style={S.h2}>วิธีใช้งานหลัก</h2>
      {items.map((it, i) => (
        <div key={i} style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '.95rem' }}>{it.icon} {it.title}</div>
          <div style={{ color: '#475569', fontSize: '.85rem' }}>{it.desc}</div>
        </div>
      ))}

      <h2 style={S.h2}>📱 สั่งงานผ่าน LINE</h2>
      <div style={S.tip}>💡 ไม่ต้องเปิดเว็บ พิมพ์ใน LINE กลุ่มได้เลย!</div>
      <div style={S.card}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div><span style={S.code}>เสร็จ #1</span> → งาน ID 1 เป็น ✅</div>
          <div><span style={S.code}>ติด #2 เครื่องเสีย</span> → งาน ID 2 เป็น 🚨 + บันทึกเหตุผล</div>
          <div><span style={S.code}>เริ่ม #3</span> → งาน ID 3 เป็น ⚙️</div>
        </div>
      </div>

      <h2 style={S.h2}>🔔 แจ้งเตือนอัตโนมัติ</h2>
      <div style={S.card}>
        <div><b>8:00 / 12:00 / 16:00</b> — แจ้งงานค้างเกิน 24 ชม.</div>
        <div><b>9:30</b> — Pre-Meeting Report สรุปงานประจำวัน</div>
      </div>

      <h2 style={S.h2}>❓ คำถามที่พบบ่อย</h2>
      <div style={S.card}>
        <div><b>ลากไม่ได้บนมือถือ?</b> → กดค้าง 0.5 วินาที แล้วค่อยลาก</div>
        <div style={{ marginTop: 4 }}><b>แก้ชื่อแล้วไม่บันทึก?</b> → กดข้างนอกช่อง (blur) ถึงจะบันทึก</div>
        <div style={{ marginTop: 4 }}><b>ดู Task ID?</b> → กดเข้าการ์ด → เห็น ID: #1 ด้านบน</div>
      </div>

      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '.75rem', marginTop: 24 }}>
        BookAndBox ERP — Task Tracker V3 | สร้างเมื่อ 17 พ.ค. 2569
      </div>
    </div>
  );
}
