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
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

function Sidebar({ isOpen, closeSidebar }) {
  const location = useLocation();
  const { user, canAccess } = useAuth();
  
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header flex justify-between align-center" style={{ width: '100%' }}>
          <div className="logo">Book<span style={{color: '#5b92e5'}}>and</span>box</div>
          <i className="fa-solid fa-xmark menu-toggle mobile-close-btn" onClick={closeSidebar} style={{ cursor: 'pointer' }}></i>
      </div>
      <nav className="nav-links">
          {canAccess('dashboard_module', ['CEO', 'Sales']) && (
              <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={closeSidebar}>
                 <i className="fa-solid fa-chart-pie"></i> Executive Dashboard
              </Link>
          )}

          {canAccess('sales_module', ['CEO', 'Sales', 'Accountant']) && (
              <Link to="/sales" className={`nav-item ${location.pathname === '/sales' ? 'active' : ''}`} onClick={closeSidebar}>
                  <i className="fa-solid fa-cart-shopping"></i> Sales & Quotations
              </Link>
          )}

          <Link to="/adweb" className={`nav-item ${location.pathname === '/adweb' ? 'active' : ''}`} onClick={closeSidebar}>
             <i className="fa-brands fa-line"></i> Omni-Channel Chat
          </Link>

          {canAccess('pricing_module', ['CEO', 'Sales', 'Accountant']) && (
              <Link to="/estimator" className={`nav-item ${location.pathname === '/estimator' ? 'active' : ''}`} onClick={closeSidebar}>
                  <i className="fa-solid fa-coins"></i> ศูนย์ราคา
              </Link>
          )}

          {canAccess('production_module', ['CEO', 'Production Manager', 'Operator']) && (
              <Link to="/production" className={`nav-item ${location.pathname === '/production' ? 'active' : ''}`} onClick={closeSidebar}>
                  <i className="fa-solid fa-industry"></i> Production Control
              </Link>
          )}

          {canAccess('finance_module', ['CEO', 'Accountant']) && (
              <Link to="/accounting" className={`nav-item ${location.pathname === '/accounting' ? 'active' : ''}`} onClick={closeSidebar}>
                  <i className="fa-solid fa-file-invoice-dollar"></i> Finance & Billing
              </Link>
          )}

          {canAccess('hr_module', ['CEO', 'Production Manager', 'Sales']) && (
              <Link to="/hr" className={`nav-item ${location.pathname === '/hr' ? 'active' : ''}`} onClick={closeSidebar}>
                  <i className="fa-solid fa-users-gear"></i> HR Workforce
              </Link>
          )}

          <Link to="/logistics" className={`nav-item ${location.pathname === '/logistics' ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="fa-solid fa-truck-fast"></i> ขนส่ง Logistics
          </Link>

          {user?.role === 'CEO' && (
              <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={closeSidebar} style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0' }}>
                  <i className="fa-solid fa-gear"></i> ตั้งค่าระบบ & จัดการสิทธิ์
              </Link>
          )}
      </nav>
    </aside>
  );
}

function Topbar({ title, toggleSidebar }) {
  const { user, logout } = useAuth();
  
  return (
    <header className="topbar">
        <div className="flex align-center gap-4">
            <i className="fa-solid fa-bars menu-toggle" onClick={toggleSidebar}></i>
            <h2 className="text-primary" style={{ fontSize: '1.2rem', margin: 0 }}>{title}</h2>
        </div>
        <div className="topbar-right">
            <div className="profile-wrap">
                <div className="avatar" style={{ background: user?.role === 'CEO' ? '#e11d48' : 'var(--primary)' }}>{user?.full_name?.charAt(0) || 'U'}</div>
                <div className="desktop-only text-right">
                    <p style={{fontSize: '0.9rem', fontWeight: 500, margin:0}}>{user?.full_name || 'ไม่ระบุตัวตน'}</p>
                    <p style={{fontSize: '0.8rem', margin:0, color: '#64748b'}}>{user?.role}</p>
                </div>
                <i className="fa-solid fa-arrow-right-from-bracket ml-3 text-red-500 cursor-pointer" onClick={logout} title="ออกจากระบบ"></i>
            </div>
        </div>
    </header>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);
  const { user } = useAuth();

  // Protect all routes with login wall
  if (!user) {
      return <Login />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Sidebar isOpen={sidebarOpen} closeSidebar={closeSidebar} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
      <main className="main-content">
        <Routes>
          <Route path="/adweb" element={<><Topbar title="Omni-Channel Chat" toggleSidebar={toggleSidebar} /><div className="view-container"><AdWeb /></div></>} />
          <Route path="/sales" element={<><Topbar title="Sales & Quotations" toggleSidebar={toggleSidebar} /><div className="view-container"><Sales /></div></>} />
          <Route path="/production" element={<><Topbar title="Production Control" toggleSidebar={toggleSidebar} /><div className="view-container"><Production /></div></>} />
          <Route path="/accounting" element={<><Topbar title="Finance & Billing" toggleSidebar={toggleSidebar} /><div className="view-container"><Accounting /></div></>} />
          <Route path="/hr" element={<><Topbar title="HR Workforce" toggleSidebar={toggleSidebar} /><div className="view-container"><HR /></div></>} />
          <Route path="/logistics" element={<><Topbar title="Logistics & Transport" toggleSidebar={toggleSidebar} /><div className="view-container"><Logistics /></div></>} />
          <Route path="/settings" element={<><Topbar title="System Settings" toggleSidebar={toggleSidebar} /><div className="view-container"><Settings /></div></>} />
          <Route path="/estimator" element={<><Topbar title="Smart Price Hub" toggleSidebar={toggleSidebar} /><div className="view-container"><Estimator /></div></>} />
          
          {/* Default Route based on Role */}
          <Route path="/" element={
            user.role === 'Driver' ? <><Topbar title="Logistics" toggleSidebar={toggleSidebar} /><div className="view-container"><Logistics /></div></> :
            user.role === 'Operator' ? <><Topbar title="Production Board" toggleSidebar={toggleSidebar} /><div className="view-container"><Production /></div></> :
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
