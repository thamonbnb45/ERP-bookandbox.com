import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Sales from './pages/Sales';
import AdWeb from './pages/AdWeb';
import Production from './pages/Production';
import Accounting from './pages/Accounting';
import CustomerPortal from './pages/CustomerPortal';
import Dashboard from './pages/Dashboard';
import HR from './pages/HR';
import Logistics from './pages/Logistics';
import Estimator from './pages/Estimator';
import SalesReport from './pages/SalesReport';
import SalesPipeline from './pages/SalesPipeline';
import PrintFlow from './pages/PrintFlow';
import SalesAnalysis from './pages/SalesAnalysis';
import Settings from './pages/Settings';
import Login from './pages/Login';
import VirtualOffice from './pages/VirtualOffice';
import TimeLogger from './pages/TimeLogger';
import SmartFactory from './pages/SmartFactory';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

function Sidebar({ isOpen, closeSidebar, isCollapsed }) {
  const location = useLocation();
  const { user, canAccess } = useAuth();
  
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header flex justify-between align-center" style={{ width: '100%' }}>
          <div className="logo">Book<span style={{color: '#5b92e5'}}>and</span>box</div>
          <i className="fa-solid fa-xmark menu-toggle mobile-close-btn" onClick={closeSidebar} style={{ cursor: 'pointer' }}></i>
      </div>
      <nav className="nav-links">
          {/* ⏱️ ลงเวลาทำงาน (ทุกคนใช้ได้) */}
          <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', margin: '1rem 0 0.2rem 1rem', textTransform: 'uppercase' }}>บันทึกเวลา (Time Logger)</div>
          <Link to="/time-logger" className={`nav-item ${location.pathname === '/time-logger' ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="fa-solid fa-stopwatch"></i> ลงเวลาทำงาน (My Tasks)
          </Link>

          {/* 👑 ผู้บริหาร */}
          {canAccess('dashboard_module', ['CEO']) && (
              <>
                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', margin: '1rem 0 0.2rem 1rem', textTransform: 'uppercase' }}>ผู้บริหาร (Executive)</div>
                <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={closeSidebar}>
                   <i className="fa-solid fa-chart-pie"></i> Executive Dashboard
                </Link>
                <Link to="/sales-analysis" className={`nav-item ${location.pathname === '/sales-analysis' ? 'active' : ''}`} onClick={closeSidebar}>
                   <i className="fa-solid fa-magnifying-glass-chart"></i> Sales Intelligence
                </Link>
              </>
          )}

          {/* 🎯 ฝ่ายขาย (Sales & Marketing) */}
          {canAccess('sales_module', ['CEO', 'Sales', 'Accountant']) && (
              <>
                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', margin: '1rem 0 0.2rem 1rem', textTransform: 'uppercase' }}>ฝ่ายขาย (Sales)</div>
                <Link to="/adweb" className={`nav-item ${location.pathname === '/adweb' ? 'active' : ''}`} onClick={closeSidebar}>
                   <i className="fa-brands fa-line"></i> Chat Center
                </Link>
                <Link to="/pipeline" className={`nav-item ${location.pathname === '/pipeline' ? 'active' : ''}`} onClick={closeSidebar}>
                   <i className="fa-solid fa-diagram-project"></i> Sales Pipeline
                </Link>
                <Link to="/sales-report" className={`nav-item ${location.pathname === '/sales-report' ? 'active' : ''}`} onClick={closeSidebar}>
                   <i className="fa-solid fa-chart-line"></i> Sales Daily Report
                </Link>
                <Link to="/sales" className={`nav-item ${location.pathname === '/sales' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-cart-shopping"></i> ออเดอร์ทั้งหมด
                </Link>
              </>
          )}

          {/* 💰 ประเมินราคา (Pricing) */}
          {canAccess('pricing_module', ['CEO', 'Pricing']) && (
              <>
                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', margin: '1rem 0 0.2rem 1rem', textTransform: 'uppercase' }}>ประเมินราคา (Pricing)</div>
                <Link to="/estimator" className={`nav-item ${location.pathname === '/estimator' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-coins"></i> ศูนย์ราคา (Price Hub)
                </Link>
              </>
          )}

          {/* 🏭 ผลิตและจัดส่ง (Production & Logistics) */}
          {canAccess('production_module', ['CEO', 'Production Manager', 'Operator', 'Warehouse', 'Driver', 'Sales']) && (
              <>
                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', margin: '1rem 0 0.2rem 1rem', textTransform: 'uppercase' }}>ผลิตและจัดส่ง (Production)</div>
                <Link to="/smart-factory" className={`nav-item ${location.pathname === '/smart-factory' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-gears"></i> 🏭 Smart Factory (APS)
                </Link>
                <Link to="/print-flow" className={`nav-item ${location.pathname === '/print-flow' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-print"></i> วางแผนผลิต (Print Flow)
                </Link>
                <Link to="/production" className={`nav-item ${location.pathname === '/production' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-industry"></i> Production Control
                </Link>
                <Link to="/logistics" className={`nav-item ${location.pathname === '/logistics' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-truck-fast"></i> จัดส่ง Logistics
                </Link>
                <Link to="/time-logger" className={`nav-item ${location.pathname === '/time-logger' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-stopwatch"></i> ⏱️ ลงเวลาทำงาน
                </Link>
              </>
          )}

          {/* 🧾 บัญชี การเงิน จัดซื้อ */}
          {canAccess('finance_module', ['CEO', 'Accountant']) && (
              <>
                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', margin: '1rem 0 0.2rem 1rem', textTransform: 'uppercase' }}>บัญชีและการเงิน (Finance)</div>
                <Link to="/accounting" className={`nav-item ${location.pathname === '/accounting' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-file-invoice-dollar"></i> Finance & Billing
                </Link>
              </>
          )}

          {/* 👥 HR */}
          {canAccess('hr_module', ['CEO', 'HR', 'Production Manager']) && (
              <>
                <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', margin: '1rem 0 0.2rem 1rem', textTransform: 'uppercase' }}>ทรัพยากรบุคคล (HR)</div>
                <Link to="/hr" className={`nav-item ${location.pathname === '/hr' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-users-gear"></i> HR Workforce
                </Link>
                <Link to="/virtual-office" className={`nav-item ${location.pathname === '/virtual-office' ? 'active' : ''}`} onClick={closeSidebar}>
                    <i className="fa-solid fa-building-user"></i> Virtual Office
                </Link>
              </>
          )}

          {/* ⚙️ ตั้งค่า */}
          {user?.role === 'CEO' && (
              <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={closeSidebar} style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <i className="fa-solid fa-gear"></i> ตั้งค่าระบบ & สิทธิ์
              </Link>
          )}
      </nav>
    </aside>
  );
}

function Topbar({ title, toggleSidebar }) {
  const { user, logout, originalUser, switchRole, switchBack } = useAuth();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const isCEO = originalUser?.role === 'CEO' || (!originalUser && user?.role === 'CEO');
  const isViewingAs = !!originalUser && originalUser.id !== user?.id;

  const demoRoles = [
    { full_name: 'เดโม่ เซลส์', role: 'Sales', icon: '💬' },
    { full_name: 'เดโม่ ช่างพิมพ์', role: 'Operator', icon: '🖨️' },
    { full_name: 'เดโม่ ผจก.ผลิต', role: 'Production Manager', icon: '📋' },
    { full_name: 'เดโม่ บัญชี', role: 'Accountant', icon: '🧾' },
    { full_name: 'เดโม่ คิดราคา', role: 'Pricing', icon: '🔢' },
    { full_name: 'เดโม่ คนขับ', role: 'Driver', icon: '🚚' },
    { full_name: 'เดโม่ คลัง', role: 'Warehouse', icon: '📦' },
  ];

  return (
    <header className="topbar">
        <div className="flex align-center gap-4">
            <i className="fa-solid fa-bars menu-toggle" onClick={toggleSidebar} style={{ display: 'block', cursor: 'pointer', fontSize: '1.5rem', padding: '0.5rem', background: '#e2e8f0', borderRadius: '8px', color: '#0f4c81' }} title="ซ่อน/แสดงเมนู"></i>
            <h2 className="text-primary" style={{ fontSize: '1.2rem', margin: 0 }}>{title}</h2>
        </div>
        <div className="topbar-right">
            {isViewingAs && (
              <button onClick={switchBack} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.75rem', marginRight:8 }}>
                🔙 กลับเป็น CEO
              </button>
            )}
            <div className="profile-wrap" style={{ position:'relative' }}>
                <div className="avatar" style={{ background: user?.role === 'CEO' ? '#e11d48' : isViewingAs ? '#f59e0b' : 'var(--primary)', cursor: isCEO ? 'pointer' : 'default' }} onClick={() => isCEO && setShowRolePicker(!showRolePicker)}>
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="desktop-only text-right" style={{ cursor: isCEO ? 'pointer' : 'default' }} onClick={() => isCEO && setShowRolePicker(!showRolePicker)}>
                    <p style={{fontSize: '0.9rem', fontWeight: 500, margin:0}}>{user?.full_name || 'ไม่ระบุตัวตน'} {isCEO && !isViewingAs && '▾'}</p>
                    <p style={{fontSize: '0.8rem', margin:0, color: isViewingAs ? '#f59e0b' : '#64748b'}}>{isViewingAs ? `👁️ ดูในมุม ${user?.role}` : user?.role}</p>
                </div>
                <i className="fa-solid fa-arrow-right-from-bracket ml-3 text-red-500 cursor-pointer" onClick={logout} title="ออกจากระบบ"></i>

                {showRolePicker && (
                  <div style={{ position:'absolute', top:'100%', right:0, background:'#fff', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,.18)', border:'1px solid #e2e8f0', zIndex:999, minWidth:220, padding:'8px 0', marginTop:8 }}>
                    <div style={{ padding:'8px 16px', fontSize:'.7rem', color:'#94a3b8', fontWeight:700, borderBottom:'1px solid #f1f5f9' }}>👁️ ดูมุมมองแผนกอื่น</div>
                    <div style={{ padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, borderRadius:6, margin:'2px 6px', background: !isViewingAs ? '#eff6ff' : 'transparent' }} onClick={() => { switchBack(); setShowRolePicker(false); }}>
                      <span>👑</span>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'.85rem' }}>{originalUser?.full_name || user?.full_name}</div>
                        <div style={{ fontSize:'.7rem', color:'#64748b' }}>CEO (ตัวจริง)</div>
                      </div>
                    </div>
                    <div style={{ height:1, background:'#f1f5f9', margin:'4px 0' }}></div>
                    {demoRoles.map(dr => (
                      <div key={dr.role} style={{ padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, borderRadius:6, margin:'2px 6px', background: user?.role === dr.role ? '#fef3c7' : 'transparent' }}
                        onClick={() => { switchRole(dr); setShowRolePicker(false); }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = user?.role === dr.role ? '#fef3c7' : 'transparent'}>
                        <span>{dr.icon}</span>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'.85rem' }}>{dr.full_name}</div>
                          <div style={{ fontSize:'.7rem', color:'#64748b' }}>{dr.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
        </div>
    </header>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile
  const [desktopCollapsed, setDesktopCollapsed] = useState(false); // Desktop
  
  const toggleSidebar = () => {
      if (window.innerWidth <= 768) {
          setSidebarOpen(!sidebarOpen);
      } else {
          setDesktopCollapsed(!desktopCollapsed);
      }
  };
  const closeSidebar = () => {
      if (window.innerWidth <= 768) setSidebarOpen(false);
  };
  const { user } = useAuth();

  // Protect all routes with login wall
  if (!user) {
      return <Login />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Sidebar isOpen={sidebarOpen} closeSidebar={closeSidebar} isCollapsed={desktopCollapsed} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
      <main className="main-content">
        <Routes>
          <Route path="/adweb" element={<><Topbar title="Chat" toggleSidebar={toggleSidebar} /><div className="view-container"><AdWeb /></div></>} />
          <Route path="/sales" element={<><Topbar title="Sales & Quotations" toggleSidebar={toggleSidebar} /><div className="view-container"><Sales /></div></>} />
          <Route path="/production" element={<><Topbar title="Production Control" toggleSidebar={toggleSidebar} /><div className="view-container"><Production /></div></>} />
          <Route path="/smart-factory" element={<><Topbar title="🏭 Smart Factory" toggleSidebar={toggleSidebar} /><div className="view-container"><SmartFactory /></div></>} />
          <Route path="/print-flow" element={<><Topbar title="Print Flow Plan" toggleSidebar={toggleSidebar} /><div className="view-container"><PrintFlow /></div></>} />
          <Route path="/accounting" element={<><Topbar title="Finance & Billing" toggleSidebar={toggleSidebar} /><div className="view-container"><Accounting /></div></>} />
          <Route path="/hr" element={<><Topbar title="HR Workforce" toggleSidebar={toggleSidebar} /><div className="view-container"><HR /></div></>} />
          <Route path="/virtual-office" element={<><Topbar title="Virtual Office & Factory Floor" toggleSidebar={toggleSidebar} /><div className="view-container"><VirtualOffice /></div></>} />
          <Route path="/logistics" element={<><Topbar title="Logistics & Transport" toggleSidebar={toggleSidebar} /><div className="view-container"><Logistics /></div></>} />
          <Route path="/settings" element={<><Topbar title="System Settings" toggleSidebar={toggleSidebar} /><div className="view-container"><Settings /></div></>} />
          <Route path="/estimator" element={<><Topbar title="Smart Price Hub" toggleSidebar={toggleSidebar} /><div className="view-container"><Estimator /></div></>} />
          <Route path="/sales-report" element={<><Topbar title="Sales Daily Report" toggleSidebar={toggleSidebar} /><div className="view-container"><SalesReport /></div></>} />
          <Route path="/pipeline" element={<><Topbar title="Sales Pipeline" toggleSidebar={toggleSidebar} /><div className="view-container"><SalesPipeline /></div></>} />
          <Route path="/sales-analysis" element={<><Topbar title="Sales Intelligence" toggleSidebar={toggleSidebar} /><div className="view-container"><SalesAnalysis /></div></>} />
          <Route path="/time-logger" element={<><Topbar title="Time & Task Logger" toggleSidebar={toggleSidebar} /><div className="view-container"><TimeLogger /></div></>} />
          
          {/* Default Route based on Role */}
          <Route path="/" element={
            user.role === 'Driver' ? <><Topbar title="Logistics" toggleSidebar={toggleSidebar} /><div className="view-container"><Logistics /></div></> :
            user.role === 'Operator' ? <><Topbar title="Production Board" toggleSidebar={toggleSidebar} /><div className="view-container"><Production /></div></> :
            user.role === 'Production Manager' ? <><Topbar title="Production Control" toggleSidebar={toggleSidebar} /><div className="view-container"><Production /></div></> :
            user.role === 'Sales' ? <><Topbar title="Chat Center" toggleSidebar={toggleSidebar} /><div className="view-container"><AdWeb /></div></> :
            user.role === 'Pricing' ? <><Topbar title="Smart Price Hub" toggleSidebar={toggleSidebar} /><div className="view-container"><Estimator /></div></> :
            user.role === 'Accountant' ? <><Topbar title="Finance & Billing" toggleSidebar={toggleSidebar} /><div className="view-container"><Accounting /></div></> :
            user.role === 'HR' ? <><Topbar title="HR Workforce" toggleSidebar={toggleSidebar} /><div className="view-container"><HR /></div></> :
            <><Topbar title="Executive Dashboard" toggleSidebar={toggleSidebar} /><div className="view-container"><Dashboard /></div></>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* PUBLIC E-COMMERCE PORTAL */}
          <Route path="/portal" element={<CustomerPortal />} />

          {/* ADMIN ERP LAYOUT */}
          <Route path="*" element={<MainLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
