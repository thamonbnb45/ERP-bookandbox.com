"use client";
import { EstimateData, UserRole } from '../types';

const section: React.CSSProperties = { borderRadius: '12px', padding: '1rem', border: '1px solid rgba(46,196,182,0.1)', marginBottom: '1rem' };

export default function TabProfit({ data, role }: { data: EstimateData; role: UserRole }) {
  const totalCosts = data.quantities.map((_, i) =>
    (data.costDesign?.[i] || 0) + (data.costPrint[i] || 0) + (data.costPaper[i] || 0) +
    (data.costPlate[i] || 0) + (data.costFold[i] || 0) + (data.costCoating[i] || 0) +
    (data.costDieCut[i] || 0) + (data.costBinding[i] || 0) + (data.costShipping[i] || 0)
  );
  const adminCosts = totalCosts.map(c => c * (data.costAdmin / 100));
  const grandTotal = totalCosts.map((c, i) => c + adminCosts[i]);
  const costPerUnit = grandTotal.map((c, i) => data.quantities[i] ? c / data.quantities[i] : 0);
  const profits = data.sellingPrice.map((sp, i) => sp - grandTotal[i]);
  const profitPct = data.sellingPrice.map((sp, i) => grandTotal[i] ? ((sp - grandTotal[i]) / grandTotal[i] * 100) : 0);

  // RBAC: Sales only sees selling price
  if (role === 'sales') {
    return (
      <div>
        <div style={{ ...section, background: 'linear-gradient(135deg, rgba(254,186,2,0.08), rgba(254,186,2,0.02))' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0B1320' }}>💰 ราคาขาย (Sales View)</div>
          <div style={{ padding: '1rem', background: 'rgba(254,186,2,0.05)', borderRadius: '10px', border: '1px solid rgba(254,186,2,0.15)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ borderBottom: '2px solid rgba(254,186,2,0.2)' }}>
                <th style={{ padding: '0.6rem', textAlign: 'left', color: '#a16207' }}>รายการ</th>
                {data.quantities.map(q => <th key={q} style={{ padding: '0.6rem', textAlign: 'right', color: '#a16207' }}>{q.toLocaleString()}</th>)}
                <th style={{ padding: '0.6rem', textAlign: 'right', color: '#a16207' }}>หน่วย</th>
              </tr></thead>
              <tbody>
                <tr><td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>ราคาขาย</td>
                  {data.sellingPrice.map((sp, i) => <td key={i} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#FEBA02' }}>{sp.toLocaleString()}</td>)}
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                </tr>
                <tr><td style={{ padding: '0.5rem', color: '#64748b' }}>ราคาขายต่อหน่วย</td>
                  {data.sellingPrice.map((sp, i) => <td key={i} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{data.quantities[i] ? (sp / data.quantities[i]).toFixed(2) : '-'}</td>)}
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '8px', fontSize: '0.8rem', color: '#92400e' }}>
            🔒 ข้อมูลต้นทุนและกำไรถูกจำกัดสำหรับ Sales — ติดต่อฝ่ายคิดราคาเพื่อดูรายละเอียดเพิ่มเติม
          </div>
        </div>
      </div>
    );
  }

  // HR: only sees salary/benefit costs
  if (role === 'hr') {
    return (
      <div>
        <div style={{ ...section, background: 'rgba(139,92,246,0.04)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0B1320' }}>👥 ผลตอบแทนบุคลากร (HR View)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'ค่าแรงพนักงาน (โดยประมาณ)', value: '฿45,000/เดือน' },
              { label: 'ประกันสังคม', value: '฿2,250/เดือน' },
              { label: 'สวัสดิการ', value: '฿3,500/เดือน' },
              { label: 'ท่องเที่ยวประจำปี', value: '฿5,000/คน/ปี' },
              { label: 'อุปกรณ์', value: '฿2,000/เดือน' },
              { label: 'รวมต่อคน/เดือน', value: '฿57,750' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: i === 5 ? '#8b5cf6' : '#1e293b' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#ede9fe', borderRadius: '8px', fontSize: '0.8rem', color: '#5b21b6' }}>
            🔒 HR สามารถดูได้เฉพาะข้อมูลผลตอบแทนบุคลากร
          </div>
        </div>
      </div>
    );
  }

  // Production: sees material costs but not profit
  const showProfit = role === 'costing';

  const rows = [
    { label: 'ค่าออกแบบและอาร์ตเวิร์ค', data: data.costDesign, show: true },
    { label: 'ค่าพิมพ์', data: data.costPrint, show: true },
    { label: 'ค่ากระดาษ', data: data.costPaper, show: true },
    { label: 'ค่าเพลท', data: data.costPlate, show: true },
    { label: 'ค่าพับ', data: data.costFold, show: true },
    { label: 'ค่าเคลือบ', data: data.costCoating, show: true },
    { label: 'ค่าไดคัท', data: data.costDieCut, show: true },
  ];
  const postPrint = data.quantities.map((_, i) => rows.reduce((s, r) => s + (r.data?.[i] || 0), 0));

  return (
    <div>
      {/* Job Info Summary */}
      <div style={{ ...section, background: 'rgba(11,19,32,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { l: 'งานเลขที่', v: data.id },
            { l: 'ชื่องาน', v: data.name },
            { l: 'ขนาด', v: `${data.width} x ${data.height} ${data.unit}` },
            { l: 'ลูกค้า', v: data.customer },
          ].map((f, i) => (
            <div key={i}><span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{f.l}</span><div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{f.v}</div></div>
          ))}
        </div>
      </div>

      {/* Cost Table */}
      <div style={{ ...section, background: 'white', padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead><tr style={{ background: 'linear-gradient(135deg, #0B1320, #1a2a44)' }}>
            <th style={{ padding: '0.7rem', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>รายการ</th>
            {data.quantities.map(q => <th key={q} style={{ padding: '0.7rem', textAlign: 'right', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{q.toLocaleString()}</th>)}
            <th style={{ padding: '0.7rem', textAlign: 'right', color: 'rgba(255,255,255,0.5)', width: '60px' }}>หน่วย</th>
          </tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem 0.7rem' }}>{row.label}</td>
                {data.quantities.map((_, qi) => <td key={qi} style={{ padding: '0.5rem 0.7rem', textAlign: 'right' }}>{(row.data?.[qi] || 0).toLocaleString()}</td>)}
                <td style={{ padding: '0.5rem 0.7rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
            ))}
            <tr style={{ background: 'rgba(46,196,182,0.05)', borderTop: '2px solid #2EC4B6' }}>
              <td style={{ padding: '0.6rem 0.7rem', fontWeight: 700 }}>รวมหลังพิมพ์</td>
              {postPrint.map((v, i) => <td key={i} style={{ padding: '0.6rem 0.7rem', textAlign: 'right', fontWeight: 700, color: '#2EC4B6' }}>{v.toLocaleString()}</td>)}
              <td style={{ padding: '0.6rem 0.7rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
            </tr>
            {['งานเข้าเล่ม', 'ค่าขนส่ง'].map((label, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem 0.7rem' }}>{label}</td>
                {data.quantities.map((_, qi) => <td key={qi} style={{ padding: '0.5rem 0.7rem', textAlign: 'right' }}>{(ri === 0 ? data.costBinding : data.costShipping)[qi]?.toLocaleString() || '0'}</td>)}
                <td style={{ padding: '0.5rem 0.7rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
            ))}
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.5rem 0.7rem' }}>ค่าใช้จ่ายบริหาร <span style={{ color: '#FEBA02' }}>{data.costAdmin}%</span></td>
              {adminCosts.map((v, i) => <td key={i} style={{ padding: '0.5rem 0.7rem', textAlign: 'right' }}>{v.toLocaleString()}</td>)}
              <td style={{ padding: '0.5rem 0.7rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
            </tr>
            <tr style={{ background: '#0B1320' }}>
              <td style={{ padding: '0.75rem', fontWeight: 800, color: 'white' }}>ต้นทุนรวม</td>
              {grandTotal.map((v, i) => <td key={i} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: '#2EC4B6', fontSize: '0.95rem' }}>{v.toLocaleString()}</td>)}
              <td style={{ padding: '0.75rem', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>บาท</td>
            </tr>
            <tr style={{ background: 'rgba(11,19,32,0.03)' }}>
              <td style={{ padding: '0.5rem 0.7rem', fontWeight: 600 }}>ต้นทุนรวมต่อหน่วย</td>
              {costPerUnit.map((v, i) => <td key={i} style={{ padding: '0.5rem 0.7rem', textAlign: 'right', fontWeight: 600 }}>{v.toFixed(2)}</td>)}
              <td style={{ padding: '0.5rem 0.7rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
            </tr>

            {showProfit && (<>
              <tr style={{ borderTop: '3px solid #FEBA02', background: 'rgba(254,186,2,0.05)' }}>
                <td style={{ padding: '0.5rem 0.7rem', fontWeight: 600 }}>บวกเปอร์เซ็นต์กำไร</td>
                {profitPct.map((v, i) => <td key={i} style={{ padding: '0.5rem 0.7rem', textAlign: 'right', fontWeight: 600, color: '#FEBA02' }}>{v.toFixed(1)}%</td>)}
                <td style={{ padding: '0.5rem 0.7rem', textAlign: 'right', color: '#94a3b8' }}>%</td>
              </tr>
              <tr style={{ background: 'linear-gradient(135deg, rgba(254,186,2,0.15), rgba(254,186,2,0.05))' }}>
                <td style={{ padding: '0.75rem', fontWeight: 800, fontSize: '1rem' }}>💰 ราคาขาย</td>
                {data.sellingPrice.map((sp, i) => <td key={i} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#d97706' }}>{sp.toLocaleString()}</td>)}
                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem 0.7rem', color: '#64748b' }}>ราคาขายต่อหน่วย</td>
                {data.sellingPrice.map((sp, i) => <td key={i} style={{ padding: '0.5rem 0.7rem', textAlign: 'right', fontWeight: 600 }}>{data.quantities[i] ? (sp / data.quantities[i]).toFixed(2) : '-'}</td>)}
                <td style={{ padding: '0.5rem 0.7rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
              <tr style={{ background: profits.every(p => p >= 0) ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 800 }}>📈 กำไร</td>
                {profits.map((p, i) => <td key={i} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: p >= 0 ? '#15803d' : '#dc2626' }}>{p.toLocaleString()}</td>)}
                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
            </>)}

            {!showProfit && (
              <tr style={{ background: 'rgba(254,186,2,0.05)' }}>
                <td colSpan={data.quantities.length + 2} style={{ padding: '1rem', fontSize: '0.82rem', color: '#92400e' }}>
                  🔒 ข้อมูลกำไรและราคาขายถูกจำกัด — Production สามารถดูได้เฉพาะต้นทุนวัตถุดิบและค่าแรง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      {showProfit && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[
            { label: '💵 ใบเสนอราคา', bg: '#FEBA02', color: '#1e293b' },
            { label: '📊 รายละเอียดต้นทุน', bg: '#0B1320', color: 'white' },
            { label: '💾 บันทึก', bg: '#2EC4B6', color: 'white' },
            { label: '🖨️ พิมพ์', bg: '#64748b', color: 'white' },
          ].map(btn => (
            <button key={btn.label} style={{
              padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: btn.bg, color: btn.color, fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>{btn.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
