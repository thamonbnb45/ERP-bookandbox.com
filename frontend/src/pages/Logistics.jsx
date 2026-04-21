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

  // Cost Constants
  const DRIVER_SALARY_HR = 75; // อิงจาก 15,000/เดือน
  const DEPRECIATION_HR = 60;  // ค่าเสื่อมรถ 800k / 5 ปี
  const FUEL_RATE_KM = 3.5;    // ค่าน้ำมันและซ่อมบำรุงต่อ กม.

  const calculateTripCost = (trip) => {
    if (!trip.end_km || !trip.start_km || !trip.return_time || !trip.depart_time) return 0;
    const distance = Math.max(0, trip.end_km - trip.start_km);
    const durationMs = new Date(trip.return_time) - new Date(trip.depart_time);
    const hours = Math.max(0.5, durationMs / (1000 * 60 * 60)); // คิดขั้นต่ำครึ่งชม.
    return Math.round((distance * FUEL_RATE_KM) + (hours * (DRIVER_SALARY_HR + DEPRECIATION_HR)));
  };

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

  // Proof of delivery (Camera + GPS Watermark)
  const [uploadingDest, setUploadingDest] = useState(null); // tracking loading state
  
  const handlePhotoProof = (e, tripId, destIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!navigator.geolocation) {
      alert("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }

    setUploadingDest(`${tripId}-${destIndex}`);

    // Get location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        stampAndUploadImage(file, lat, lng, tripId, destIndex);
      },
      (err) => {
        alert("ไม่สามารถดึง GPS ได้ แจ้งให้เบราว์เซอร์อนุญาต Location หรือเปิด GPS ของเครื่อง");
        setUploadingDest(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const stampAndUploadImage = (file, lat, lng, tripId, destIndex) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // scale down to reasonable size to save bandwidth (max 1200px width)
        const scale = img.width > 1200 ? 1200 / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Watermark Box
        const barHeight = Math.max(120, canvas.height * 0.15);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px sans-serif';
        const timestamp = new Date().toLocaleString('th-TH');
        ctx.fillText(`เวลา: ${timestamp}`, 30, canvas.height - (barHeight * 0.5));
        ctx.fillText(`พิกัด: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 30, canvas.height - (barHeight * 0.15));

        const base64Data = canvas.toDataURL('image/jpeg', 0.8);

        try {
           // Upload to server
           const res = await axios.post(`${API_URL}/upload_proof`, { image_base64: base64Data });
           const proofUrl = res.data.url;
           
           // Update trip destinations array
           const trip = trips.find(t => t.id === tripId);
           const newDest = [...trip.destinations];
           newDest[destIndex] = { ...newDest[destIndex], proof_url: proofUrl, lat, lng, completed: true, timestamp };
           
           await axios.post(`${API_URL}/logistics/trips`, { id: tripId, destinations: newDest });
           fetchTrips();
           alert('✅ ประทับเวลา พิกัด และบันทึกรูปสำเร็จ!');
        } catch (err) {
           alert("เกิดข้อผิดพลาดในการอัปโหลด หรือเซิฟเวอร์ขัดข้อง");
        } finally {
           setUploadingDest(null);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
                      <div key={i} className="text-xs mb-3 border-b border-orange-100 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            📍 <strong>{d.type === 'pickup' ? 'ไปรับ: ' : d.type === 'dropoff'? 'ไปส่ง: ' : 'ซื้อของ: '}</strong> {d.name}
                          </div>
                          {d.completed && <span className="text-green-600 font-bold bg-green-100 px-1 rounded">✓ เช็คอินแล้ว</span>}
                        </div>
                        
                        {!d.completed ? (
                          <div className="mt-2 text-right">
                            {uploadingDest === `${t.id}-${i}` ? (
                              <div className="text-blue-500 animate-pulse text-xs"><i className="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลดและปักหมุด...</div>
                            ) : (
                              <>
                                <label htmlFor={`camera_input_${t.id}_${i}`} className="inline-block bg-blue-600 outline-none text-white px-3 py-1 rounded cursor-pointer shadow hover:bg-blue-700">
                                  <i className="fa-solid fa-camera"></i> ถ่ายรูปยืนยันหน้างาน
                                </label>
                                <input type="file" id={`camera_input_${t.id}_${i}`} accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoProof(e, t.id, i)} />
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 flex gap-2">
                            <a href={API_URL.replace('/api', '') + d.proof_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              <i className="fa-solid fa-image"></i> ดูรูปงาน
                            </a>
                            <a href={`https://www.google.com/maps?q=${d.lat},${d.lng}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                              <i className="fa-solid fa-location-dot"></i> ดูแผนที่ (พิกัดจร)
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => closeTrip(t.id)} className="w-full mt-3 btn btn-sm btn-outline text-xs border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white">
                    ปิดทริป (กลับถึงโรงงาน)
                  </button>
                </div>
              ))}
              
              <h5 className="font-bold text-sm text-gray-400 mt-4">✓ ทริปที่จบแล้ว วันนี้</h5>
              {trips.filter(t => t.status === 'completed').slice(0, 5).map(t => {
                const cost = calculateTripCost(t);
                const distance = t.end_km - t.start_km;
                const hours = t.return_time && t.depart_time ? ((new Date(t.return_time) - new Date(t.depart_time)) / 3600000).toFixed(1) : '?';
                return (
                  <div key={t.id} className="p-3 border rounded-lg bg-gray-50 opacity-90 text-xs mt-2">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-gray-700">{t.fleet}</span>
                      <span className="text-red-500">{cost > 0 ? `~${cost.toLocaleString()} ฿` : ''}</span>
                    </div>
                    <div className="text-gray-500">
                      ระยะทาง: <strong>{distance} กม.</strong> • เวลาวิ่ง: <strong>{hours} ชม.</strong>
                    </div>
                    
                    {/* Photos Preview */}
                    <div className="flex gap-1 mt-2 overflow-x-auto">
                      {(t.destinations || []).map((d, i) => d.completed && d.proof_url ? (
                        <a key={i} href={API_URL.replace('/api', '') + d.proof_url} target="_blank" rel="noreferrer" className="w-[60px] h-[60px] relative inline-block bg-slate-200 border rounded cursor-pointer shrink-0">
                          <img src={API_URL.replace('/api', '') + d.proof_url} className="w-full h-full object-cover rounded" alt="proof"/>
                          <div className="absolute font-bold text-white bg-black/50 text-[8px] bottom-0 w-full text-center p-0.5"><i className="fa-solid fa-location-dot"></i></div>
                        </a>
                      ) : null)}
                    </div>

                    <div className="mt-2 text-[10px] text-gray-400">
                      (รวมค่าแรงคนขับ {DRIVER_SALARY_HR}฿/ชม, ค่าเสื่อม {DEPRECIATION_HR}฿/ชม, น้ำมัน+สึกหรอ {FUEL_RATE_KM}฿/กม)
                    </div>
                  </div>
                );
              })}
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
            <p className="text-gray-500 text-xs">สรุปค่าน้ำมันรวมกระดาษ/เบิกสด (เดือนนี้)</p>
            <h3 className="text-2xl font-black text-rose-600">{fuels.reduce((s,f) => s+Number(f.amount_thb||0),0).toLocaleString()} ฿</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border border-slate-100">
            <p className="text-gray-500 text-xs">สรุปค่าส่งลูกค้านอก (3PL)</p>
            <h3 className="text-2xl font-black text-emerald-600">{thirdParty.reduce((s,f) => s+Number(f.shipping_cost||0),0).toLocaleString()} ฿</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border border-slate-100">
            <p className="text-gray-500 text-xs">ต้นทุนวิ่งงานบริษัท (ประเมินคร่าวๆ)</p>
            <h3 className="text-2xl font-black text-indigo-600">
              {trips.filter(t => t.status === 'completed').reduce((s,t) => s + calculateTripCost(t), 0).toLocaleString()} ฿
            </h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border border-slate-100 text-center flex flex-col justify-center">
            <span className="text-sm font-bold text-gray-600 mb-1">จำนวนวิ่ง {trips.filter(t => t.status === 'completed').length} ทริป</span>
            <span className="text-[10px] text-gray-400">เฉลี่ยต่อทริป ต้นทุน <strong>{
              trips.filter(t => t.status === 'completed').length > 0 
                ? Math.round(trips.filter(t => t.status === 'completed').reduce((s,t) => s + calculateTripCost(t), 0) / trips.filter(t => t.status === 'completed').length).toLocaleString()
                : 0
            } ฿</strong>
            </span>
          </div>
          <div className="col-span-2 md:col-span-4 mt-4 bg-slate-50 p-6 rounded-lg text-center text-slate-400 text-sm">
            💡 ระบบจำลองต้นทุน (Activity-Based Costing) : ค่าแรงขับ {DRIVER_SALARY_HR} ฿/ชม + ค่าเสื่อมรถ {DEPRECIATION_HR} ฿/ชม + ค่าน้ำมัน/สึกหรอ {FUEL_RATE_KM} ฿/กม. <br/>
            กราฟวิเคราะห์ Cost per Drop เชิงลึกจะแสดงผลเมื่อข้อมูลทริปมาบรรจบกันกับการเบิกบิลน้ำมัน
          </div>
        </div>
      )}

    </div>
  );
}
