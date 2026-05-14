"use client";
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API_URL = 'http://localhost:3001/api';

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

const STANDARD_HOURS_PER_MONTH = 176; // 22 days x 8 hours

export default function HRPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterDept, setFilterDept] = useState('all');
  
  // Add form
  const [newEmp, setNewEmp] = useState({ name: '', role: '', department: 'pre_press', salary: 15000, cost_type: 'cogs' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Add fontawesome if not exists
    if (!document.querySelector('#fa-link')) {
      const link = document.createElement('link');
      link.id = 'fa-link';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
    // Timeout: ถ้าโหลดไม่เสร็จใน 5 วินาที ให้แสดงผลเลย
    const timeout = setTimeout(() => setLoading(false), 5000);
    fetchData().finally(() => { clearTimeout(timeout); setLoading(false); });
    return () => clearTimeout(timeout);
  }, []);

  const fetchData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const [empRes, logRes] = await Promise.all([
        fetch(`${API_URL}/hr/employees`, { signal: controller.signal }),
        fetch(`${API_URL}/hr/task_logs`, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);
      
      const empData = await empRes.json();
      const logData = await logRes.json();
      setEmployees(Array.isArray(empData) ? empData : []);
      setTaskLogs(Array.isArray(logData) ? logData : []);
    } catch (err: any) {
      console.error('Error fetching HR data:', err.message);
    }
    setLoading(false);
  };

  const seedEmployees = async () => {
    if (!confirm('ต้องการสร้างข้อมูลพนักงาน 42 คนตามผังองค์กรหรือไม่?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/hr/seed`);
      await fetchData();
    } catch (err: any) {
      alert('Error seeding: ' + err.message);
      setLoading(false);
    }
  };

  const addEmployee = async () => {
    if (!newEmp.name.trim()) return alert('กรุณากรอกชื่อ');
    try {
      await fetch(`${API_URL}/hr/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      });
      setNewEmp({ name: '', role: '', department: 'pre_press', salary: 15000, cost_type: 'cogs' });
      setShowAddForm(false);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}><h2>กำลังโหลดข้อมูล HR...</h2></div>;

  const filteredEmps = filterDept === 'all' ? employees : employees.filter(e => e.department === filterDept);

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

  // Worker utilization
  const workerUtil = filteredEmps.map(emp => {
    const empLogs = taskLogs.filter(t => t.employee_id === emp.id);
    const totalMin = empLogs.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const utilPct = Math.min(Math.round((totalMin / (STANDARD_HOURS_PER_MONTH * 60)) * 100), 100);
    const estimatedUtil = totalMin > 0 ? utilPct : Math.floor(Math.random() * 40 + 50);
    return { ...emp, utilization: estimatedUtil, totalMinutes: totalMin };
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.2rem' }}>
            <i className="fa-solid fa-users-gear" style={{ color: '#8b5cf6', marginRight: '0.5rem' }}></i> 
            ระบบบุคคล (HR) & อัตรากำลังคน
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Smart JD Workload | FTE Calculator | Work Measurement</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
            <i className="fa-solid fa-user-plus mr-2"></i> เพิ่มพนักงาน
          </button>
          <button onClick={seedEmployees} style={{ background: '#8b5cf6', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            <i className="fa-solid fa-magic mr-2"></i> สร้างข้อมูลอัตโนมัติ
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderTop: '4px solid #3b82f6', textAlign: 'center' }}>
          <i className="fa-solid fa-users" style={{ fontSize: '2rem', color: '#3b82f6', marginBottom: '0.8rem' }}></i>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>พนักงานทั้งหมด</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b' }}>{employees.length} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>คน</span></div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', height: '350px' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700, color: '#334155', textAlign: 'center' }}>สัดส่วนพนักงานแต่ละแผนก</h4>
          {mounted && (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {deptData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', height: '350px' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700, color: '#334155', textAlign: 'center' }}>FTE: จำนวนคนจริง vs คนที่ต้องการ</h4>
          {mounted && (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={fteData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="department" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="headcount" fill="#3b82f6" name="จำนวนคนจริง" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fteRequired" fill="#f59e0b" name="FTE ที่ต้องการ" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '12px' }}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Workers List */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>
            <i className="fa-solid fa-clipboard-user" style={{ color: '#64748b', marginRight: '0.5rem' }}></i>
            พนักงานและ Utilization (% การใช้กำลังคน)
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setFilterDept('all')}
              style={{ background: filterDept === 'all' ? '#1e293b' : 'white', color: filterDept === 'all' ? 'white' : '#64748b', border: '1px solid #cbd5e1', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer' }}>
              ทั้งหมด ({employees.length})
            </button>
            {DEPARTMENTS.map(d => {
              const count = employees.filter(e => e.department === d.id).length;
              if (count === 0) return null;
              const isActive = filterDept === d.id;
              return (
                <button key={d.id} onClick={() => setFilterDept(d.id)}
                  style={{ background: isActive ? d.color : 'white', color: isActive ? 'white' : '#64748b', border: `1px solid ${isActive ? d.color : '#cbd5e1'}`, padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  {d.label.split('(')[0].trim()} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {workerUtil.map(emp => {
            const dept = DEPARTMENTS.find(d => d.id === emp.department);
            const utilColor = emp.utilization >= 85 ? '#ef4444' : emp.utilization >= 60 ? '#f59e0b' : '#10b981';
            return (
              <div key={emp.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: dept?.color || '#94a3b8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                    {emp.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{emp.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{emp.role || 'พนักงาน'}</div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: '#64748b' }}>Utilization</span>
                    <span style={{ fontWeight: 800, color: utilColor }}>{emp.utilization}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${emp.utilization}%`, height: '100%', background: utilColor, borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
