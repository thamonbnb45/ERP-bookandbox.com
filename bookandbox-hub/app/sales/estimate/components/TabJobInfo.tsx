"use client";
import { useState } from 'react';
import { EstimateData, JOB_TYPES, STATUS_OPTIONS } from '../types';

const fieldRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' };
const label: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem', display: 'block' };
const input: React.CSSProperties = { width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' };
const select: React.CSSProperties = { ...input, cursor: 'pointer' };
const section: React.CSSProperties = { background: '#fafbfc', borderRadius: '10px', padding: '0.85rem', border: '1px solid #e8ecf0', marginBottom: '0.6rem' };
const sectionTitle: React.CSSProperties = { fontSize: '0.82rem', fontWeight: 700, color: '#0B1320', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.4rem', borderBottom: '1.5px solid rgba(46,196,182,0.15)' };

export default function TabJobInfo({ data, onChange }: { data: EstimateData; onChange: (d: Partial<EstimateData>) => void }) {
  const [customerItems, setCustomerItems] = useState({ paper: false, artwork: false, plate: false, slip: false });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
      {/* Left Column */}
      <div>
        <div style={section}>
          <div style={sectionTitle}>📋 ข้อมูลงาน</div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={label}>งานเลขที่</label>
              <input style={{ ...input, background: '#e2e8f0', fontFamily: 'monospace', fontWeight: 700, color: '#2EC4B6' }} value={data.id} readOnly />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>วันที่ประเมิน</label>
              <input type="date" style={input} value={data.createdAt} onChange={e => onChange({ createdAt: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={label}>ชื่องาน</label>
            <input style={input} value={data.name} onChange={e => onChange({ name: e.target.value })} placeholder="ชื่องาน..." />
          </div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={label}>ลักษณะงาน</label>
              <select style={select} value={data.type} onChange={e => onChange({ type: e.target.value })}>
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>สถานะ</label>
              <select style={select} value={data.status} onChange={e => onChange({ status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>📐 ขนาดสำเร็จ</div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={label}>กว้าง</label>
              <input type="number" step="0.01" style={input} value={data.width} onChange={e => onChange({ width: +e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>ยาว</label>
              <input type="number" step="0.01" style={input} value={data.height} onChange={e => onChange({ height: +e.target.value })} />
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <label style={label}>หน่วย</label>
              <select style={select} value={data.unit} onChange={e => onChange({ unit: e.target.value })}>
                <option>ซม.</option><option>นิ้ว</option>
              </select>
            </div>
          </div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={label}>รูปแบบ</label>
              <select style={select} value={data.orientation} onChange={e => onChange({ orientation: e.target.value })}>
                <option>แนวตั้ง</option><option>แนวนอน</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>การเข้าเล่ม</label>
              <input style={input} value={data.binding} onChange={e => onChange({ binding: e.target.value })} />
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>📄 จำนวนหน้า</div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}><label style={label}>ปก</label><input type="number" style={input} value={data.pagesCover} onChange={e => onChange({ pagesCover: +e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={label}>เนื้อใน</label><input type="number" style={input} value={data.pagesInner} onChange={e => onChange({ pagesInner: +e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={label}>รวม</label><input type="number" style={{ ...input, background: '#e2e8f0', fontWeight: 700 }} value={data.pagesCover + data.pagesInner} readOnly /></div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>📦 ยอดพิมพ์ที่ต้องการ <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>(เพิ่ม/ลดได้)</span></div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {data.quantities.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="number" style={{ ...input, width: '100px', textAlign: 'right', fontWeight: 700 }} value={q}
                  onChange={e => { const nq = [...data.quantities]; nq[i] = +e.target.value; onChange({ quantities: nq }); }} />
                <button onClick={() => onChange({ quantities: data.quantities.filter((_, j) => j !== i) })}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem' }}>✕</button>
              </div>
            ))}
            <button onClick={() => onChange({ quantities: [...data.quantities, 0] })}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px dashed #2EC4B6', background: 'rgba(46,196,182,0.05)', color: '#2EC4B6', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
              + เพิ่ม
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.4rem' }}>หน่วย</div>
        </div>
      </div>

      {/* Right Column */}
      <div>
        <div style={section}>
          <div style={sectionTitle}>👤 ข้อมูลลูกค้า</div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={label}>ชื่อบริษัท/ลูกค้า</label>
            <input style={input} value={data.customer} onChange={e => onChange({ customer: e.target.value })} />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={label}>ชื่อผู้ติดต่อ</label>
            <input style={input} value={data.customerContact} onChange={e => onChange({ customerContact: e.target.value })} />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={label}>สิ่งที่ลูกค้าให้มา</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {Object.entries({ paper: 'กระดาษ', artwork: 'อาร์ตเวิร์ค', plate: 'เพลทพร้อมปรู๊ฟ', slip: 'มี Slip' }).map(([k, v]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={(customerItems as any)[k]} onChange={e => setCustomerItems(p => ({ ...p, [k]: e.target.checked }))} />
                  {v}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>💳 ข้อมูลทางบัญชี</div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}><label style={label}>PO No. (ลูกค้า)</label><input style={input} value={data.poNumber} onChange={e => onChange({ poNumber: e.target.value })} /></div>
          </div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}><label style={label}>รหัสใบแจ้งหนี้</label><input style={input} placeholder="-" /></div>
            <div style={{ flex: 1 }}><label style={label}>รหัสใบเสร็จรับเงิน</label><input style={input} placeholder="-" /></div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>🏢 ข้อมูลภายใน</div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}><label style={label}>พนักงานขาย</label><input style={input} value={data.salesperson} onChange={e => onChange({ salesperson: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={label}>บริษัท</label><input style={input} value={data.company} onChange={e => onChange({ company: e.target.value })} /></div>
          </div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}><label style={label}>ทีม</label><input style={input} value={data.team} onChange={e => onChange({ team: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={label}>ผู้คิดราคา</label><input style={input} value={data.estimator} onChange={e => onChange({ estimator: e.target.value })} /></div>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={label}>สร้างโดย</label>
            <input style={{ ...input, background: '#e2e8f0' }} value={data.createdBy} readOnly />
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>📝 Note</div>
          <textarea style={{ ...input, minHeight: '80px', resize: 'vertical' }} value={data.note} onChange={e => onChange({ note: e.target.value })} placeholder="หมายเหตุ..." />
        </div>
      </div>
    </div>
  );
}
