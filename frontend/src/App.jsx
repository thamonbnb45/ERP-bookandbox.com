import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Sales from './pages/Sales';
import AdWeb from './pages/AdWeb';
import Production from './pages/Production';
import Accounting from './pages/Accounting';
import CustomerPortal from './pages/CustomerPortal';
import Dashboard from './pages/Dashboard';
import './index.css';

function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="sidebar open">
      <div className="sidebar-header">
          <div className="logo">Book<span style={{color: '#5b92e5'}}>and</span>box</div>
      </div>
      <nav className="nav-links">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
             <i className="fa-solid fa-chart-pie"></i> ภาพรวม (CEO)
          </Link>
          <Link to="/adweb" className={`nav-item ${location.pathname === '/adweb' ? 'active' : ''}`}>
             <i className="fa-brands fa-line"></i> แชท (Chat)
          </Link>
          <Link to="/sales" className={`nav-item ${location.pathname === '/sales' ? 'active' : ''}`}>
              <i className="fa-solid fa-cart-shopping"></i> เสนอราคา/ขาย
          </Link>
          <Link to="/production" className={`nav-item ${location.pathname === '/production' ? 'active' : ''}`}>
              <i className="fa-solid fa-industry"></i> ฝ่ายผลิต
          </Link>
          <Link to="/accounting" className={`nav-item ${location.pathname === '/accounting' ? 'active' : ''}`}>
              <i className="fa-solid fa-file-invoice-dollar"></i> บัญชีและเบิกจ่าย
          </Link>
      </nav>
    </aside>
  );
}

function Topbar({ title }) {
  return (
    <header className="topbar">
        <div className="flex align-center gap-4">
            <h2 className="text-primary">{title}</h2>
        </div>
        <div className="topbar-right">
            <div className="profile-wrap">
                <div className="avatar">N</div>
                <div className="desktop-only">
                    <p style={{fontSize: '0.9rem', fontWeight: 500, margin:0}}>คุณณัฐวุฒิ</p>
                    <p style={{fontSize: '0.8rem', margin:0}}>ฝ่ายขาย</p>
                </div>
            </div>
        </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC E-COMMERCE PORTAL */}
        <Route path="/portal" element={<CustomerPortal />} />

        {/* ADMIN ERP LAYOUT */}
        <Route path="*" element={
          <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/adweb" element={<><Topbar title="แชท (Chat)" /><div className="view-container"><AdWeb /></div></>} />
                <Route path="/sales" element={<><Topbar title="เสนอราคา/ขาย" /><div className="view-container"><Sales /></div></>} />
                <Route path="/production" element={<><Topbar title="ฝ่ายผลิต" /><div className="view-container"><Production /></div></>} />
                <Route path="/accounting" element={<><Topbar title="บัญชีและเบิกจ่าย" /><div className="view-container"><Accounting /></div></>} />
                <Route path="/" element={<><Topbar title="ภาพรวม (Dashboard)" /><Dashboard /></>} />
              </Routes>
            </main>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
