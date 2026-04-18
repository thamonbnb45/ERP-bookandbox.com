import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/metrics`);
      setMetrics(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const seedMockData = async () => {
    try {
      if(!confirm("ต้องการยัดข้อมูลจำลอง (Seed) 30 วันลงฐานข้อมูลใช่หรือไม่?")) return;
      setLoading(true);
      await axios.get(`${API_URL}/seed`);
      alert("สร้างข้อมูลจำลองสำเร็จ! กำลังโหลดกราฟใหม่...");
      await fetchDashboardMetrics();
    } catch(err) {
      console.error(err);
      alert("Error seeding data");
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4"><h2>กำลังโหลดข้อมูล...</h2></div>;
  if (!metrics) return <div className="p-4"><h2>ไม่สามารถเชื่อมต่อฐานข้อมูลได้</h2></div>;

  // Format pie chart data
  const { stagesCount } = metrics;
  const pieData = Object.keys(stagesCount).map((key) => ({
    name: key,
    value: stagesCount[key]
  })).filter(item => item.value > 0);

  return (
    <div className="view-section active p-4">
      <div className="flex justify-between align-center mb-4">
        <div>
          <h2 className="text-primary mb-2">ภาพรวมธุรกิจ (Business Dashboard)</h2>
          <p className="text-muted">ข้อมูลสรุปผลประกอบการย้อนหลัง 30 วัน</p>
        </div>
        <button className="btn btn-outline" onClick={seedMockData}>
          <i className="fa-solid fa-magic"></i> จำลองตัวเลข (Seed 30 Days)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid mb-4">
        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid var(--primary)' }}>
          <i className="fa-solid fa-sack-dollar text-primary" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
          <h3 className="text-muted">ยอดขาย (30 วัน)</h3>
          <h2 className="text-primary" style={{ fontSize: '2rem' }}>฿{metrics.totalRevenue.toLocaleString()}</h2>
        </div>
        
        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid var(--accent)' }}>
          <i className="fa-solid fa-file-invoice text-accent" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
          <h3 className="text-muted">จำนวนออเดอร์</h3>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent)' }}>{metrics.totalOrders} <span style={{fontSize:'1rem'}}>งาน</span></h2>
        </div>

        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid var(--success)' }}>
          <i className="fa-solid fa-box-open text-success" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
          <h3 className="text-muted">งานที่ส่งมอบแล้ว</h3>
          <h2 className="text-success" style={{ fontSize: '2rem' }}>{metrics.completedOrders} <span style={{fontSize:'1rem'}}>งาน</span></h2>
        </div>

        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid #8b5cf6' }}>
          <i className="fa-brands fa-line" style={{ fontSize: '2rem', color: '#8b5cf6', marginBottom: '1rem' }}></i>
          <h3 className="text-muted">ลูกค้า (Leads) สะสม</h3>
          <h2 style={{ fontSize: '2rem', color: '#8b5cf6' }}>{metrics.leadsCount} <span style={{fontSize:'1rem'}}>คน</span></h2>
        </div>
      </div>

      {/* Charts Box */}
      <div style={{ display: 'grid', gridTemplateColumns: 'reapete(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', display: 'flex', flexWrap: 'wrap' }}>
        
        {/* Bar Chart - Sales Trend */}
        <div className="table-container p-4 shadow" style={{ flex: 2, minWidth: '400px', height: '400px' }}>
          <h4 className="mb-4 text-center">แนวโน้มยอดขาย (14 วันล่าสุด)</h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={metrics.dailySales.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tickFormatter={(val) => `฿${(val/1000)}k`} />
              <RechartsTooltip formatter={(value) => `฿${value.toLocaleString()}`} />
              <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Job Stages */}
        <div className="table-container p-4 shadow" style={{ flex: 1, minWidth: '300px', height: '400px' }}>
          <h4 className="mb-4 text-center">สัดส่วนสถานะงาน (Job Allocation)</h4>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
}
