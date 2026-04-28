import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, Route, Routes, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { QASessionProvider } from '@/lib/QASessionContext';
import Home from '@/pages/Home';
import Reports from '@/pages/Reports';
import AdminSettings from '@/pages/AdminSettings';
import Login from '@/pages/Login';
import { FileCheck, BarChart3, Settings, LogOut, Loader2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Layout with Navigation
function AppLayout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'ตรวจสอบไฟล์', icon: FileCheck },
    { to: '/reports', label: 'รายงาน', icon: BarChart3 },
    ...(isAdmin ? [{ to: '/settings', label: 'ตั้งค่า', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block">BNBINSPECTION</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                <item.icon className="w-4 h-4" />{item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.user_metadata?.full_name || user?.email}
              {isAdmin && <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Admin</span>}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} title="ออกจากระบบ">
              <LogOut className="w-4 h-4" />
            </Button>
            {/* Mobile menu toggle */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t px-4 py-2 space-y-1">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <item.icon className="w-4 h-4" />{item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <QASessionProvider>
        <QueryClientProvider client={queryClientInstance}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AppLayout><AdminSettings /></AppLayout></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </QASessionProvider>
    </AuthProvider>
  );
}

export default App;
