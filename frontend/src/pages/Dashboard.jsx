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
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const [resMetrics, resInsights] = await Promise.all([
         axios.get(`${API_URL}/dashboard/metrics`),
         axios.get(`${API_URL}/dashboard/insights`)
      ]);
      setMetrics(resMetrics.data);
      if(resInsights.data.success) {
         setInsights(resInsights.data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const seedDeepChats = async () => {
    try {
      if(!confirm("ต้องการสร้างแชทสมมติ 100 ข้อความ + รูปภาพ ย้อนหลัง 30 วันหรือไม่?")) return;
      setLoading(true);
      await axios.get(`${API_URL}/seed_chats`);
      alert("จำลองการแชทลูกค้าเรียบร้อยแล้ว!");
      await fetchDashboardMetrics();
    } catch(err) {
      console.error(err);
      alert("Error seeding deep chats");
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

  // Formatting Insights data
  let wordData = [];
  let peakData = [];
  if (insights) {
      wordData = Object.keys(insights.wordFreq).map(word => ({
          subject: word, A: insights.wordFreq[word], fullMark: 50
      })).sort((a,b) => b.A - a.A); // sort desc

      peakData = insights.peakHours.map((count, hour) => ({
          hour: `${hour}:00`, 'ข้อความ': count
      }));
  }

  return (
    <div className="view-section active p-4">
      <div className="flex justify-between align-center mb-4">
        <div>
          <h2 className="text-primary mb-2">ภาพรวมธุรกิจ (Business Dashboard)</h2>
          <p className="text-muted">ข้อมูลสรุปผลประกอบการย้อนหลัง 30 วัน</p>
        </div>
        <div>
            <button className="btn btn-outline mr-2" onClick={seedMockData}>
            <i className="fa-solid fa-magic"></i> จำลองตัวเลข (Seed 30 Days)
            </button>
            <button className="btn btn-primary" onClick={seedDeepChats}>
            <i className="fa-solid fa-comments"></i> เริ่มวิจัยแชทลูกค้า (AI Analytics)
            </button>
        </div>
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

      {/* --- AI MARKET INSIGHTS SECTION --- */}
      {insights && (
      <div className="mt-5 pt-4" style={{borderTop: '2px dashed var(--border-color)'}}>
         <h2 className="text-accent mb-2"><i className="fa-solid fa-brain"></i> วิเคราะห์เจาะลึกพฤติกรรมลูกค้า (CRM AI Insights)</h2>
         <p className="text-muted mb-4">วิเคราะห์จากประวัติแชทลูกค้าทั้งหมด {insights.totalClientMsgs} ข้อความย้อนหลัง 1 เดือน</p>
         
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Keyword Popularity */}
            <div className="table-container p-4 shadow text-center">
                <h4 className="mb-4">แฮชแท็กคำฮิต (Keyword Trending)</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={wordData.slice(0, 7)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" hide />
                        <YAxis dataKey="subject" type="category" width={100} style={{fontSize:'0.8rem', fontWeight:'bold'}} />
                        <RechartsTooltip />
                        <Bar dataKey="A" fill="#ec4899" radius={[0, 4, 4, 0]} name="จำนวนที่พูดถึง (ครั้ง)" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Peak Hours */}
            <div className="table-container p-4 shadow text-center" style={{gridColumn: 'span 2'}}>
                <h4 className="mb-4">ช่วงเวลาลูกค้าทักแชทเยอะที่สุด (Peak Chat Hours)</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={peakData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="hour" tick={{fontSize: 10}} interval={2} />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="ข้อความ" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* Reference Gallery */}
         {insights.gallery && insights.gallery.length > 0 && (
             <div className="table-container p-4 shadow mt-4">
                 <h4 className="mb-4"><i className="fa-solid fa-images text-accent"></i> คลังรูปภาพอ้างอิงที่ลูกค้าส่งมา (Reference Gallery)</h4>
                 <div style={{display: 'flex', gap: '1rem', flexWrap:'wrap'}}>
                     {insights.gallery.map((imgUrl, i) => (
                         <div key={i} style={{width: '200px', height: '200px', borderRadius:'12px', overflow:'hidden', border:'1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}>
                             <img src={imgUrl} alt={`ref-${i}`} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                         </div>
                     ))}
                 </div>
             </div>
         )}
      </div>
      )}

    </div>
  );
}
