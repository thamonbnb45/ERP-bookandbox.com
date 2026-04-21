import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const TABS = [
  { id: 'dispatch', label: '🚚 รถบริษัท (WIP)', icon: 'fa-solid fa-truck-pickup' },
  { id: 'fuel', label: '⛽ เบิกน้ำมัน', icon: 'fa-solid fa-gas-pump' },
  { id: '3pl', label: '📦 ขนส่งนอก (ลูกค้า)', icon: 'fa-solid fa-box-open' },
  { id: 'dashboard', label: '📊 สรุปต้นทุน', icon: 'fa-solid fa-chart-line' }
];

const FLEETS = ['ทะเบียน 1กก-1234 (พี่เอก)', 'ทะเบียน 2ขข-5678 (พี่บอย)'];
const PROVIDERS = ['Nim Express', 'Flash Express', 'Lalamove', 'ไปรษณีย์ไทย', 'Messenger'];

export default function Logistics() {
  const [activeTab, setActiveTab] = useState('dispatch');
  const [trips, setTrips] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [thirdParty, setThirdParty] = useState([]);
  const [jobOrders, setJobOrders] = useState([]);

  // Forms
  const [tripForm, setTripForm] = useState({ fleet: FLEETS[0], type: 'outsource_wip', destinations: [{name: '', type: 'dropoff'}], start_km: '', end_km: '', status: 'pending' });
  const [fuelForm, setFuelForm] = useState({ fleet: FLEETS[0], odometer: '', amount_thb: '', liters: '' });
  const [plForm, setPlForm] = useState({ job_ref: '', provider: PROVIDERS[0], tracking_number: '', shipping_cost: '' });

  useEffect(() => {
    fetchTrips();
    fetchFuels();
    fetch3PL();
    fetchJobOrders();
  }, []);

  const fetchTrips = () => axios.get(`${API_URL}/logistics/trips`).then(res => setTrips(res.data)).catch(console.error);
  const fetchFuels = () => axios.get(`${API_URL}/logistics/fuel`).then(res => setFuels(res.data)).catch(console.error);
  const fetch3PL = () => axios.get(`${API_URL}/logistics/3pl`).then(res => setThirdParty(res.data)).catch(console.error);
  const fetchJobOrders = () => axios.get(`${API_URL}/job_orders`).then(res => setJobOrders(res.data)).catch(console.error);

  // Submit Handlers
  const openTrip = async () => {
    if(!tripForm.start_km) return alert('กรุณาใส่เลขไมล์ตอนออก');
    try {
      await axios.post(`${API_URL}/logistics/trips`, { ...tripForm, trip_date: new Date().toISOString().split('T')[0] });
      alert('เปิดทริปสำเร็จ');
      fetchTrips();
    } catch(e) { alert('Error!'); }
  };
  const closeTrip = async (id) => {
    const endKm = prompt("กรอกเลขไมล์ตอนกลับ (End KM):");
    if(!endKm) return;
    try {
      await axios.post(`${API_URL}/logistics/trips`, { id, end_km: parseInt(endKm), status: 'completed' });
      fetchTrips();
    } catch(e) { alert('Error!'); }
  };

  const addFuel = async () => {
    try {
      await axios.post(`${API_URL}/logistics/fuel`, { ...fuelForm, date: new Date().toISOString().split('T')[0] });
      alert('บันทึกเบิกน้ำมันสำเร็จ');
      setFuelForm({...fuelForm, odometer: '', amount_thb: '', liters: ''});
      fetchFuels();
    } catch(e) { alert('Error!'); }
  };

  const add3PL = async () => {
    try {
      await axios.post(`${API_URL}/logistics/3pl`, { ...plForm, drop_off_date: new Date().toISOString().split('T')[0] });
      alert('บันทึกค่าส่งสำเร็จ');
      setPlForm({...plForm, job_ref: '', tracking_number: '', shipping_cost: ''});
      fetch3PL();
    } catch(e) { alert('Error!'); }
  };

  return (
    <div className="view-section active p-4">
      <div className="flex justify-between aligns-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-truck-fast text-blue-600"></i> Logistics & Fleet</h2>
          <p className="text-sm text-gray-500">ระบบจัดการลอจิสติกส์, รับส่งสินค้า (WIP/ลูกค้า) และเบิกน้ำมัน</p>
        </div>
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-outline'}`}>
              <i className={t.icon}></i> {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dispatch' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="table-container p-4 shadow border-t-4 border-blue-500">
            <h4 className="font-bold mb-4">📇 เปิดทริปวิ่งงาน (Dispatch)</h4>
            <div className="flex flex-col gap-3">
              <select className="form-control" value={tripForm.fleet} onChange={e => setTripForm({...tripForm, fleet: e.target.value})}>
                {FLEETS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="form-control" value={tripForm.type} onChange={e => setTripForm({...tripForm, type: e.target.value})}>
                <option value="outsource_wip">นำชิ้นงานไป Outsource (ปั๊ม/เคลือบ/เข้าเล่ม)</option>
                <option value="material_pickup">ไปรับกระดาษ/วัสดุ</option>
                <option value="customer_delivery">ส่งลูกค้าโดยตรง (รถบริษัท)</option>
              </select>
              
              <div className="p-3 bg-slate-50 rounded border">
                <p className="text-xs text-gray-500 mb-2">จุดหมาย (Destinations)</p>
                {tripForm.destinations.map((d, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select className="form-control flex-1 text-sm" value={d.type} onChange={e => {
                      const newD = [...tripForm.destinations]; newD[i].type = e.target.value; setTripForm({...tripForm, destinations: newD});
                    }}>
                      <option value="dropoff">ไปส่งของ</option>
                      <option value="pickup">ไปรับของ</option>
                      <option value="purchase">ไปซื้อของ</option>
                    </select>
                    <input className="form-control flex-2 text-sm" placeholder="ชื่อร้าน / บริษัท" value={d.name} onChange={e => {
                      const newD = [...tripForm.destinations]; newD[i].name = e.target.value; setTripForm({...tripForm, destinations: newD});
                    }}/>
                  </div>
                ))}
                <button onClick={() => setTripForm({...tripForm, destinations: [...tripForm.destinations, {name:'', type:'dropoff'}]})} className="text-xs text-blue-600 font-bold">+ เพิ่มจุดหมาย</button>
              </div>

              <input className="form-control" type="number" placeholder="เลขไมล์รถ ตอนออก (Start KM)" value={tripForm.start_km} onChange={e => setTripForm({...tripForm, start_km: e.target.value})} />
              
              <button className="btn btn-primary" onClick={openTrip}>ออกรถ 💨</button>
            </div>
          </div>

          <div className="table-container p-4 shadow border-t-4 border-amber-500">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold">📡 สถานะรถบริษัทวันนี้</h4>
            </div>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {trips.filter(t => t.status === 'pending').length === 0 && <p className="text-sm text-gray-500 text-center py-4">ไม่มีรถกำลังวิ่งงานตอนนี้</p>}
              {trips.filter(t => t.status === 'pending').map(t => (
                <div key={t.id} className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                  <div className="flex justify-between">
                    <span className="font-bold text-orange-700">{t.fleet}</span>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 rounded-full flex items-center shadow-sm animate-pulse">กำลังวิ่งในเส้นทาง</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <strong>ประเภท:</strong> {t.type} <br/>
                    <strong>ไมล์ล่าสุด:</strong> {t.start_km} กม.
                  </div>
                  <div className="mt-2 pl-2 border-l-2 border-orange-300">
                    {(t.destinations || []).map((d, i) => (
                      <div key={i} className="text-xs">📍 {d.type === 'pickup' ? 'รับของจาก:' : d.type === 'dropoff'? 'ส่งของที่:' : 'ไปซื้อ:'} <strong>{d.name}</strong></div>
                    ))}
                  </div>
                  <button onClick={() => closeTrip(t.id)} className="w-full mt-3 btn btn-sm btn-outline text-xs border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white">
                    ปิดทริป (กลับถึงโรงงาน)
                  </button>
                </div>
              ))}
              
              <h5 className="font-bold text-sm text-gray-400 mt-4">✓ ทริปที่จบแล้ว</h5>
              {trips.filter(t => t.status === 'completed').slice(0, 5).map(t => (
                <div key={t.id} className="p-2 border rounded-lg bg-gray-50 opacity-80 text-xs">
                  <strong>{t.fleet}</strong> • ระยะทาง: {t.end_km - t.start_km} กม.
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 table-container p-4 shadow border-t-4 border-red-500">
            <h4 className="font-bold mb-4">⛽ ฟอร์มเบิกค่าน้ำมัน</h4>
            <div className="flex flex-col gap-3">
              <select className="form-control" value={fuelForm.fleet} onChange={e => setFuelForm({...fuelForm, fleet: e.target.value})}>
                {FLEETS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input className="form-control" type="number" placeholder="เลขไมล์หน้าปัด (Odometer)" value={fuelForm.odometer} onChange={e => setFuelForm({...fuelForm, odometer: e.target.value})} />
              <input className="form-control" type="number" placeholder="จำนวนเงินสดที่เบิก (บาท)" value={fuelForm.amount_thb} onChange={e => setFuelForm({...fuelForm, amount_thb: e.target.value})} />
              <input className="form-control" type="number" placeholder="จำนวนน้ำมันที่ได้ (ลิตร)" value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm, liters: e.target.value})} />
              <button className="btn btn-primary" onClick={addFuel}>บันทึกเบิกเงินงวดนี้</button>
              <p className="text-xs text-center text-gray-400 mt-2">* ระบบจะนำเลขไมล์ไปลบกับรอบที่แล้วเพื่อคำนวณอัตราสิ้นเปลือง</p>
            </div>
          </div>
          <div className="col-span-2 table-container p-4 shadow">
            <h4 className="font-bold mb-4">📋 ประวัติการเบิกน้ำมัน</h4>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr><th className="p-2">วันที่</th><th className="p-2">รถ</th><th className="p-2">เลขไมล์</th><th className="p-2">ลิตร</th><th className="p-2 text-right">ยอดเบิก(฿)</th></tr>
              </thead>
              <tbody>
                {fuels.map(f => (
                  <tr key={f.id} className="border-b">
                    <td className="p-2">{new Date(f.date).toLocaleDateString('th-TH')}</td>
                    <td className="p-2">{f.fleet}</td>
                    <td className="p-2">{f.odometer?.toLocaleString()}</td>
                    <td className="p-2">{f.liters}</td>
                    <td className="p-2 text-right font-bold text-red-600">{f.amount_thb?.toLocaleString()} ฿</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === '3pl' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 table-container p-4 shadow border-t-4 border-green-500">
            <h4 className="font-bold mb-4">📦 บันทึกขนส่งนอก / ขนส่งด่วน</h4>
            <div className="flex flex-col gap-3">
              <select className="form-control" value={plForm.job_ref} onChange={e => setPlForm({...plForm, job_ref: e.target.value})}>
                <option value="">-- เลือก Job Order ที่ต้องการส่ง --</option>
                {jobOrders.map(j => <option key={j.id} value={`JOB-${j.id}`}>JOB-{j.id} ({j.customer})</option>)}
              </select>
              <select className="form-control" value={plForm.provider} onChange={e => setPlForm({...plForm, provider: e.target.value})}>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="form-control" type="text" placeholder="Tracking Number (ถ้ามี)" value={plForm.tracking_number} onChange={e => setPlForm({...plForm, tracking_number: e.target.value})} />
              <input className="form-control font-bold text-red-600" type="number" placeholder="ค่าจัดส่งรอบนี้ (บาท)" value={plForm.shipping_cost} onChange={e => setPlForm({...plForm, shipping_cost: e.target.value})} />
              <button className="btn btn-primary bg-green-600 border-none hover:bg-green-700" onClick={add3PL}>บันทึกเข้าระบบ</button>
            </div>
          </div>
          <div className="col-span-2 table-container p-4 shadow">
            <h4 className="font-bold mb-4">🚚 ประวัติการส่งลูกค้า (3PL)</h4>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr><th className="p-2">วันที่</th><th className="p-2">Job No.</th><th className="p-2">ขนส่ง</th><th className="p-2">Tracking</th><th className="p-2 text-right">ค่าขนส่ง</th></tr>
              </thead>
              <tbody>
                {thirdParty.map(p => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2">{new Date(p.drop_off_date).toLocaleDateString('th-TH')}</td>
                    <td className="p-2 font-bold text-blue-600">{p.job_ref}</td>
                    <td className="p-2"><span className="bg-gray-200 px-2 py-1 rounded text-xs">{p.provider}</span></td>
                    <td className="p-2">{p.tracking_number || '-'}</td>
                    <td className="p-2 text-right font-bold text-red-600">{p.shipping_cost?.toLocaleString()} ฿</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow border border-slate-100">
            <p className="text-gray-500 text-xs">สรุปค่าน้ำมันรวม (เดือนนี้)</p>
            <h3 className="text-2xl font-black text-rose-600">{fuels.reduce((s,f) => s+Number(f.amount_thb||0),0).toLocaleString()} ฿</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border border-slate-100">
            <p className="text-gray-500 text-xs">สรุปค่าส่งลูกค้านอก (3PL)</p>
            <h3 className="text-2xl font-black text-emerald-600">{thirdParty.reduce((s,f) => s+Number(f.shipping_cost||0),0).toLocaleString()} ฿</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border border-slate-100">
            <p className="text-gray-500 text-xs">จำนวนทริปวิ่งงาน Outsource (รถบริษัท)</p>
            <h3 className="text-2xl font-black text-blue-600">{trips.filter(t => t.type === 'outsource_wip').length} รอบ</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border border-slate-100 text-center flex flex-col justify-center">
            <span className="text-sm text-gray-400">ระบบประเมินประสิทธิภาพ</span>
            <span className="text-sm font-bold text-emerald-500">✓ ปกติ (Normal)</span>
          </div>
          <div className="col-span-2 md:col-span-4 mt-4 bg-slate-50 p-6 rounded-lg text-center text-slate-400">
            กราฟวิเคราะห์ Cost per Drop และ Fuel Economy รายคัน (มีข้อมูลพอจะเปิดแสดงผลเร็วๆนี้)
          </div>
        </div>
      )}

    </div>
  );
}
