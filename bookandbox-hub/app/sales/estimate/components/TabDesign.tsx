"use client";
import { useState } from 'react';
import { EstimateData } from '../types';

const section: React.CSSProperties = { background: 'rgba(46,196,182,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(46,196,182,0.1)', marginBottom: '1rem' };
const sectionTitle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: '#0B1320', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' };

const PREPRESS_ITEMS = [
  { code: 'PP-001', name: 'ทำเพลท CTP ขนาด 4 หน้ายก', qty: 4, unitPrice: 250, total: 1000 },
  { code: 'PP-002', name: 'ปรู๊ฟสี Digital Proof A3', qty: 2, unitPrice: 150, total: 300 },
  { code: 'PP-003', name: 'ทำฟิล์ม Positive', qty: 1, unitPrice: 500, total: 500 },
];

export default function TabDesign({ data }: { data: EstimateData }) {
  const [subTab, setSubTab] = useState<'prepress' | 'preview'>('prepress');
  const [ppItems, setPpItems] = useState(PREPRESS_ITEMS);
  const [files, setFiles] = useState<{ name: string; detail: string }[]>([]);

  const subTabs = [
    { key: 'prepress', label: '🔧 งานก่อนพิมพ์ (Prepress)' },
    { key: 'preview', label: '🖼️ ภาพตัวอย่างงานพิมพ์' },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: '#f1f5f9', borderRadius: '10px', padding: '0.25rem' }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key as any)}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.82rem', fontFamily: 'inherit', transition: 'all 0.2s',
              background: subTab === t.key ? 'white' : 'transparent',
              color: subTab === t.key ? '#0B1320' : '#64748b',
              boxShadow: subTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'prepress' && (
        <div style={section}>
          <div style={sectionTitle}>🔧 รายการงานก่อนพิมพ์ (Prepress)</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#0B1320' }}>
                  {['No.', 'รหัส', 'รายการ', 'จำนวน', 'ราคา/หน่วย', 'รวม'].map(h => (
                    <th key={h} style={{ padding: '0.6rem', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ppItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#2EC4B6', fontWeight: 600 }}>{item.code}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.qty}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.unitPrice.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#0B1320' }}>{item.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(46,196,182,0.05)' }}>
                  <td colSpan={5} style={{ padding: '0.6rem', fontWeight: 700, textAlign: 'right' }}>รวมทั้งสิ้น</td>
                  <td style={{ padding: '0.6rem', fontWeight: 800, textAlign: 'right', color: '#2EC4B6' }}>
                    ฿{ppItems.reduce((s, x) => s + x.total, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {['เพิ่ม', 'แก้ไข', 'ลบ'].map(btn => (
              <button key={btn} style={{
                padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
              }}>{btn === 'เพิ่ม' ? '➕' : btn === 'แก้ไข' ? '✏️' : '🗑️'} {btn}</button>
            ))}
          </div>
        </div>
      )}

      {subTab === 'preview' && (
        <div style={section}>
          <div style={sectionTitle}>🖼️ ภาพตัวอย่างงานพิมพ์</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Barcode Area */}
            <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '2rem', letterSpacing: '2px', marginBottom: '0.5rem' }}>|||||||||||||||||||||||</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700 }}>{data.id}</div>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>ไฟล์ภาพ</label>
                <input style={{ fontSize: '0.8rem', padding: '0.3rem', border: '1px solid #e2e8f0', borderRadius: '6px', width: '80%' }} value="LogoBlank.gif" readOnly />
              </div>
            </div>
            {/* File Attachments */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>📎 ไฟล์เอกสาร</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['No.', 'รายละเอียด', 'ที่เก็บไฟล์'].map(h => (
                    <th key={h} style={{ padding: '0.4rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {files.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีไฟล์แนบ</td></tr>
                  )}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>
                  📎 แนบไฟล์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
