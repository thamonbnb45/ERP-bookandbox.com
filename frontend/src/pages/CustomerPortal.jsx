import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export default function CustomerPortal() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
      product: 'กล่องอาร์ตการ์ด',
      presetSize: 'กำหนดขนาดเอง',
      width: 10, length: 15, height: 5,
      material: 'อาร์ตการ์ด 250 แกรม',
      coating: 'เคลือบด้าน',
      quantity: 500
  });

  const [price, setPrice] = useState(0);
  
  // Anti-error checks
  const [checks, setChecks] = useState({ cmyk: false, v2: false, outline: false });
  // File state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Checkout
  const [customer, setCustomer] = useState({ name: '', phone: '' });

  // Calculate Price Mock
  useEffect(() => {
     let base = config.product.includes('กล่อง') ? 5 : 2;
     let area = config.width * config.length * config.height;
     let multiplier = area > 500 ? 1.5 : 1;
     let qtyDiscount = config.quantity >= 1000 ? 0.8 : 1;
     let coatingCost = config.coating === 'ไม่เคลือบ' ? 0 : config.coating === 'เคลือบด้าน' ? 1.5 : 2;
     
     let unitPrice = (base * multiplier * qtyDiscount) + coatingCost;
     setPrice(Math.round(unitPrice * config.quantity));
  }, [config]);

  const handleFileDrop = (e) => {
      e.preventDefault();
      if(e.dataTransfer.files && e.dataTransfer.files[0]) {
          setFile(e.dataTransfer.files[0]);
      }
  };

  const submitOrder = async () => {
      if(!customer.name || !customer.phone) return alert('กรุณากรอกชื่อและเบอร์โทรติดต่อ');
      setUploading(true);
      
      // Simulate large 1GB upload delay UX
      setTimeout(async () => {
          try {
              await axios.post(`${API_URL}/portal/checkout`, {
                  customerName: customer.name,
                  phone: customer.phone,
                  productDetails: `${config.product} - ${config.width}x${config.length}x${config.height}cm (${config.coating})`,
                  quantity: config.quantity,
                  totalPrice: price + (price * 0.07)
              });
              setStep(3); // Success page
          } catch(err) {
              alert(' เกิดข้อผิดพลาดในการส่งข้อมูล');
          }
          setUploading(false);
      }, 2000);
  };

  if(step === 3) {
      return (
          <div style={{minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Kanit", sans-serif'}}>
              <div style={{background: 'white', padding: '4rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}>
                  <div style={{fontSize: '4rem', color: '#10b981', marginBottom: '1rem'}}><i className="fa-solid fa-circle-check"></i></div>
                  <h1 style={{color: '#0f172a'}}>ชำระเงินและรับไฟล์สำเร็จ!</h1>
                  <p style={{color: '#64748b', fontSize: '1.2rem'}}>ระบบได้ส่งไฟล์อาร์ตเวิร์คเข้าสู่ <strong>"กระดานฝ่ายผลิต"</strong> เรียบร้อยแล้วครับ</p>
                  <div style={{background: '#f1f5f9', padding: '2rem', borderRadius: '8px', marginTop: '2rem'}}>
                      <h3>เลขที่คำสั่งซื้อ: #JOB-{Math.floor(Math.random() * 1000) + 9000}</h3>
                      <p>เราจะแจ้งความคืบหน้าให้ทราบผ่าน LINE ทันทีที่ลงเครื่องพิมพ์ครับ</p>
                  </div>
                  <button className="btn btn-primary" style={{marginTop: '2rem'}} onClick={() => window.location.reload()}>กลับสู่หน้าหลัก</button>
              </div>
          </div>
      );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#f8fafc', fontFamily: '"Kanit", sans-serif' }}>
        {/* HERO E-COMMERCE HEADER */}
        <header style={{ background: '#1e293b', width: '100%', color: 'white', padding: '1rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{margin:0}}>Book<span style={{color: '#3b82f6'}}>and</span>box.com <span style={{fontSize: '1rem', fontWeight: 'normal', color: '#94a3b8'}}>| Print Portal</span></h2>
            <div>
                <span style={{background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.9rem'}}><i className="fa-solid fa-truck"></i> จัดส่งฟรีทั่วประเทศ เมื่อสั่ง 1,000 ชิ้นขึ้นไป</span>
            </div>
        </header>

        {/* BREADCRUMB */}
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 5%' }}>
            <div style={{ display: 'flex', gap: '2rem', color: '#64748b' }}>
                <span style={{ color: step === 1 ? '#3b82f6' : '#10b981', fontWeight: 'bold' }}>1. ประเมินราคา</span>
                <span style={{ color: step === 2 ? '#3b82f6' : '#cbd5e1', fontWeight: step === 2 ? 'bold' : 'normal' }}>2. อัปโหลดอาร์ตเวิร์ค</span>
            </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', padding: '2rem 5%', maxWidth: '1400px', margin: '0 auto', alignItems: 'flex-start' }}>
            
            {/* LEFT COLUMN - CONFIGURATOR OR UPLOAD */}
            <div style={{ flex: '1' }}>
                {step === 1 ? (
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <h2 className="mb-4" style={{borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem'}}><i className="fa-solid fa-cogs"></i> สเปกงานพิมพ์ของคุณ</h2>
                        
                        <div className="form-group mt-4">
                            <label>รูปแบบผลิตภัณฑ์ (Product Type)</label>
                            <select className="form-control" value={config.product} onChange={e => setConfig({...config, product: e.target.value})}>
                                <option>กล่องอาร์ตการ์ด</option>
                                <option>ใบปลิว โบรชัวร์ แผ่นพับ</option>
                                <option>ถุงกระดาษ</option>
                                <option>ปฏิทิน</option>
                            </select>
                        </div>

                        {(config.product.includes('แผ่นพับ') || config.product.includes('ใบปลิว') || config.product.includes('ปฏิทิน')) && (
                        <div className="form-group mt-4">
                            <label style={{fontSize: '1.2rem', color: '#1e293b'}}><i className="fa-solid fa-ruler-combined"></i> แพ็กเกจขนาดมาตรฐาน (Standard Sizes)</label>
                            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap'}}>
                                {[
                                    {label: 'A3', w: 29.7, l: 42},
                                    {label: 'A4', w: 21, l: 29.7},
                                    {label: 'A5', w: 14.8, l: 21},
                                    {label: 'A6', w: 10.5, l: 14.8},
                                    {label: 'กำหนดขนาดเอง', w: null, l: null}
                                ].map(preset => (
                                    <button 
                                        key={preset.label}
                                        className="btn" 
                                        style={{
                                            background: config.presetSize === preset.label ? '#4f46e5' : '#f1f5f9', 
                                            color: config.presetSize === preset.label ? 'white' : '#475569',
                                            border: '1px solid #cbd5e1'
                                        }}
                                        onClick={() => {
                                            if(preset.w){
                                                setConfig({...config, presetSize: preset.label, width: preset.w, length: preset.l});
                                            } else {
                                                setConfig({...config, presetSize: 'กำหนดขนาดเอง'});
                                            }
                                        }}
                                    >
                                        {preset.label} {preset.w && <span style={{fontSize: '0.75rem', opacity: 0.8}}>({preset.w}x{preset.l}cm)</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: (!config.product.includes('แผ่นพับ') && !config.product.includes('ใบปลิว') && !config.product.includes('ปฏิทิน')) ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
                            <div className="form-group mb-0">
                                <label>กว้าง (cm)</label>
                                <input type="number" className="form-control" value={config.width} onChange={e => setConfig({...config, width: Number(e.target.value), presetSize: 'กำหนดขนาดเอง'})} />
                            </div>
                            <div className="form-group mb-0">
                                <label>{config.product.includes('แผ่นพับ') || config.product.includes('ใบปลิว') || config.product.includes('ปฏิทิน') ? 'ความสูง (cm)' : 'ยาว/ลึก (cm)'}</label>
                                <input type="number" className="form-control" value={config.length} onChange={e => setConfig({...config, length: Number(e.target.value), presetSize: 'กำหนดขนาดเอง'})} />
                            </div>
                            {(!config.product.includes('แผ่นพับ') && !config.product.includes('ใบปลิว') && !config.product.includes('ปฏิทิน')) && (
                            <div className="form-group mb-0">
                                <label>สูง (cm)</label>
                                <input type="number" className="form-control" value={config.height} onChange={e => setConfig({...config, height: Number(e.target.value), presetSize: 'กำหนดขนาดเอง'})} />
                            </div>
                            )}
                        </div>

                        <div className="form-group mt-4">
                            <label>เนื้อกระดาษ (Material)</label>
                            <select className="form-control" value={config.material} onChange={e => setConfig({...config, material: e.target.value})}>
                                <option>อาร์ตมัน 130 แกรม</option>
                                <option>อาร์ตมัน 160 แกรม</option>
                                <option>อาร์ตการ์ด 250 แกรม</option>
                                <option>อาร์ตการ์ด 300 แกรม</option>
                                <option>กระดาษกล่องแป้งหลังเทา 310 แกรม</option>
                            </select>
                        </div>
                        
                        <div className="form-group mt-4">
                            <label>เทคนิคการเคลือบ (Coating / Finishes)</label>
                            <select className="form-control" value={config.coating} onChange={e => setConfig({...config, coating: e.target.value})}>
                                <option>ไม่เคลือบ</option>
                                <option>เคลือบด้าน (Matte Lamination)</option>
                                <option>เคลือบเงา (Glossy Lamination)</option>
                                <option>เคลือบด้าน + Spot UV</option>
                            </select>
                        </div>

                        <div className="form-group mt-4">
                            <label style={{fontSize: '1.2rem', color: '#1e293b'}}>จำนวนพิมพ์ (ชิ้น)</label>
                            <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                                {[100, 500, 1000, 5000].map(q => (
                                    <button 
                                        key={q} 
                                        className="btn" 
                                        style={{flex: 1, background: config.quantity === q ? '#3b82f6' : '#f1f5f9', color: config.quantity === q ? 'white' : '#475569'}}
                                        onClick={() => setConfig({...config, quantity: q})}
                                    >
                                        {q.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                            <input type="number" className="form-control mt-2" value={config.quantity} onChange={e => setConfig({...config, quantity: Number(e.target.value)})} />
                        </div>
                    </div>
                ) : (
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <h2 className="mb-4" style={{borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem'}}><i className="fa-solid fa-cloud-arrow-up"></i> อัปโหลดอาร์ตเวิร์ค (Max 1GB)</h2>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', background: '#e0e7ff', padding: '1rem', borderRadius: '8px'}}>
                            <div>
                                <h4 style={{color: '#3730a3', margin: 0}}>โหลดเทมเพลตมาตรฐาน (Die-cut Template)</h4>
                                <p style={{fontSize:'0.8rem', color: '#4f46e5', margin: 0}}>สำหรับขนาด {config.width}x{config.length}x{config.height} cm</p>
                            </div>
                            <button className="btn btn-outline" style={{borderColor: '#4f46e5', color: '#4f46e5'}}><i className="fa-solid fa-download"></i> ดาวน์โหลด .AI</button>
                        </div>

                        <div 
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleFileDrop}
                            style={{ 
                                border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '4rem 2rem', 
                                textAlign: 'center', background: file ? '#f0fdf4' : '#f8fafc',
                                cursor: 'pointer', transition: 'all 0.3s'
                            }}>
                            <i className="fa-solid fa-file-pdf" style={{fontSize: '3rem', color: file ? '#22c55e' : '#94a3b8'}}></i>
                            {file ? (
                                <h4 style={{color: '#166534', marginTop: '1rem'}}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</h4>
                            ) : (
                                <>
                                    <h4 style={{color: '#475569', marginTop: '1rem'}}>ลากไฟล์ .AI, .PDF สกุลงานพิมพ์มาวางที่นี่</h4>
                                    <p style={{color: '#94a3b8', fontSize: '0.9rem'}}>รองรับขนาดสูงสุด 1GB ต่อไฟล์</p>
                                    <button className="btn btn-outline mt-2">เลือกไฟล์จากเครื่อง</button>
                                </>
                            )}
                        </div>

                        {/* STRICT ANTI-ERROR CHECKLIST */}
                        <div style={{marginTop: '2rem', background: '#fffbeb', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b'}}>
                            <h4 style={{color: '#b45309'}}><i className="fa-solid fa-triangle-exclamation"></i> เช็คลิสต์ตรวจสอบไฟล์ขั้นสุดท้าย</h4>
                            <p style={{fontSize: '0.85rem', color: '#92400e'}}>กรุณาติ๊กยืนยันข้อมูล ก่อนที่ระบบจะอนุญาตให้ส่งไฟล์เข้าเครื่องพิมพ์ (ป้องกันพิมพ์ผิด)</p>
                            
                            <label style={{display: 'flex', gap: '10px', alignItems: 'center', marginTop: '1rem', cursor: 'pointer'}}>
                                <input type="checkbox" checked={checks.cmyk} onChange={e => setChecks({...checks, cmyk: e.target.checked})} style={{width: '20px', height: '20px'}} />
                                <span>โหมดสีของไฟล์ตั้งค่าเป็น <strong>CMYK</strong> แล้ว (ไม่ใช่ RGB)</span>
                            </label>

                            <label style={{display: 'flex', gap: '10px', alignItems: 'center', marginTop: '1rem', cursor: 'pointer'}}>
                                <input type="checkbox" checked={checks.outline} onChange={e => setChecks({...checks, outline: e.target.checked})} style={{width: '20px', height: '20px'}} />
                                <span>ทำการ <strong>Create Outline</strong> ฟอนต์ทุกตัวเรียบร้อยแล้ว</span>
                            </label>

                            <label style={{display: 'flex', gap: '10px', alignItems: 'center', marginTop: '1rem', cursor: 'pointer'}}>
                                <input type="checkbox" checked={checks.v2} onChange={e => setChecks({...checks, v2: e.target.checked})} style={{width: '20px', height: '20px'}} />
                                <span>ขอยืนยันว่านี่คือไฟล์ <strong>เวอร์ชันสุดท้ายที่ถูกต้องที่สุด (Final Version)</strong></span>
                            </label>
                        </div>
                        
                        <div style={{marginTop: '2rem'}}>
                            <h4>ข้อมูลรับใบเสร็จและติดต่อกลับ</h4>
                            <div className="dashboard-grid mt-2">
                                <div className="form-group">
                                    <label>ชื่อผู้สั่งงาน / บริษัท</label>
                                    <input type="text" className="form-control" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="ระบุเพื่อผูกบัญชี ERP" />
                                </div>
                                <div className="form-group">
                                    <label>เบอร์โทรศัพท์ (สำคัญมาก)</label>
                                    <input type="text" className="form-control" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="เผื่อช่างพิมพ์โทรแจ้งสเปก" />
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* RIGHT COLUMN - STICKY ORDER SUMMARY */}
            <div style={{ position: 'sticky', top: '2rem', width: '380px' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
                    <h3 className="mb-4">ตะกร้าสินค้าย่อ (Summary)</h3>
                    
                    <div style={{borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1rem'}}>
                        <h4 style={{color: '#3b82f6', margin: '0 0 0.5rem 0'}}>{config.product}</h4>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '0.3rem'}}>
                            <span>วัสดุ</span> <span>{config.material}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '0.3rem'}}>
                            <span>ขนาด</span> 
                            <span>
                                {config.width} x {config.length} {(!config.product.includes('แผ่นพับ') && !config.product.includes('ใบปลิว') && !config.product.includes('ปฏิทิน')) && `x ${config.height}`} cm
                            </span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '0.3rem'}}>
                            <span>เทคนิค</span> <span>{config.coating}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '0.3rem'}}>
                            <span>จำนวนพิมพ์</span> <strong>{config.quantity.toLocaleString()} ใบ</strong>
                        </div>
                    </div>

                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                        <span style={{color: '#64748b'}}>มูลค่างานพิมพ์</span>
                        <span style={{fontWeight: 500}}>฿ {price.toLocaleString()}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                        <span style={{color: '#64748b'}}>ภาษีมูลค่าเพิ่ม 7%</span>
                        <span style={{fontWeight: 500}}>฿ {Math.round(price * 0.07).toLocaleString()}</span>
                    </div>

                    <div style={{display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '2px dashed #cbd5e1', borderBottom: '2px dashed #cbd5e1', marginBottom: '1.5rem'}}>
                        <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>ยอดชำระสุทธิ</span>
                        <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981'}}>฿ {Math.round(price * 1.07).toLocaleString()}</span>
                    </div>

                    <div style={{background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem', display: 'flex', gap: '10px'}}>
                        <i className="fa-solid fa-robot" style={{fontSize: '1.5rem', color: '#3b82f6'}}></i>
                        <span>AI Suggestion: สั่งผลิต {config.quantity >= 1000 ? 'เกินพันใบ อัพเกรดแพ็คเกจจัดส่งฟรีให้แล้วครับ!' : 'ล็อตเล็ก แนะนำพิมพ์ดิจิตอลด่วนได้เลยครับ'}</span>
                    </div>

                    {step === 1 ? (
                        <button className="btn btn-primary" style={{width: '100%', padding: '1rem', fontSize: '1.1rem'}} onClick={() => setStep(2)}>
                            อัปโหลดอาร์ตเวิร์คสั่งทำ <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    ) : (
                        <button 
                            className="btn btn-success" 
                            style={{width: '100%', padding: '1rem', fontSize: '1.1rem'}} 
                            disabled={!file || !checks.cmyk || !checks.v2 || !checks.outline || uploading}
                            onClick={submitOrder}
                        >
                            {uploading ? 'กำลังโอนข้อมูล...' : 'ยืนยันสั่งผลิตและชำระเงิน'}
                        </button>
                    )}
                    
                </div>
            </div>

        </div>
    </div>
  );
}
