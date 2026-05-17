"use client";
import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ["thai", "latin"],
  variable: '--font-sans'
});

// Module definitions with sub-pages
const modules = [
  {
    id: 'tasks',
    label: 'ติดตามงาน',
    icon: '📋',
    color: '#dc2626',
    children: [
      { label: 'Task Tracker', href: '/tasks', icon: '📋' },
    ]
  },
  {
    id: 'sales',
    label: 'ขาย / CRM',
    icon: '💰',
    color: '#2EC4B6',
    children: [
      { label: 'ใบสั่งงาน (JO)', href: '/jobs', icon: '📋' },
      { label: 'Sales Pipeline', href: '/sales/pipeline', icon: '📊' },
      { label: 'CRM / LINE Chat', href: '/chat', icon: '💬' },
      { label: 'คิดราคา (Estimate)', href: '/sales/estimate', icon: '🧮' },
      { label: 'เสนอราคา', href: '/sales', icon: '📄' },
      { label: 'รายงานขาย', href: '/sales/report', icon: '📈' },
      { label: 'Sales Intelligence', href: '/sales/analysis', icon: '🔍' },
    ]
  },
  {
    id: 'production',
    label: 'Production',
    icon: '🏭',
    color: '#3b82f6',
    children: [
      { label: 'ภาพรวมผลิต', href: '/production', icon: '📊' },
      { label: 'ติดตาม Live', href: '/production/live-tracking', icon: '🔴' },
      { label: 'ปริมาณงาน', href: '/production/workload', icon: '⚖️' },
      { label: 'กำลังผลิต (Capacity)', href: '/production/capacity', icon: '🏭' },
      { label: 'บันทึกผลิต', href: '/factory/log', icon: '📝' },
    ]
  },
  {
    id: 'logistics',
    label: 'Logistics',
    icon: '🚚',
    color: '#22c55e',
    children: [
      { label: 'จัดส่ง / Fleet', href: '/logistics', icon: '🚚' },
    ]
  },
  {
    id: 'stock',
    label: 'Stock / คลัง',
    icon: '📦',
    color: '#f97316',
    children: [
      { label: 'คลังวัตถุดิบ', href: '/stock', icon: '🗃️' },
    ]
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: '📒',
    color: '#FEBA02',
    children: [
      { label: 'บัญชีการเงิน', href: '/accounting', icon: '💳' },
    ]
  },
  {
    id: 'hr',
    label: 'HR',
    icon: '👥',
    color: '#8b5cf6',
    children: [
      { label: 'HR Dashboard', href: '/hr', icon: '📊' },
      { label: 'ภาพรวมบุคคล', href: '/people/manpower', icon: '👤' },
      { label: 'ทักษะพนักงาน', href: '/people/skills', icon: '🎯' },
      { label: 'แผนผังองค์กร', href: '/people/org-chart', icon: '🏢' },
    ]
  },
  {
    id: 'kpi',
    label: 'KPI',
    icon: '📊',
    color: '#22c55e',
    children: [
      { label: 'Strategy Cockpit', href: '/', icon: '🎯' },
      { label: 'AI Assistant', href: '/factory/ai', icon: '🤖' },
      { label: 'Knowledge Base', href: '/factory/knowledge', icon: '📚' },
    ]
  },
  {
    id: 'web',
    label: 'หน้าเว็บขาย',
    icon: '🌐',
    color: '#06b6d4',
    children: [
      { label: 'bookandbox.com', href: 'https://www.bookandbox.com', icon: '🔗', external: true },
    ]
  },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [openModules, setOpenModules] = useState<string[]>(['sales']);
  const currentPath = usePathname();

  useEffect(() => {
    // Auto-expand module containing current path
    const activeModule = modules.find(m => m.children.some(c =>
      c.href === '/' ? currentPath === '/' : currentPath.startsWith(c.href)
    ));
    if (activeModule) setOpenModules(prev => prev.includes(activeModule.id) ? prev : [...prev, activeModule.id]);
  }, [currentPath]);

  const toggleModule = (id: string) => {
    setOpenModules(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <aside style={{
      width: collapsed ? '60px' : '240px',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0B1320 0%, #0f1d32 50%, #0B1320 100%)',
      color: 'white',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '1rem 0.5rem' : '1.25rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: '36px', height: '36px', minWidth: '36px',
          background: 'linear-gradient(135deg, #2EC4B6, #0B1320)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontWeight: 800, color: 'white',
          boxShadow: '0 2px 12px rgba(46,196,182,0.3)',
        }}>B</div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>BookAndBox</div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ERP System</div>
          </div>
        )}
      </div>

      {/* Modules */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
        {modules.map(mod => {
          const isOpen = openModules.includes(mod.id);
          const isActive = mod.children.some(c =>
            c.href === '/' ? currentPath === '/' : currentPath.startsWith(c.href)
          );

          return (
            <div key={mod.id} style={{ marginBottom: '2px' }}>
              {/* Module Header */}
              <button
                onClick={() => !collapsed && toggleModule(mod.id)}
                style={{
                  width: '100%',
                  padding: collapsed ? '0.6rem' : '0.55rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: isActive ? 'rgba(46,196,182,0.1)' : 'transparent',
                  border: 'none',
                  color: isActive ? '#2EC4B6' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderLeft: isActive ? '3px solid #2EC4B6' : '3px solid transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
                title={mod.label}
              >
                <span style={{ fontSize: '1.1rem', minWidth: '24px', textAlign: 'center' }}>{mod.icon}</span>
                {!collapsed && (
                  <>
                    <span style={{ flex: 1, textAlign: 'left' }}>{mod.label}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      transition: 'transform 0.2s',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                      opacity: 0.4,
                    }}>▶</span>
                  </>
                )}
              </button>

              {/* Sub-items */}
              {!collapsed && isOpen && (
                <div style={{
                  overflow: 'hidden',
                  animation: 'slideDown 0.2s ease-out',
                }}>
                  {mod.children.map(child => {
                    const isChildActive = child.href === '/' ? currentPath === '/' : currentPath.startsWith(child.href);
                    const isExternal = (child as any).external;
                    const Tag = isExternal ? 'a' : Link;
                    const extraProps = isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {};

                    return (
                      <Tag
                        key={child.href}
                        href={child.href}
                        {...extraProps}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 1rem 0.4rem 2.75rem',
                          color: isChildActive ? '#2EC4B6' : 'rgba(255,255,255,0.5)',
                          textDecoration: 'none',
                          fontSize: '0.8rem',
                          fontWeight: isChildActive ? 600 : 400,
                          transition: 'all 0.15s',
                          background: isChildActive ? 'rgba(46,196,182,0.08)' : 'transparent',
                          borderRadius: '0 8px 8px 0',
                          marginRight: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem' }}>{child.icon}</span>
                        <span>{child.label}</span>
                        {isExternal && <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>↗</span>}
                      </Tag>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collapse Button */}
      <button
        onClick={onToggle}
        style={{
          padding: '0.75rem',
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'transparent',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
      >
        {collapsed ? '▶' : '◀'}
      </button>
    </aside>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <html lang="th" className={cn("font-sans", prompt.variable)}>
      <body className={prompt.className} style={{ margin: 0 }}>
        <style>{`
          @keyframes slideDown {
            from { max-height: 0; opacity: 0; }
            to { max-height: 300px; opacity: 1; }
          }
          aside::-webkit-scrollbar { width: 4px; }
          aside::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
          aside button:hover { color: #2EC4B6 !important; background: rgba(46,196,182,0.06) !important; }
          aside a:hover { color: #2EC4B6 !important; background: rgba(46,196,182,0.06) !important; }
          @media (max-width: 768px) {
            aside { width: 60px !important; }
            aside span:not([style*="minWidth"]) { display: none; }
          }
        `}</style>

        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

          <div style={{
            flex: 1,
            marginLeft: collapsed ? '60px' : '240px',
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: '#f0f4f8',
            minHeight: '100vh',
          }}>
            {/* Top bar */}
            <header style={{
              height: '52px',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 1.5rem',
              position: 'sticky',
              top: 0,
              zIndex: 100,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(46,196,182,0.1), rgba(46,196,182,0.05))',
                  fontSize: '0.75rem',
                  color: '#0B1320',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  Online
                </div>
                <div style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2EC4B6, #0B1320)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  BnB
                </div>
              </div>
            </header>

            <main style={{ padding: '1.5rem' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
