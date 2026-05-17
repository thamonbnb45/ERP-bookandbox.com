"use client";
import { useState, useEffect } from 'react';

const API = 'https://erp-bookandboxcom-production.up.railway.app/api';

const TABS = [
  { id: 'dispatch', label: '🚚 รถบริษัท', icon: '🚚' },
  { id: 'fuel', label: '⛽ เบิกน้ำมัน', icon: '⛽' },
  { id: '3pl', label: '📦 ขนส่งนอก', icon: '📦' },
  { id: 'dashboard', label: '📊 สรุปต้นทุน', icon: '📊' }
];
const FLEETS = ['ทะเบียน 1กก-1234 (พี่เอก)', 'ทะเบียน 2ขข-5678 (พี่บอย)'];
const PROVIDERS = ['Nim Express', 'Flash Express', 'Lalamove', 'ไปรษณีย์ไทย', 'Messenger'];

const DRIVER_SALARY_HR = 75;
const DEPRECIATION_HR = 60;
const FUEL_RATE_KM = 3.5;

const calcTripCost = (t: any) => {
  if (!t.end_km || !t.start_km || !t.return_time || !t.depart_time) return 0;
  const dist = Math.max(0, t.end_km - t.start_km);
  const hrs = Math.max(0.5, (new Date(t.return_time).getTime() - new Date(t.depart_time).getTime()) / 3600000);
  return Math.round(dist * FUEL_RATE_KM + hrs * (DRIVER_SALARY_HR + DEPRECIATION_HR));
};

export default function LogisticsPage() {
  const [tab, setTab] = useState('dispatch');
  const [trips, setTrips] = useState<any[]>([]);
  const [fuels, setFuels] = useState<any[]>([]);
  const [thirdParty, setThirdParty] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [tripForm, setTripForm] = useState({ fleet: FLEETS[0], type: 'outsource_wip', destinations: [{name: '', type: 'dropoff'}], start_km: '' });
  const [fuelForm, setFuelForm] = useState({ fleet: FLEETS[0], odometer: '', amount_thb: '', liters: '' });
  const [plForm, setPlForm] = useState({ job_ref: '', provider: PROVIDERS[0], tracking_number: '', shipping_cost: '' });

  useEffect(() => { load(); }, []);
  const load = () => {
    fetch(`${API}/logistics/trips`).then(r => r.json()).then(setTrips).catch(() => {});
    fetch(`${API}/logistics/fuel`).then(r => r.json()).then(setFuels).catch(() => {});
    fetch(`${API}/logistics/3pl`).then(r => r.json()).then(setThirdParty).catch(() => {});
    fetch(`${API}/job_orders`).then(r => r.json()).then(setJobOrders).catch(() => {});
  };
  const openTrip = async () => {
    if (!tripForm.start_km) return alert('กรุณาใส่เลขไมล์ตอนออก');
    await fetch(`${API}/logistics/trips`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tripForm, trip_date: new Date().toISOString().split('T')[0] }) });
    alert('เปิดทริปสำเร็จ'); load();
  };
  const closeTrip = async (id: any) => {
    const endKm = prompt("กรอกเลขไมล์ตอนกลับ:"); if (!endKm) return;
    await fetch(`${API}/logistics/trips`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, end_km: parseInt(endKm), status: 'completed' }) });
    load();
  };
  const addFuel = async () => {
    await fetch(`${API}/logistics/fuel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fuelForm, date: new Date().toISOString().split('T')[0] }) });
    alert('บันทึกเบิกน้ำมันสำเร็จ'); setFuelForm({ ...fuelForm, odometer: '', amount_thb: '', liters: '' }); load();
  };
  const add3PL = async () => {
    await fetch(`${API}/logistics/3pl`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...plForm, drop_off_date: new Date().toISOString().split('T')[0] }) });
    alert('บันทึกค่าส่งสำเร็จ'); setPlForm({ ...plForm, job_ref: '', tracking_number: '', shipping_cost: '' }); load();
  };

  const card = { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' };
  const completedTrips = trips.filter(t => t.status === 'completed');
  const pendingTrips = trips.filter(t => t.status === 'pending');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>🚚 Logistics & Fleet</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>ระบบจัดการลอจิสติกส์ รับส่งสินค้า และเบิกน้ำมัน</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '0.5rem 1rem', borderRadius: '12px', border: tab === t.id ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: tab === t.id ? '#eff6ff' : 'white', fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem' }}>{t.icon} {t.label}</button>))}
      </div>

      {tab === 'dispatch' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ ...card, borderTop: '3px solid #3b82f6' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📇 เปิดทริปวิ่งงาน</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={tripForm.fleet} onChange={e => setTripForm({ ...tripForm, fleet: e.target.value })}>{FLEETS.map(f => <option key={f}>{f}</option>)}</select>
              <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={tripForm.type} onChange={e => setTripForm({ ...tripForm, type: e.target.value })}>
                <option value="outsource_wip">นำชิ้นงานไป Outsource</option><option value="material_pickup">ไปรับกระดาษ/วัสดุ</option><option value="customer_delivery">ส่งลูกค้าโดยตรง</option>
              </select>
              {tripForm.destinations.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                  <select style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0' }} value={d.type} onChange={e => { const nd = [...tripForm.destinations]; nd[i] = { ...nd[i], type: e.target.value }; setTripForm({ ...tripForm, destinations: nd }); }}>
                    <option value="dropoff">ไปส่งของ</option><option value="pickup">ไปรับของ</option><option value="purchase">ไปซื้อของ</option>
                  </select>
                  <input style={{ flex: 2, padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0' }} placeholder="ชื่อร้าน / บริษัท" value={d.name} onChange={e => { const nd = [...tripForm.destinations]; nd[i] = { ...nd[i], name: e.target.value }; setTripForm({ ...tripForm, destinations: nd }); }} />
                </div>
              ))}
              <button onClick={() => setTripForm({ ...tripForm, destinations: [...tripForm.destinations, { name: '', type: 'dropoff' }] })} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left' }}>+ เพิ่มจุดหมาย</button>
              <input type="number" style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="เลขไมล์ตอนออก (Start KM)" value={tripForm.start_km} onChange={e => setTripForm({ ...tripForm, start_km: e.target.value })} />
              <button onClick={openTrip} style={{ padding: '0.8rem', borderRadius: '10px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>ออกรถ 💨</button>
            </div>
          </div>
          <div style={{ ...card, borderTop: '3px solid #f59e0b' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📡 สถานะรถวันนี้</h3>
            {pendingTrips.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>ไม่มีรถกำลังวิ่งงาน</p>}
            {pendingTrips.map(t => (
              <div key={t.id} style={{ padding: '0.8rem', border: '1px solid #fed7aa', borderRadius: '8px', background: '#fff7ed', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ color: '#c2410c' }}>{t.fleet}</strong><span style={{ fontSize: '0.7rem', background: '#fed7aa', color: '#9a3412', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>กำลังวิ่ง</span></div>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.3rem 0' }}>ประเภท: {t.type} | ไมล์: {t.start_km} กม.</p>
                <button onClick={() => closeTrip(t.id)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #f97316', background: 'white', color: '#ea580c', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem' }}>ปิดทริป (กลับถึงโรงงาน)</button>
              </div>
            ))}
            {completedTrips.length > 0 && <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '1rem' }}>✓ ทริปที่จบแล้ว</h4>}
            {completedTrips.slice(0, 5).map(t => (<div key={t.id} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', marginTop: '0.5rem', fontSize: '0.8rem' }}><strong>{t.fleet}</strong> — {t.end_km - t.start_km} กม. — <strong style={{ color: '#ef4444' }}>{calcTripCost(t) > 0 ? `~${calcTripCost(t).toLocaleString()} ฿` : ''}</strong></div>))}
          </div>
        </div>
      )}

      {tab === 'fuel' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          <div style={{ ...card, borderTop: '3px solid #ef4444' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>⛽ เบิกค่าน้ำมัน</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={fuelForm.fleet} onChange={e => setFuelForm({ ...fuelForm, fleet: e.target.value })}>{FLEETS.map(f => <option key={f}>{f}</option>)}</select>
              <input type="number" style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="เลขไมล์หน้าปัด" value={fuelForm.odometer} onChange={e => setFuelForm({ ...fuelForm, odometer: e.target.value })} />
              <input type="number" style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="จำนวนเงิน (บาท)" value={fuelForm.amount_thb} onChange={e => setFuelForm({ ...fuelForm, amount_thb: e.target.value })} />
              <input type="number" style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="ลิตร" value={fuelForm.liters} onChange={e => setFuelForm({ ...fuelForm, liters: e.target.value })} />
              <button onClick={addFuel} style={{ padding: '0.8rem', borderRadius: '10px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>บันทึกเบิกน้ำมัน</button>
            </div>
          </div>
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📋 ประวัติเบิกน้ำมัน</h3>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '0.6rem', textAlign: 'left' }}>วันที่</th><th style={{ padding: '0.6rem' }}>รถ</th><th style={{ padding: '0.6rem' }}>ไมล์</th><th style={{ padding: '0.6rem' }}>ลิตร</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>เบิก(฿)</th></tr></thead>
              <tbody>{fuels.map(f => (<tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '0.5rem' }}>{new Date(f.date).toLocaleDateString('th-TH')}</td><td style={{ padding: '0.5rem' }}>{f.fleet}</td><td style={{ padding: '0.5rem' }}>{f.odometer?.toLocaleString()}</td><td style={{ padding: '0.5rem' }}>{f.liters}</td><td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>{f.amount_thb?.toLocaleString()} ฿</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === '3pl' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          <div style={{ ...card, borderTop: '3px solid #22c55e' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📦 บันทึกขนส่งนอก</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={plForm.job_ref} onChange={e => setPlForm({ ...plForm, job_ref: e.target.value })}>
                <option value="">-- เลือก Job Order --</option>{jobOrders.map((j: any) => <option key={j.id} value={`JOB-${j.id}`}>JOB-{j.id} ({j.customer})</option>)}
              </select>
              <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={plForm.provider} onChange={e => setPlForm({ ...plForm, provider: e.target.value })}>{PROVIDERS.map(p => <option key={p}>{p}</option>)}</select>
              <input style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="Tracking Number" value={plForm.tracking_number} onChange={e => setPlForm({ ...plForm, tracking_number: e.target.value })} />
              <input type="number" style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="ค่าจัดส่ง (บาท)" value={plForm.shipping_cost} onChange={e => setPlForm({ ...plForm, shipping_cost: e.target.value })} />
              <button onClick={add3PL} style={{ padding: '0.8rem', borderRadius: '10px', background: '#16a34a', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>บันทึกเข้าระบบ</button>
            </div>
          </div>
          <div style={card}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🚚 ประวัติส่งลูกค้า (3PL)</h3>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '0.6rem', textAlign: 'left' }}>วันที่</th><th style={{ padding: '0.6rem' }}>Job</th><th style={{ padding: '0.6rem' }}>ขนส่ง</th><th style={{ padding: '0.6rem' }}>Tracking</th><th style={{ padding: '0.6rem', textAlign: 'right' }}>ค่าส่ง</th></tr></thead>
              <tbody>{thirdParty.map(p => (<tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '0.5rem' }}>{new Date(p.drop_off_date).toLocaleDateString('th-TH')}</td><td style={{ padding: '0.5rem', fontWeight: 'bold', color: '#2563eb' }}>{p.job_ref}</td><td style={{ padding: '0.5rem' }}><span style={{ background: '#e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>{p.provider}</span></td><td style={{ padding: '0.5rem' }}>{p.tracking_number || '-'}</td><td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>{p.shipping_cost?.toLocaleString()} ฿</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ ...card, borderTop: '3px solid #e11d48', textAlign: 'center' }}><p style={{ color: '#64748b', fontSize: '0.75rem' }}>ค่าน้ำมัน (เดือนนี้)</p><h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#e11d48' }}>{fuels.reduce((s, f) => s + Number(f.amount_thb || 0), 0).toLocaleString()} ฿</h2></div>
          <div style={{ ...card, borderTop: '3px solid #059669', textAlign: 'center' }}><p style={{ color: '#64748b', fontSize: '0.75rem' }}>ค่าส่งนอก (3PL)</p><h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669' }}>{thirdParty.reduce((s, f) => s + Number(f.shipping_cost || 0), 0).toLocaleString()} ฿</h2></div>
          <div style={{ ...card, borderTop: '3px solid #4f46e5', textAlign: 'center' }}><p style={{ color: '#64748b', fontSize: '0.75rem' }}>ต้นทุนวิ่งงาน (ประมาณ)</p><h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4f46e5' }}>{completedTrips.reduce((s, t) => s + calcTripCost(t), 0).toLocaleString()} ฿</h2></div>
          <div style={{ ...card, textAlign: 'center' }}><p style={{ color: '#64748b', fontSize: '0.75rem' }}>จำนวนทริป</p><h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{completedTrips.length}</h2></div>
        </div>
      )}
    </div>
  );
}
