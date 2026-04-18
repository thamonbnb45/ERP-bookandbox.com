import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export default function Sales() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1000);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load Master Data
    axios.get(`${API_URL}/customers`).then(res => setCustomers(res.data));
    axios.get(`${API_URL}/products`).then(res => setProducts(res.data));
  }, []);

  const selectedProduct = products.find(p => p.id.toString() === selectedProductId);
  const unitPrice = selectedProduct ? selectedProduct.base_price : 0;
  
  const basePrice = unitPrice * qty;
  const vat = basePrice * 0.07;
  const total = basePrice + vat;

  const handleSubmit = async () => {
    if (!selectedCustomerId || !selectedProductId || qty <= 0) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: parseInt(selectedCustomerId),
        product_id: parseInt(selectedProductId),
        quantity: parseInt(qty),
        total_price: total
      };
      
      const res = await axios.post(`${API_URL}/job_orders`, payload);
      alert(`สร้างใบสั่งผลิตสำเร็จ! Job Order ID: ${res.data.id}`);
      
      // Reset form
      setSelectedCustomerId('');
      setSelectedProductId('');
      setQty(1000);
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="view-section active">
      <div className="flex justify-between align-center mb-4">
        <h3>สร้างคำสั่งซื้อ / ใบเสนอราคา (เชื่อม Database จริง)</h3>
      </div>
      
      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
        {/* Order Form */}
        <div className="table-container p-4" style={{ flex: 2, minWidth: '300px' }}>
          <h4 className="mb-4">รายละเอียดงานพิมพ์</h4>
          
          <div className="dashboard-grid">
            <div className="form-group">
              <label>เลือกลูกค้า</label>
              <select className="form-control" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (วงเงิน: {c.credit_limit} บ.)</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>ประเภทสินค้า</label>
              <select className="form-control" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                <option value="">-- เลือกประเภทงานพิมพ์ --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (ราคาพื้นฐาน: {p.base_price})</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>จำนวน (ชิ้น/ใบ)</label>
              <input 
                type="number" 
                className="form-control" 
                value={qty} 
                onChange={e => setQty(e.target.value)} 
                min="1" 
              />
            </div>
            
            <div className="form-group">
              <label>ราคาต่อหน่วย (บาท)</label>
              <input type="text" className="form-control" value={unitPrice.toFixed(2)} readOnly />
            </div>
          </div>
        </div>

        {/* Summary Form */}
        <div className="table-container p-4" style={{ flex: 1, minWidth: '250px', background: 'var(--primary)', color: 'white' }}>
          <h4 style={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '1rem' }}>สรุปยอด</h4>
          <div className="mt-4 flex justify-between">
            <span>ราคาสินค้า:</span>
            <span>{basePrice.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
          </div>
          <div className="mt-4 flex justify-between">
            <span>VAT (7%):</span>
            <span>{vat.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
          </div>
          <div className="mt-4 flex justify-between" style={{ fontSize: '1.5rem', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem', marginTop: '1rem' }}>
            <span>ยอดรวมสุทธิ:</span>
            <span>{total.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
          </div>
          
          <button 
            className="btn bg-white mt-4" 
            style={{ width: '100%', color: 'var(--primary)', justifyContent: 'center' }} 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <i className="fa-solid fa-check-circle"></i> {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันสั่งผลิต (เข้า DB)'}
          </button>
        </div>
      </div>
    </div>
  );
}
