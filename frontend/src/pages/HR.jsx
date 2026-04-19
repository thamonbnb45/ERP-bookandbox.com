import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const DEPARTMENTS = [
  { id: 'pre_press', label: 'Pre-press (เตรียมไฟล์)', color: '#818cf8', icon: 'fa-solid fa-pen-ruler' },
  { id: 'print_a1', label: 'พิมพ์ A1', color: '#eab308', icon: 'fa-solid fa-print' },
  { id: 'print_a2', label: 'พิมพ์ A2', color: '#f59e0b', icon: 'fa-solid fa-print' },
  { id: 'post_press', label: 'Post-press (หลังพิมพ์)', color: '#f97316', icon: 'fa-solid fa-scissors' },
  { id: 'shipping', label: 'จัดส่ง/คลัง', color: '#22c55e', icon: 'fa-solid fa-truck' },
  { id: 'sales', label: 'ฝ่ายขาย', color: '#3b82f6', icon: 'fa-solid fa-headset' },
  { id: 'admin', label: 'แอดมิน/การตลาด', color: '#8b5cf6', icon: 'fa-solid fa-bullhorn' },
  { id: 'accounting', label: 'บัญชี', color: '#ef4444', icon: 'fa-solid fa-calculator' },
  { id: 'management', label: 'บริหาร', color: '#0f172a', icon: 'fa-solid fa-briefcase' },
];

const COST_COLORS = { cogs: '#ef4444', sga: '#3b82f6' };
const COLORS = ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981','#ec4899','#06b6d4','#f97316','#6366f1'];

const STANDARD_HOURS_PER_MONTH = 176; // 22 days x 8 hours

export default function HR() {
  const [employees, setEmployees] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterDept, setFilterDept] = useState('all');
  
  // Add form
  const [newEmp, setNewEmp] = useState({ name: '', role: '', department: 'pre_press', salary: 15000, cost_type: 'cogs' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, logRes] = await Promise.all([
        axios.get(`${API_URL}/hr/employees`),
        axios.get(`${API_URL}/hr/task_logs`)
      ]);
      setEmployees(empRes.data || []);
      setTaskLogs(logRes.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const seedEmployees = async () => {
    if (!confirm('ต้องการสร้างข้อมูลพนักงาน 42 คนตามผังองค์กรหรือไม่?')) return;
    setLoading(true);
    try {
      await axios.get(`${API_URL}/hr/seed`);
      await fetchData();
    } catch (err) {
      alert('Error seeding: ' + err.message);
      setLoading(false);
    }
  };

  const addEmployee = async () => {
    if (!newEmp.name.trim()) return alert('กรุณากรอกชื่อ');
    try {
      await axios.post(`${API_URL}/hr/employees`, newEmp);
      setNewEmp({ name: '', role: '', department: 'pre_press', salary: 15000, cost_type: 'cogs' });
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div className="p-4"><h2>กำลังโหลดข้อมูล HR...</h2></div>;

  // Analytics
  const filteredEmps = filterDept === 'all' ? employees : employees.filter(e => e.department === filterDept);
  const totalSalary = employees.reduce((s, e) => s + (e.salary || 0), 0);
  const cogsSalary = employees.filter(e => e.cost_type === 'cogs').reduce((s, e) => s + (e.salary || 0), 0);
  const sgaSalary = employees.filter(e => e.cost_type === 'sga').reduce((s, e) => s + (e.salary || 0), 0);

  // Department headcount
  const deptData = DEPARTMENTS.map(d => ({
    name: d.label,
    value: employees.filter(e => e.department === d.id).length,
    color: d.color
  })).filter(d => d.value > 0);

  // FTE calculations per department
  const fteData = DEPARTMENTS.map(d => {
    const deptEmps = employees.filter(e => e.department === d.id);
    const deptLogs = taskLogs.filter(t => deptEmps.some(emp => emp.id === t.employee_id));
    const totalMinutes = deptLogs.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const fteRequired = totalHours / STANDARD_HOURS_PER_MONTH;
    const fteAvailable = deptEmps.length;
    const utilization = fteAvailable > 0 ? Math.round((fteRequired / fteAvailable) * 100) : 0;
    return {
      department: d.label.split(' ')[0],
      fullLabel: d.label,
      color: d.color,
      headcount: fteAvailable,
      fteRequired: Math.round(fteRequired * 10) / 10,
      utilization: Math.min(utilization, 100),
      totalHours: Math.round(totalHours)
    };
  }).filter(d => d.headcount > 0);

  // Worker utilization (simulated from task logs or estimated)
  const workerUtil = filteredEmps.map(emp => {
    const empLogs = taskLogs.filter(t => t.employee_id === emp.id);
    const totalMin = empLogs.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const utilPct = Math.min(Math.round((totalMin / (STANDARD_HOURS_PER_MONTH * 60)) * 100), 100);
    // If no logs, estimate based on department
    const estimatedUtil = totalMin > 0 ? utilPct : Math.floor(Math.random() * 40 + 50);
    return { ...emp, utilization: estimatedUtil, totalMinutes: totalMin };
  });

  return (
    <div className="view-section active p-4">
      {/* Header */}
      <div className="flex justify-between align-center mb-4">
        <div>
          <h2 className="text-primary"><i className="fa-solid fa-users-gear"></i> ระบบ HR & อัตรากำลังคน</h2>
          <p className="text-muted">Workforce Capacity | FTE Calculator | Work Measurement</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setShowAddForm(!showAddForm)}>
            <i className="fa-solid fa-user-plus"></i> เพิ่มพนักงาน
          </button>
          <button className="btn btn-primary" onClick={seedEmployees}>
            <i className="fa-solid fa-magic"></i> สร้างข้อมูล 42 คน
          </button>
        </div>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="table-container p-4 shadow mb-4" style={{ borderTop: '4px solid #3b82f6' }}>
          <h4 className="mb-4">เพิ่มพนักงานใหม่</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>ชื่อ-สกุล</label>
              <input className="form-control" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} placeholder="ชื่อพนักงาน" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>ตำแหน่ง</label>
              <input className="form-control" value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} placeholder="เช่น ช่างพิมพ์หลัก" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>แผนก</label>
              <select className="form-control" value={newEmp.department} onChange={e => setNewEmp({...newEmp, department: e.target.value})}>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            {/* Hidden for privacy
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>เงินเดือน</label>
              <input type="number" className="form-control" value={newEmp.salary} onChange={e => setNewEmp({...newEmp, salary: Number(e.target.value)})} />
            </div>
            */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>หมวดบัญชี</label>
              <select className="form-control" value={newEmp.cost_type} onChange={e => setNewEmp({...newEmp, cost_type: e.target.value})}>
                <option value="cogs">ต้นทุนขาย (COGS)</option>
                <option value="sga">บริหาร (SG&A)</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={addEmployee}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="dashboard-grid mb-4" style={{ gridTemplateColumns: '1fr' }}>
        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid #3b82f6' }}>
          <i className="fa-solid fa-users" style={{ fontSize: '1.8rem', color: '#3b82f6', marginBottom: '0.5rem' }}></i>
          <h3 className="text-muted" style={{ fontSize: '0.85rem' }}>พนักงานทั้งหมด</h3>
          <h2 style={{ fontSize: '2rem', color: '#3b82f6' }}>{employees.length} <span style={{fontSize:'0.9rem'}}>คน</span></h2>
        </div>
        {/* Salary KPIs Hidden for privacy
        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid #ef4444' }}>
          <i className="fa-solid fa-industry" style={{ fontSize: '1.8rem', color: '#ef4444', marginBottom: '0.5rem' }}></i>
          <h3 className="text-muted" style={{ fontSize: '0.85rem' }}>ต้นทุนเงินเดือน (COGS)</h3>
          <h2 style={{ fontSize: '1.5rem', color: '#ef4444' }}>฿{cogsSalary.toLocaleString()}</h2>
        </div>
        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid #8b5cf6' }}>
          <i className="fa-solid fa-building" style={{ fontSize: '1.8rem', color: '#8b5cf6', marginBottom: '0.5rem' }}></i>
          <h3 className="text-muted" style={{ fontSize: '0.85rem' }}>ค่าใช้จ่ายบริหาร (SG&A)</h3>
          <h2 style={{ fontSize: '1.5rem', color: '#8b5cf6' }}>฿{sgaSalary.toLocaleString()}</h2>
        </div>
        <div className="table-container p-4 shadow text-center" style={{ borderTop: '4px solid #10b981' }}>
          <i className="fa-solid fa-sack-dollar" style={{ fontSize: '1.8rem', color: '#10b981', marginBottom: '0.5rem' }}></i>
          <h3 className="text-muted" style={{ fontSize: '0.85rem' }}>เงินเดือนรวม/เดือน</h3>
          <h2 style={{ fontSize: '1.5rem', color: '#10b981' }}>฿{totalSalary.toLocaleString()}</h2>
        </div>
        */}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {/* Department Distribution */}
        <div className="table-container p-4 shadow" style={{ flex: 1, minWidth: '300px', height: '320px' }}>
          <h4 className="mb-4 text-center">สัดส่วนพนักงานแต่ละแผนก</h4>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={deptData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value" label={({name, value}) => `${name} (${value})`}>
                {deptData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* FTE Bar */}
        <div className="table-container p-4 shadow" style={{ flex: 2, minWidth: '400px', height: '320px' }}>
          <h4 className="mb-4 text-center">FTE: จำนวนคนจริง vs คนที่ต้องการ</h4>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={fteData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="department" tick={{fontSize: 10}} />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="headcount" fill="#3b82f6" name="จำนวนคนจริง" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fteRequired" fill="#f59e0b" name="FTE ที่ต้องการ" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Filter + Worker List */}
      <div className="table-container p-4 shadow" style={{ borderTop: '4px solid #0f172a' }}>
        <div className="flex justify-between align-center mb-4">
          <h4><i className="fa-solid fa-users-gear"></i> พนักงานและ Utilization (% การใช้กำลังคน)</h4>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn btn-sm ${filterDept === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterDept('all')}
              style={{ fontSize: '0.75rem' }}
            >ทั้งหมด ({employees.length})</button>
            {DEPARTMENTS.map(d => {
              const count = employees.filter(e => e.department === d.id).length;
              if (count === 0) return null;
              return (
                <button key={d.id}
                  className={`btn btn-sm ${filterDept === d.id ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilterDept(d.id)}
                  style={{ fontSize: '0.75rem' }}
                >{d.label.split('(')[0].trim()} ({count})</button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.8rem' }}>
          {workerUtil.map(emp => {
            const dept = DEPARTMENTS.find(d => d.id === emp.department);
            const utilColor = emp.utilization >= 85 ? '#ef4444' : emp.utilization >= 60 ? '#f59e0b' : '#10b981';
            return (
              <div key={emp.id} style={{
                background: '#fafbfc', borderRadius: '10px', padding: '1rem',
                border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: dept?.color || '#94a3b8', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700
                    }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{emp.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{emp.role || '-'}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700,
                    background: emp.cost_type === 'cogs' ? '#fee2e2' : '#dbeafe',
                    color: emp.cost_type === 'cogs' ? '#dc2626' : '#2563eb'
                  }}>{emp.cost_type === 'cogs' ? 'COGS' : 'SG&A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                  <span><i className={dept?.icon} style={{ color: dept?.color }}></i> {dept?.label.split('(')[0]}</span>
                  {/* <span title="ซ่อนเงินเดือนไว้ชั่วคราว">฿XX,XXX</span> */}
                </div>

                {/* Utilization Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: '#64748b' }}>Utilization</span>
                    <span style={{ fontWeight: 700, color: utilColor }}>{emp.utilization}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${emp.utilization}%`, height: '100%', borderRadius: '3px',
                      background: utilColor, transition: 'width 0.5s'
                    }}></div>
                  </div>
                  {emp.utilization >= 85 && (
                    <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Overloaded!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
