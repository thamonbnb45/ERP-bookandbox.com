"use client";
import { EstimateData } from '../types';

const section: React.CSSProperties = { background: 'rgba(46,196,182,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(46,196,182,0.1)', marginBottom: '1rem' };
const sTitle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: '#0B1320', marginBottom: '0.75rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', textAlign: 'right' as const };

export default function TabShipping({ data }: { data: EstimateData }) {
  const weights = data.quantities.map((q) => (q * 0.00799).toFixed(2));

  return (
    <div>
      <div style={section}>
        <div style={sTitle}>🚚 ค่าขนส่งงานปกติ</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ background: '#0B1320' }}>
              {['รายการ', ...data.quantities.map(q => q.toLocaleString()), 'หน่วย'].map(h => (
                <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: h === 'รายการ' ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem' }}>ยอดพิมพ์</td>
                {data.quantities.map((q, i) => <td key={i} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{q.toLocaleString()}</td>)}
                <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>หน่วย</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem' }}>น้ำหนักงานรวมทั้งหมด</td>
                {weights.map((w, i) => <td key={i} style={{ padding: '0.5rem', textAlign: 'right' }}>{w}</td>)}
                <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>กิโลกรัม</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  คิดค่าขนส่ง กก.ละ
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[300, 500, 1000].map(r => (
                      <span key={r} style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', cursor: 'pointer' }}>{r}</span>
                    ))}
                  </div>
                </td>
                {data.quantities.map((_, i) => <td key={i} style={{ padding: '0.5rem' }}><input style={input} defaultValue="0" /></td>)}
                <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
              <tr style={{ background: 'rgba(46,196,182,0.05)' }}>
                <td style={{ padding: '0.6rem', fontWeight: 700 }}>รวมค่าขนส่งปกติ</td>
                {data.quantities.map((_, i) => <td key={i} style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700 }}>0</td>)}
                <td style={{ padding: '0.6rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={section}>
        <div style={sTitle}>📦 ค่าขนส่งพิเศษ</div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>คิดค่าขนส่งเป็น</label>
          <select style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option>ค่าขนส่งพิเศษ</option><option>ค่าขนส่งต่างจังหวัด</option>
          </select>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.5rem', width: '200px' }}>รวมค่าขนส่งพิเศษ</td>
              {data.quantities.map((_, i) => <td key={i} style={{ padding: '0.5rem' }}><input style={input} defaultValue="0" /></td>)}
              <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8', width: '60px' }}>บาท</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ ...section, background: 'linear-gradient(135deg, rgba(46,196,182,0.08), rgba(11,19,32,0.03))' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.75rem', fontWeight: 800, fontSize: '0.95rem' }}>🚚 ค่าขนส่ง รวมเป็นเงิน</td>
              {data.quantities.map((_, i) => <td key={i} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#2EC4B6' }}>0</td>)}
              <td style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', width: '60px' }}>บาท</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button style={{
          padding: '0.6rem 1.5rem', borderRadius: '10px',
          background: 'linear-gradient(135deg, #2EC4B6, #1a9e92)',
          color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
          boxShadow: '0 4px 12px rgba(46,196,182,0.3)',
        }}>💾 บันทึก</button>
      </div>
    </div>
  );
}
