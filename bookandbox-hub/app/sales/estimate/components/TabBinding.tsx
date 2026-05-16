"use client";
import { useState } from 'react';
import { EstimateData } from '../types';

const section: React.CSSProperties = { background: 'rgba(46,196,182,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(46,196,182,0.1)', marginBottom: '1rem' };
const sTitle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: '#0B1320', marginBottom: '0.75rem' };

const BIND_SUBTABS = [
  { key: 'gather', label: '📚 งานเก็บเล่ม' },
  { key: 'bind', label: '📖 งานเข้าเล่ม' },
  { key: 'extra', label: '➕ งานต่อ' },
  { key: 'summary', label: '📊 สรุปงานเข้าเล่ม' },
];

export default function TabBinding({ data }: { data: EstimateData }) {
  const [subTab, setSubTab] = useState('gather');
  const [extraItems, setExtraItems] = useState<{name: string; qty: number; price: number}[]>([]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: '#f1f5f9', borderRadius: '10px', padding: '0.25rem' }}>
        {BIND_SUBTABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.78rem', fontFamily: 'inherit',
              background: subTab === t.key ? 'white' : 'transparent',
              color: subTab === t.key ? '#0B1320' : '#64748b',
              boxShadow: subTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>{t.label}</button>
        ))}
      </div>

      {['gather', 'bind', 'extra'].includes(subTab) && (
        <div style={section}>
          <div style={sTitle}>{BIND_SUBTABS.find(t => t.key === subTab)?.label}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ background: '#0B1320' }}>
              {['รายการ', 'ขนาด', 'จำนวน', ...data.quantities.map(q => q.toLocaleString()), 'หน่วย'].map(h => (
                <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'right', fontSize: '0.75rem' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              <tr><td colSpan={4 + data.quantities.length} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>กดปุ่ม &quot;เพิ่ม&quot; เพื่อเพิ่มรายการ</td></tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {['➕ เพิ่ม', '✏️ แก้ไข', '🗑️ ลบ'].map(btn => (
              <button key={btn} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>{btn}</button>
            ))}
          </div>
        </div>
      )}

      {subTab === 'summary' && (
        <div style={section}>
          <div style={sTitle}>📊 สรุปต้นทุนงานเข้าเล่ม</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ background: '#0B1320' }}>
              {['รายการ', ...data.quantities.map(q => q.toLocaleString()), 'หน่วย'].map(h => (
                <th key={h} style={{ padding: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: h === 'รายการ' ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {['ค่างานเก็บเล่ม', 'ค่างานเข้าเล่ม', 'ค่างานต่อ'].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem' }}>{row}</td>
                  {data.quantities.map((_, qi) => <td key={qi} style={{ padding: '0.5rem', textAlign: 'right' }}>0</td>)}
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
                </tr>
              ))}
              <tr style={{ background: 'rgba(46,196,182,0.08)', borderTop: '2px solid #2EC4B6' }}>
                <td style={{ padding: '0.6rem', fontWeight: 800 }}>รวมทั้งสิ้น</td>
                {data.quantities.map((_, qi) => <td key={qi} style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 800, color: '#2EC4B6' }}>0</td>)}
                <td style={{ padding: '0.6rem', textAlign: 'right', color: '#94a3b8' }}>บาท</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '1.25rem' }}>
            <div style={sTitle}>💰 Extra Cost</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['No.', 'รายการ', 'จำนวน', 'ราคา/หน่วย', 'เป็นเงิน', 'รายละเอียด'].map(h => (
                  <th key={h} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {extraItems.length === 0 && <tr><td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>ไม่มีรายการ Extra Cost</td></tr>}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>➕ เพิ่ม</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
