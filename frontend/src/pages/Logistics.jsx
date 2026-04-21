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
    <div className="view-section active" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}><i className="fa-solid fa-truck-fast text-primary"></i> Logistics & Fleet</h2>
          <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ระบบจัดการลอจิสติกส์, รับส่งสินค้า (WIP/ลูกค้า) และเบิกน้ำมัน</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-outline'}`}>
              <i className={t.icon}></i> {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dispatch' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div className="table-container shadow" style={{ flex: '1 1 400px', padding: '1rem', borderTop: '4px solid #3b82f6' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>📇 เปิดทริปวิ่งงาน (Dispatch)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <select className="form-control" value={tripForm.fleet} onChange={e => setTripForm({...tripForm, fleet: e.target.value})}>
                {FLEETS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="form-control" value={tripForm.type} onChange={e => setTripForm({...tripForm, type: e.target.value})}>
                <option value="outsource_wip">นำชิ้นงานไป Outsource (ปั๊ม/เคลือบ/เข้าเล่ม)</option>
                <option value="material_pickup">ไปรับกระดาษ/วัสดุ</option>
                <option value="customer_delivery">ส่งลูกค้าโดยตรง (รถบริษัท)</option>
              </select>
              
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>จุดหมาย (Destinations)</p>
                {tripForm.destinations.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select className="form-control" style={{ flex: 1, fontSize: '0.8rem' }} value={d.type} onChange={e => {
                      const newD = [...tripForm.destinations]; newD[i].type = e.target.value; setTripForm({...tripForm, destinations: newD});
                    }}>
                      <option value="dropoff">ไปส่งของ</option>
                      <option value="pickup">ไปรับของ</option>
                      <option value="purchase">ไปซื้อของ</option>
                    </select>
                    <input className="form-control" style={{ flex: 2, fontSize: '0.8rem' }} placeholder="ชื่อร้าน / บริษัท" value={d.name} onChange={e => {
                      const newD = [...tripForm.destinations]; newD[i].name = e.target.value; setTripForm({...tripForm, destinations: newD});
                    }}/>
                  </div>
                ))}
                <button onClick={() => setTripForm({...tripForm, destinations: [...tripForm.destinations, {name:'', type:'dropoff'}]})} 
                        style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>
                  + เพิ่มจุดหมาย
                </button>
              </div>

              <input className="form-control" type="number" placeholder="เลขไมล์รถ ตอนออก (Start KM)" value={tripForm.start_km} onChange={e => setTripForm({...tripForm, start_km: e.target.value})} />
              
              <button className="btn btn-primary" onClick={openTrip} style={{ width: '100%', padding: '0.8rem' }}>ออกรถ 💨</button>
            </div>
          </div>

          <div className="table-container shadow" style={{ flex: '1 1 400px', padding: '1rem', borderTop: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: 'bold' }}>📡 สถานะรถบริษัทวันนี้</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {trips.filter(t => t.status === 'pending').length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>ไม่มีรถกำลังวิ่งงานตอนนี้</p>}
              {trips.filter(t => t.status === 'pending').map(t => (
                <div key={t.id} style={{ padding: '0.8rem', border: '1px solid #fed7aa', borderRadius: '8px', background: '#fff7ed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', color: '#c2410c' }}>{t.fleet}</span>
                    <span style={{ fontSize: '0.7rem', background: '#fed7aa', color: '#9a3412', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>กำลังวิ่งในเส้นทาง</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
                    <strong>ประเภท:</strong> {t.type} <br/>
                    <strong>ไมล์ล่าสุด:</strong> {t.start_km} กม.
                  </div>
                  <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #fdba74' }}>
                    {(t.destinations || []).map((d, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', marginBottom: '0.8rem', borderBottom: '1px solid #ffedd5', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            📍 <strong>{d.type === 'pickup' ? 'ไปรับ: ' : d.type === 'dropoff'? 'ไปส่ง: ' : 'ซื้อของ: '}</strong> {d.name}
                          </div>
                          {d.completed && <span style={{ color: '#16a34a', fontWeight: 'bold', background: '#dcfce7', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.65rem' }}>✓ เช็คอินแล้ว</span>}
                        </div>
                        
                        {!d.completed ? (
                          <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                            {uploadingDest === `${t.id}-${i}` ? (
                              <div style={{ color: '#3b82f6', fontSize: '0.75rem' }}><i className="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...</div>
                            ) : (
                              <>
                                <label htmlFor={`camera_input_${t.id}_${i}`} style={{ display: 'inline-block', background: '#2563eb', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                  <i className="fa-solid fa-camera"></i> ถ่ายรูปยืนยันหน้างาน
                                </label>
                                <input type="file" id={`camera_input_${t.id}_${i}`} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePhotoProof(e, t.id, i)} />
                              </>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.5rem' }}>
                            <a href={API_URL.replace('/api', '') + d.proof_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.75rem' }}>
                              <i className="fa-solid fa-image"></i> ดูรูปงาน
                            </a>
                            <a href={`https://www.google.com/maps?q=${d.lat},${d.lng}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontSize: '0.75rem' }}>
                              <i className="fa-solid fa-location-dot"></i> ดูแผนที่
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => closeTrip(t.id)} style={{ width: '100%', marginTop: '0.8rem', padding: '0.5rem', border: '1px solid #f97316', background: 'white', color: '#ea580c', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    ปิดทริป (กลับถึงโรงงาน)
                  </button>
                </div>
              ))}
              
              
              <h5 style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#94a3b8', marginTop: '1rem' }}>✓ ทริปที่จบแล้ว วันนี้</h5>
              {trips.filter(t => t.status === 'completed').slice(0, 5).map(t => {
                const cost = calculateTripCost(t);
                const distance = t.end_km - t.start_km;
                const hours = t.return_time && t.depart_time ? ((new Date(t.return_time) - new Date(t.depart_time)) / 3600000).toFixed(1) : '?';
                return (
                  <div key={t.id} style={{ padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#334155' }}>{t.fleet}</span>
                      <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{cost > 0 ? `~${cost.toLocaleString()} ฿` : ''}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      ระยะทาง: <strong>{distance} กม.</strong> • เวลาวิ่ง: <strong>{hours} ชม.</strong>
                    </div>
                    
                    {/* Photos Preview */}
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', overflowX: 'auto' }}>
                      {(t.destinations || []).map((d, i) => d.completed && d.proof_url ? (
                        <a key={i} href={API_URL.replace('/api', '') + d.proof_url} target="_blank" rel="noreferrer" style={{ width: '60px', height: '60px', position: 'relative', display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={API_URL.replace('/api', '') + d.proof_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="proof"/>
                          <div style={{ position: 'absolute', color: 'white', background: 'rgba(0,0,0,0.5)', fontSize: '8px', bottom: 0, width: '100%', textAlign: 'center', padding: '2px 0' }}><i className="fa-solid fa-location-dot"></i></div>
                        </a>
                      ) : null)}
                    </div>

                    <div style={{ marginTop: '0.5rem', fontSize: '10px', color: '#94a3b8' }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div className="table-container shadow" style={{ flex: '1 1 300px', padding: '1rem', borderTop: '4px solid #ef4444' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>⛽ ฟอร์มเบิกค่าน้ำมัน</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <select className="form-control" value={fuelForm.fleet} onChange={e => setFuelForm({...fuelForm, fleet: e.target.value})}>
                {FLEETS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input className="form-control" type="number" placeholder="เลขไมล์หน้าปัด (Odometer)" value={fuelForm.odometer} onChange={e => setFuelForm({...fuelForm, odometer: e.target.value})} />
              <input className="form-control" type="number" placeholder="จำนวนเงินสดที่เบิก (บาท)" value={fuelForm.amount_thb} onChange={e => setFuelForm({...fuelForm, amount_thb: e.target.value})} />
              <input className="form-control" type="number" placeholder="จำนวนน้ำมันที่ได้ (ลิตร)" value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm, liters: e.target.value})} />
              <button className="btn btn-primary" onClick={addFuel} style={{ padding: '0.8rem' }}>บันทึกเบิกเงินงวดนี้</button>
              <p style={{ fontSize: '0.75rem', textAlign: 'center', color: '#94a3b8', marginTop: '0.5rem' }}>* ระบบจะนำเลขไมล์ไปลบกับรอบที่แล้วเพื่อคำนวณอัตราสิ้นเปลือง</p>
            </div>
          </div>
          <div className="table-container shadow" style={{ flex: '2 1 500px', padding: '1rem' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>📋 ประวัติการเบิกน้ำมัน</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                    <th style={{ padding: '0.8rem' }}>วันที่</th>
                    <th style={{ padding: '0.8rem' }}>รถ</th>
                    <th style={{ padding: '0.8rem' }}>เลขไมล์</th>
                    <th style={{ padding: '0.8rem' }}>ลิตร</th>
                    <th style={{ padding: '0.8rem', textAlign: 'right' }}>ยอดเบิก(฿)</th>
                  </tr>
                </thead>
                <tbody>
                  {fuels.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.8rem' }}>{new Date(f.date).toLocaleDateString('th-TH')}</td>
                      <td style={{ padding: '0.8rem' }}>{f.fleet}</td>
                      <td style={{ padding: '0.8rem' }}>{f.odometer?.toLocaleString()}</td>
                      <td style={{ padding: '0.8rem' }}>{f.liters}</td>
                      <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>{f.amount_thb?.toLocaleString()} ฿</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === '3pl' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div className="table-container shadow" style={{ flex: '1 1 300px', padding: '1rem', borderTop: '4px solid #22c55e' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>📦 บันทึกขนส่งนอก / ขนส่งด่วน</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <select className="form-control" value={plForm.job_ref} onChange={e => setPlForm({...plForm, job_ref: e.target.value})}>
                <option value="">-- เลือก Job Order ที่ต้องการส่ง --</option>
                {jobOrders.map(j => <option key={j.id} value={`JOB-${j.id}`}>JOB-{j.id} ({j.customer})</option>)}
              </select>
              <select className="form-control" value={plForm.provider} onChange={e => setPlForm({...plForm, provider: e.target.value})}>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="form-control" type="text" placeholder="Tracking Number (ถ้ามี)" value={plForm.tracking_number} onChange={e => setPlForm({...plForm, tracking_number: e.target.value})} />
              <input className="form-control font-bold text-red-600" type="number" placeholder="ค่าจัดส่งรอบนี้ (บาท)" value={plForm.shipping_cost} onChange={e => setPlForm({...plForm, shipping_cost: e.target.value})} />
              <button className="btn btn-primary" onClick={add3PL} style={{ background: '#16a34a', border: 'none', padding: '0.8rem' }}>บันทึกเข้าระบบ</button>
            </div>
          </div>
          <div className="table-container shadow" style={{ flex: '2 1 500px', padding: '1rem' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>🚚 ประวัติการส่งลูกค้า (3PL)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                    <th style={{ padding: '0.8rem' }}>วันที่</th>
                    <th style={{ padding: '0.8rem' }}>Job No.</th>
                    <th style={{ padding: '0.8rem' }}>ขนส่ง</th>
                    <th style={{ padding: '0.8rem' }}>Tracking</th>
                    <th style={{ padding: '0.8rem', textAlign: 'right' }}>ค่าขนส่ง</th>
                  </tr>
                </thead>
                <tbody>
                  {thirdParty.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.8rem' }}>{new Date(p.drop_off_date).toLocaleDateString('th-TH')}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold', color: '#2563eb' }}>{p.job_ref}</td>
                      <td style={{ padding: '0.8rem' }}><span style={{ background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{p.provider}</span></td>
                      <td style={{ padding: '0.8rem' }}>{p.tracking_number || '-'}</td>
                      <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 'bold', color: '#e11d48' }}>{p.shipping_cost?.toLocaleString()} ฿</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>สรุปค่าน้ำมันรวมกระดาษ/เบิกสด (เดือนนี้)</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#e11d48', margin: '0.5rem 0' }}>{fuels.reduce((s,f) => s+Number(f.amount_thb||0),0).toLocaleString()} ฿</h3>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>สรุปค่าส่งลูกค้านอก (3PL)</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', margin: '0.5rem 0' }}>{thirdParty.reduce((s,f) => s+Number(f.shipping_cost||0),0).toLocaleString()} ฿</h3>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>ต้นทุนวิ่งงานบริษัท (ประเมินคร่าวๆ)</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4f46e5', margin: '0.5rem 0' }}>
              {trips.filter(t => t.status === 'completed').reduce((s,t) => s + calculateTripCost(t), 0).toLocaleString()} ฿
            </h3>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>จำนวนวิ่ง {trips.filter(t => t.status === 'completed').length} ทริป</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>เฉลี่ยต่อทริป ต้นทุน <strong style={{ fontSize: '1rem', color: '#334155' }}>{
              trips.filter(t => t.status === 'completed').length > 0 
                ? Math.round(trips.filter(t => t.status === 'completed').reduce((s,t) => s + calculateTripCost(t), 0) / trips.filter(t => t.status === 'completed').length).toLocaleString()
                : 0
            } ฿</strong>
            </span>
          </div>
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            💡 ระบบจำลองต้นทุน (Activity-Based Costing) : ค่าแรงขับ {DRIVER_SALARY_HR} ฿/ชม + ค่าเสื่อมรถ {DEPRECIATION_HR} ฿/ชม + ค่าน้ำมัน/สึกหรอ {FUEL_RATE_KM} ฿/กม. <br/>
            กราฟวิเคราะห์ Cost per Drop เชิงลึกจะแสดงผลเมื่อข้อมูลทริปมาบรรจบกันกับการเบิกบิลน้ำมัน
          </div>
        </div>
      )}

    </div>
  );
}
