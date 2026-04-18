import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const MOCK_BANK_FEED = [
    { id: 1, date: '18/04 11:30', amount: 1500.00, ref: 'KBANK xxxx1234', matched: false },
    { id: 2, date: '18/04 09:15', amount: 12500.00, ref: 'SCB xxxx9999', matched: false },
    { id: 3, date: '18/04 13:45', amount: 1605.00, ref: 'BBL xxxx1122', matched: false }
];

export default function Accounting() {
  const [jobOrders, setJobOrders] = useState([]);
  const [bankFeeds, setBankFeeds] = useState(MOCK_BANK_FEED);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJobOrders();
  }, []);

  const fetchJobOrders = () => {
    setIsLoading(true);
    axios.get(`${API_URL}/job_orders`)
         .then(res => {
             // Filter only jobs that are awaiting accounting approval
             const pendingJobs = res.data.filter(j => j.production_stage === 'awaiting_payment');
             setJobOrders(pendingJobs);
             setIsLoading(false);
         })
         .catch(err => {
             console.error(err);
             setIsLoading(false);
         });
  };

  const handleMatch = (feedId, amount) => {
    const isMatched = confirm(`คุณต้องการจับคู่ (Reconcile) ยอดเงิน ฿${amount.toLocaleString()} กับระบบใช่หรือไม่?`);
    if (isMatched) {
      setBankFeeds(prev => prev.map(f => f.id === feedId ? { ...f, matched: true } : f));
      alert("กระทบยอดสำเร็จ! สถานะของใบสั่งซื้อจะถูกปรับให้ชำระเงินแล้ว");
    }
  };

  const handleApproveCredit = async (jobId) => {
    const confirmApprove = confirm(`อนุมัติให้ใบสั่งงาน #${jobId} ผ่านเข้าสู่ฝ่ายผลิตใช่หรือไม่?`);
    if (!confirmApprove) return;
    
    try {
        await axios.put(`${API_URL}/job_orders/${jobId}/approve_payment`);
        alert(`✅ อนุมัติสำเร็จ! บิล #${jobId} ถูกส่งเข้ากระดานฝ่ายผลิตแล้ว`);
        fetchJobOrders();
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการอนุมัติ");
        console.error(err);
    }
  };

  return (
    <div className="view-section active">
      <div className="flex justify-between align-center mb-4">
        <div>
            <h3 className="text-primary">ตรวจสอบบัญชี & Reconcile</h3>
            <p>เช็คเงินเข้าเทียบกับใบสั่งงาน (Accounting Department)</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Bank Feed */}
        <div className="table-container p-4 shadow" style={{ borderTop: '4px solid var(--success)' }}>
            <h4 className="mb-4"><i className="fa-solid fa-building-columns"></i> เงินเข้าบัญชีธนาคาร (Statement)</h4>
            <table style={{ fontSize: '0.9rem' }}>
                <thead>
                    <tr><th>เวลา</th><th>ยอดเงิน</th><th>จัดการ</th></tr>
                </thead>
                <tbody>
                  {bankFeeds.map(feed => (
                    <tr key={feed.id} style={{ opacity: feed.matched ? 0.5 : 1 }}>
                      <td>{feed.date} <br/><small>{feed.ref}</small></td>
                      <td className="text-success" style={{ fontWeight: 600 }}>+฿{feed.amount.toLocaleString()}</td>
                      <td>
                        {feed.matched ? (
                           <span className="status-badge status-done"><i className="fa-solid fa-check"></i> Matched</span>
                        ) : (
                           <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleMatch(feed.id, feed.amount)}>
                             จับคู่
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
        </div>

        {/* Unmatched Invoices */}
        <div className="table-container p-4 shadow" style={{ borderTop: '4px solid var(--warning)' }}>
            <h4 className="mb-4"><i className="fa-solid fa-file-invoice"></i> บิลที่รอเรียกเก็บเงิน & หัก ณ ที่จ่าย 3%</h4>
            <table style={{ fontSize: '0.9rem' }}>
                <thead>
                    <tr>
                        <th>ใบสั่งงาน</th>
                        <th>ลูกค้า / สินค้า</th>
                        <th>ยอดสุทธิ (100%)</th>
                        <th>หัก 3% (WHT)</th>
                        <th>ยอดโอนจริง</th>
                    </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                      <tr><td colSpan="5" className="text-center">กำลังโหลดข้อมูล...</td></tr>
                  ) : jobOrders.length > 0 ? (
                      jobOrders.map(job => {
                        const wht3 = job.total_price * 0.03;
                        const netPay = job.total_price - wht3;
                        return (
                          <tr key={job.id}>
                            <td>
                                <strong>#JOB-{job.id}</strong><br/>
                                <span className="status-badge status-pending" style={{fontSize: '0.7rem'}}>รอชำระเงิน</span>
                            </td>
                            <td>
                                {typeof job.customer === 'object' ? job.customer.name : job.customer} <br/>
                                <small className="text-muted">{typeof job.product === 'object' ? job.product.name : job.product}</small>
                            </td>
                            <td style={{ fontWeight: 600 }}>฿{job.total_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="text-danger">-฿{wht3.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="text-success" style={{ fontWeight: 'bold' }}>฿{netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          </tr>
                        );
                      })
                  ) : (
                      <tr><td colSpan="5" className="text-center">ไม่มีบิลค้างชำระ</td></tr>
                  )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Credit Approval */}
      <div className="table-container p-4 mt-4 shadow" style={{ borderTop: '4px solid var(--primary)' }}>
        <h4 className="mb-4 text-primary">ระบบสั่งงานแบบเครดิต (ผลิตก่อนจ่าย)</h4>
        <p className="mb-4">พนักงานบัญชีสามารถกดยืนยันปล่อยงานเครดิต เพื่อให้ฝ่ายผลิตเริ่มทำงานได้ก่อน (ขึ้นอยู่กับวงเงินคงเหลือของลูกค้า)</p>
        <table style={{ fontSize: '0.9rem' }}>
            <thead>
                <tr><th>เลขใบสั่งงาน</th><th>ลูกค้า</th><th>ยอดโอนรวมสุทธิ (หลังหัก 3%)</th><th>Action</th></tr>
            </thead>
            <tbody>
               {isLoading ? (
                  <tr><td colSpan="4" className="text-center">กำลังโหลดข้อมูล...</td></tr>
               ) : jobOrders.length > 0 ? (
                   jobOrders.map(job => {
                       const wht3 = job.total_price * 0.03;
                       const netPay = job.total_price - wht3;
                       return (
                         <tr key={`credit-${job.id}`}>
                           <td><strong>#JOB-{job.id}</strong></td>
                           <td>{typeof job.customer === 'object' ? job.customer.name : job.customer}</td>
                           <td className="text-primary" style={{fontWeight: 'bold'}}>฿{netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                           <td>
                             <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => handleApproveCredit(job.id)}>
                               <i className="fa-solid fa-check-double"></i> อนุมัติเงินเข้า / ปลดล็อคเข้าผลิต
                             </button>
                           </td>
                         </tr>
                       );
                   })
               ) : (
                   <tr><td colSpan="4" className="text-center">ไม่มีบิลรออนุมัติ</td></tr>
               )}
            </tbody>
        </table>
      </div>

    </div>
  );
}
