"use client";
import { useState } from 'react';
import { EstimateData, PAPER_CATALOG } from '../types';

const section: React.CSSProperties = { background: 'rgba(46,196,182,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(46,196,182,0.1)', marginBottom: '1rem' };
const sTitle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: '#0B1320', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' };

const PROD_SUBTABS = [
  { key: 'plan', label: 'การวางแผน', icon: '📐' },
  { key: 'print', label: 'การพิมพ์', icon: '🖨️' },
  { key: 'plate', label: 'เพลท', icon: '🔲' },
  { key: 'paper', label: 'กระดาษ', icon: '📄' },
  { key: 'fold', label: 'การพับ', icon: '📑' },
  { key: 'coat', label: 'งานเคลือบ', icon: '✨' },
  { key: 'die', label: 'ไดคัท/ปั๊ม', icon: '⚙️' },
  { key: 'summary', label: 'สรุปต้นทุน', icon: '📊' },
];

export default function TabProduction({ data }: { data: EstimateData }) {
  const [subTab, setSubTab] = useState('plan');
  const [showPaperPopup, setShowPaperPopup] = useState(false);
  const [paperSearch, setPaperSearch] = useState('');

  const filteredPaper = PAPER_CATALOG.filter(p =>
    p.code.toLowerCase().includes(paperSearch.toLowerCase()) || p.name.includes(paperSearch)
  );

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', overflowX: 'auto', background: '#f1f5f9', borderRadius: '10px', padding: '0.25rem' }}>
        {PROD_SUBTABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{
              padding: '0.45rem 0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.75rem', fontFamily: 'inherit', whiteSpace: 'nowrap',
              background: subTab === t.key ? 'white' : 'transparent',
              color: subTab === t.key ? '#0B1320' : '#64748b',
              boxShadow: subTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
            }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Plan */}
      {subTab === 'plan' && (
        <div style={section}>
          <div style={sTitle}>📐 การวางแผนการผลิต</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>งานเลขที่</label>
              <input style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#e2e8f0', fontFamily: 'monospace', fontWeight: 700 }} value={data.id} readOnly />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>จำนวนหน้ารวม</label>
              <input style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#e2e8f0' }} value={data.pagesCover + data.pagesInner} readOnly />
            </div>
          </div>
          <div style={{ marginTop: '1rem', background: '#fff', borderRadius: '8px', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>รายการ การวางเลย์เอ้าท์</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['No.', 'รายการ การวางแผน', 'จำนวน'].map(h => (
                  <th key={h} style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr><td style={{ padding: '0.5rem', color: '#94a3b8' }} colSpan={3}>กดปุ่ม &quot;เพิ่ม&quot; เพื่อเพิ่มรายการ</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print */}
      {subTab === 'print' && (
        <div style={section}>
          <div style={sTitle}>🖨️ การพิมพ์</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: '#0B1320' }}>
                {['รายการ', ...data.quantities.map(q => q.toLocaleString() + ' หน่วย'), 'หน่วย'].map(h => (
                  <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.75rem', textAlign: h === 'รายการ' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {['จำนวนยก', 'ค่าเครื่องพิมพ์/ยก', 'ค่าพิมพ์รวม'].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i === 2 ? 'rgba(46,196,182,0.05)' : 'white' }}>
                    <td style={{ padding: '0.5rem', fontWeight: i === 2 ? 700 : 500 }}>{row}</td>
                    {data.quantities.map((_, qi) => (
                      <td key={qi} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: i === 2 ? 700 : 400, color: i === 2 ? '#2EC4B6' : '#1e293b' }}>
                        {i === 2 ? data.costPrint[qi]?.toLocaleString() || '0' : '-'}
                      </td>
                    ))}
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plate */}
      {subTab === 'plate' && (
        <div style={section}>
          <div style={sTitle}>🔲 ค่าเพลท</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: '#0B1320' }}>
                {['รายการ', ...data.quantities.map(q => q.toLocaleString()), 'หน่วย'].map(h => (
                  <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'right' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>ค่าเพลท</td>
                  {data.quantities.map((_, i) => (
                    <td key={i} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>{data.costPlate[i]?.toLocaleString() || '0'}</td>
                  ))}
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paper */}
      {subTab === 'paper' && (
        <div style={section}>
          <div style={{ ...sTitle, justifyContent: 'space-between' }}>
            <span>📄 กระดาษ</span>
            <button onClick={() => setShowPaperPopup(true)} style={{
              padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid #2EC4B6',
              background: 'rgba(46,196,182,0.08)', color: '#2EC4B6', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
            }}>📋 เลือกกระดาษ</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: '#0B1320' }}>
                {['รายการ', ...data.quantities.map(q => q.toLocaleString()), 'หน่วย'].map(h => (
                  <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'right' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr style={{ background: 'rgba(46,196,182,0.05)' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 700 }}>ค่ากระดาษ</td>
                  {data.quantities.map((_, i) => (
                    <td key={i} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 800, color: '#2EC4B6' }}>{data.costPaper[i]?.toLocaleString() || '0'}</td>
                  ))}
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Paper Popup */}
          {showPaperPopup && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowPaperPopup(false)}>
              <div onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '900px', maxHeight: '80vh', overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              }}>
                <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #0B1320, #1a2a44)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700 }}>📋 เลือกกระดาษ</div>
                  <button onClick={() => setShowPaperPopup(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: '1rem' }}>
                  <input value={paperSearch} onChange={e => setPaperSearch(e.target.value)}
                    placeholder="🔍 ค้นหารหัสหรือชื่อกระดาษ..."
                    style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: '0.75rem', fontFamily: 'inherit', outline: 'none' }} />
                  <div style={{ overflowY: 'auto', maxHeight: '50vh' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead><tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        {['No.', 'รหัส', 'ชื่อกระดาษ', 'ราคา/รีม', 'ราคา/กก.', 'วันปรับราคา'].map(h => (
                          <th key={h} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {filteredPaper.map((p, i) => (
                          <tr key={p.code} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(46,196,182,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                            onClick={() => setShowPaperPopup(false)}>
                            <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{i + 1}</td>
                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#2EC4B6', fontWeight: 600 }}>{p.code}</td>
                            <td style={{ padding: '0.5rem' }}>{p.name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{p.priceReem.toLocaleString()}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.priceKg.toLocaleString()}</td>
                            <td style={{ padding: '0.5rem', color: '#64748b' }}>{p.updated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fold/Coat/Die - shared simple layout */}
      {['fold', 'coat', 'die'].includes(subTab) && (
        <div style={section}>
          <div style={sTitle}>{PROD_SUBTABS.find(t => t.key === subTab)?.icon} {PROD_SUBTABS.find(t => t.key === subTab)?.label}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: '#0B1320' }}>
                {['รายการ', ...data.quantities.map(q => q.toLocaleString()), 'หน่วย'].map(h => (
                  <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'right' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>ค่า{PROD_SUBTABS.find(t => t.key === subTab)?.label}</td>
                  {data.quantities.map((_, i) => (
                    <td key={i} style={{ padding: '0.5rem', textAlign: 'right' }}>0</td>
                  ))}
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>➕ เพิ่มรายการ</button>
          </div>
        </div>
      )}

      {/* Summary */}
      {subTab === 'summary' && (
        <div style={section}>
          <div style={sTitle}>📊 สรุปต้นทุนการผลิต</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: '#0B1320' }}>
                {['รายการ', ...data.quantities.map(q => q.toLocaleString()), 'หน่วย'].map(h => (
                  <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: h === 'รายการ' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { label: 'ค่าพิมพ์', data: data.costPrint },
                  { label: 'ค่ากระดาษ', data: data.costPaper },
                  { label: 'ค่าเพลท', data: data.costPlate },
                  { label: 'ค่าพับ', data: data.costFold },
                  { label: 'ค่าเคลือบ', data: data.costCoating },
                  { label: 'ค่าไดคัท/ปั๊ม', data: data.costDieCut },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem' }}>{row.label}</td>
                    {data.quantities.map((_, qi) => (
                      <td key={qi} style={{ padding: '0.5rem', textAlign: 'right' }}>{(row.data[qi] || 0).toLocaleString()}</td>
                    ))}
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(46,196,182,0.08)', borderTop: '2px solid #2EC4B6' }}>
                  <td style={{ padding: '0.6rem', fontWeight: 800 }}>รวมต้นทุนการผลิต</td>
                  {data.quantities.map((_, qi) => {
                    const total = (data.costPrint[qi] || 0) + (data.costPaper[qi] || 0) + (data.costPlate[qi] || 0);
                    return <td key={qi} style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 800, color: '#2EC4B6' }}>{total.toLocaleString()}</td>;
                  })}
                  <td style={{ padding: '0.6rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
