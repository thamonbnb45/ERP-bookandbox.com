"use client";
import { useState } from 'react';
import Link from 'next/link';
import { MOCK_ESTIMATE, EstimateData, UserRole, ROLE_LABELS } from '../types';
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
  const [tab, setTab] = useState('job');
  const [data, setData] = useState<EstimateData>({ ...MOCK_ESTIMATE });
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link href="/sales/estimate" style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
            ← กลับหน้ารายการ
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1320', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'monospace', color: '#2EC4B6', fontSize: '1.1rem', background: 'rgba(46,196,182,0.08)', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>{data.id}</span>
            {data.name}
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}>{data.status}</span>
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.82rem' }}>{data.customer} • {data.type} • {data.width}×{data.height} {data.unit}</p>
        </div>

        {/* Role Switcher */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.3rem', textAlign: 'center' as const }}>
            🔐 Demo Role
          </div>
          <select value={role} onChange={e => setRole(e.target.value as UserRole)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'inherit', cursor: 'pointer', background: '#f8fafc' }}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1rem',
        background: 'linear-gradient(135deg, #0B1320, #1a2a44)',
        borderRadius: '14px', padding: '0.35rem', overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: '1 1 auto', padding: '0.6rem 0.75rem', borderRadius: '10px',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
              background: tab === t.key ? 'rgba(46,196,182,0.15)' : 'transparent',
              color: tab === t.key ? '#2EC4B6' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
              borderBottom: tab === t.key ? '2px solid #2EC4B6' : '2px solid transparent',
            }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.03)',
        border: '1px solid rgba(226,232,240,0.8)', minHeight: '500px',
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
