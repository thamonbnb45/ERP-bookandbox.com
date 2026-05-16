"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MOCK_ESTIMATE, EMPTY_ESTIMATE, EstimateData, UserRole, ROLE_LABELS } from '../types';
import TabJobInfo from '../components/TabJobInfo';
import TabDesign from '../components/TabDesign';
import TabProduction from '../components/TabProduction';
import TabBinding from '../components/TabBinding';
import TabShipping from '../components/TabShipping';
import TabProfit from '../components/TabProfit';

const TABS = [
  { key: 'job', label: 'ข้อมูลงาน', icon: '📋' },
  { key: 'design', label: 'Prepress / ไฟล์งาน', icon: '🎨' },
  { key: 'production', label: 'วางแผนการผลิต', icon: '🏭' },
  { key: 'binding', label: 'งานเข้าเล่ม', icon: '📖' },
  { key: 'shipping', label: 'ค่าขนส่ง', icon: '🚚' },
  { key: 'profit', label: 'สรุปต้นทุน/กำไร', icon: '💰' },
];

export default function EstimateDetailPage() {
  const params = useParams();
  const pageId = params?.id as string;
  const isNew = pageId === 'new';

  const [tab, setTab] = useState('job');
  const [data, setData] = useState<EstimateData>(() => {
    if (isNew) {
      const today = new Date().toISOString().slice(0, 10);
      const seq = String(Math.floor(Math.random() * 9000) + 1000);
      return { ...EMPTY_ESTIMATE, id: `JEG6905-${seq}`, createdAt: today };
    }
    return { ...MOCK_ESTIMATE };
  });
  const [role, setRole] = useState<UserRole>('costing');

  const update = (partial: Partial<EstimateData>) => setData(prev => ({ ...prev, ...partial }));

  const STATUS_MAP: Record<string, { bg: string; color: string }> = {
    'อนุมัติ': { bg: 'rgba(34,197,94,0.15)', color: '#15803d' },
    'รออนุมัติ': { bg: 'rgba(251,186,2,0.15)', color: '#a16207' },
    'อยู่ระหว่างเสนอราคา': { bg: 'rgba(59,130,246,0.15)', color: '#1d4ed8' },
    'ร่าง': { bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
  };
  const st = STATUS_MAP[data.status] || STATUS_MAP['ร่าง'];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header — compact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/sales/estimate" style={{ fontSize: '0.78rem', color: '#94a3b8', textDecoration: 'none' }}>← กลับ</Link>
          {data.id && (
            <span style={{ fontFamily: 'monospace', color: '#2EC4B6', fontSize: '0.9rem', background: 'rgba(46,196,182,0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>{data.id}</span>
          )}
          <span style={{ fontWeight: 700, color: '#0B1320', fontSize: '1.1rem' }}>{isNew ? 'สร้างใบประเมินใหม่' : data.name || 'ไม่มีชื่อ'}</span>
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, background: st.bg, color: st.color }}>{data.status}</span>
        </div>
        {/* Role Switcher — inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>🔐 Role:</span>
          <select value={role} onChange={e => setRole(e.target.value as UserRole)}
            style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontFamily: 'inherit', cursor: 'pointer', background: '#f8fafc' }}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Main Tabs — compact */}
      <div style={{
        display: 'flex', gap: '2px', marginBottom: '0.75rem',
        background: 'linear-gradient(135deg, #0B1320, #1a2a44)',
        borderRadius: '10px', padding: '3px', overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: '1 1 auto', padding: '0.45rem 0.5rem', borderRadius: '8px',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
              fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              background: tab === t.key ? 'rgba(46,196,182,0.15)' : 'transparent',
              color: tab === t.key ? '#2EC4B6' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
              borderBottom: tab === t.key ? '2px solid #2EC4B6' : '2px solid transparent',
            }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Tab Content — less padding */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        border: '1px solid rgba(226,232,240,0.8)',
      }}>
        {tab === 'job' && <TabJobInfo data={data} onChange={update} />}
        {tab === 'design' && <TabDesign data={data} />}
        {tab === 'production' && <TabProduction data={data} />}
        {tab === 'binding' && <TabBinding data={data} />}
        {tab === 'shipping' && <TabShipping data={data} />}
        {tab === 'profit' && <TabProfit data={data} role={role} />}
      </div>
    </div>
  );
}
