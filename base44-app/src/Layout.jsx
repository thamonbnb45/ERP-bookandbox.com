import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, PlusCircle, ListOrdered, Settings,
  Printer, Menu, X, Kanban, Package, Layers, Shield,
  ChevronRight, QrCode, Users, LogOut, Building2, Camera
} from 'lucide-react';

const ICON_MAP = {
  LayoutDashboard, PlusCircle, ListOrdered, Settings,
  Printer, Kanban, Package, Layers, Shield, QrCode, Users, Building2, Camera,
};

// Fallback if no MenuConfig exists yet
const FALLBACK_NAV = [
  { page_name: 'Dashboard',          label: 'Dashboard',          icon_name: 'LayoutDashboard', sort_order: 0 },
  { page_name: 'ProductionDashboard',label: 'Production Board',   icon_name: 'Kanban',          sort_order: 1 },
  { page_name: 'CreateJob',          label: 'สร้างงาน',           icon_name: 'PlusCircle',      sort_order: 2 },
  { page_name: 'MachineQueue',       label: 'คิวเครื่อง',         icon_name: 'ListOrdered',     sort_order: 3 },
  { page_name: 'MachineSettings',    label: 'ตั้งค่าเครื่อง',    icon_name: 'Settings',        sort_order: 4 },
  { page_name: 'Inventory',          label: 'วัตถุดิบ & ต้นทุน', icon_name: 'Package',         sort_order: 5 },
  { page_name: 'CombineLayout',      label: 'งานเลย์รวม',        icon_name: 'Layers',          sort_order: 6 },
  { page_name: 'CameraScanQR',       label: 'สแกน QR (กล้อง)',    icon_name: 'Camera',          sort_order: 7 },
  { page_name: 'DeptScanQR',         label: 'QR Code แผนก',       icon_name: 'QrCode',          sort_order: 8 },
  { page_name: 'AdminSettings',      label: 'ตั้งค่าระบบ',       icon_name: 'Shield',          sort_order: 9 },
];

// Map page_name to route path
const PAGE_ROUTES = {
  Dashboard: '/',
  ProductionDashboard: '/ProductionDashboard',
  CreateJob: '/CreateJob',
  MachineQueue: '/MachineQueue',
  MachineSettings: '/MachineSettings',
  Inventory: '/Inventory',
  CombineLayout: '/CombineLayout',
  CameraScanQR: '/CameraScanQR',
  DeptScanQR: '/DeptScanQR',
  AdminSettings: '/AdminSettings',
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: menuConfigs = [] } = useQuery({
    queryKey: ['menu-configs'],
    queryFn: () => base44.entities.MenuConfig.list('sort_order'),
  });

  const userRole = user?.role || 'user';

  // Build visible nav items
  const navSource = menuConfigs.length > 0 ? menuConfigs : FALLBACK_NAV;
  const visibleNav = navSource
    .filter(item => {
      if (item.is_visible === false) return false;
      // Check role access
      const roles = item.allowed_roles || ['admin', 'user'];
      return roles.includes(userRole);
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Top bar (mobile) ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-blue-100 z-40 flex items-center px-4 gap-3 shadow-sm">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow">
            <Printer className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm text-blue-800 tracking-tight">PrintFlow</span>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-200 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #0f3460 0%, #1a5276 60%, #1a73e8 100%)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-white tracking-tight leading-none">PrintFlow</h1>
              <p className="text-xs text-blue-200 mt-0.5">Production Planning</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => {
            const isActive = currentPageName === item.page_name;
            const Icon = ICON_MAP[item.icon_name] || Settings;
            const route = PAGE_ROUTES[item.page_name] || `/${item.page_name}`;
            return (
              <Link
                key={item.page_name}
                to={route}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-md font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-300 group-hover:text-white'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          {user && (
            <div className="px-2">
              <p className="text-xs text-white font-medium truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-blue-300/70 truncate">{user.department_name || 'ยังไม่เลือกแผนก'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs text-blue-200 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Top header bar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-blue-700">PrintFlow</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium">
              {visibleNav.find(n => n.page_name === currentPageName)?.label || currentPageName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-gray-400">{user.full_name} ({user.department_name || userRole})</span>
            )}
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-400">ออนไลน์</span>
          </div>
        </div>

        <div className="p-0">
          {children}
        </div>
      </main>
    </div>
  );
}