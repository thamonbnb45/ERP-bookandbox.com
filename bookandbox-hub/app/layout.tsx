import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: "BookAndBox Hub",
  description: "ERP Dashboard for BookAndBox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={cn("font-sans", sarabun.variable)}>
      <body className={sarabun.className}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
          {/* Global Top Navbar */}
          <header style={{
            background: 'white',
            padding: '1rem 2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem' }}>
                  <i className="fa-solid fa-cube"></i>
                </div>
                Bookandbox Hub
              </div>
            </div>
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <a href="/production" style={{ padding: '0.5rem 1rem', borderRadius: '8px', color: '#475569', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }} 
                 className="nav-link hover:bg-slate-100 hover:text-blue-600">
                <i className="fa-solid fa-industry mr-2"></i> ระบบผลิต (Production)
              </a>
              <a href="/hr" style={{ padding: '0.5rem 1rem', borderRadius: '8px', color: '#475569', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}
                 className="nav-link hover:bg-slate-100 hover:text-blue-600">
                <i className="fa-solid fa-users-gear mr-2"></i> ระบบบุคคล (HR & Workload)
              </a>
            </nav>
          </header>
          
          <main style={{ flex: 1, padding: '2rem' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
