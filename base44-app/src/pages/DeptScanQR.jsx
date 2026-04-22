import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Loader2, ShieldAlert, Building2, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_TH = {
  pending: 'รอดำเนินการ',
  prepress: 'Prepress',
  printing: 'กำลังพิมพ์',
  postpress: 'Postpress',
  completed: 'เสร็จแล้ว',
  delivered: 'ส่งมอบแล้ว',
};

const STATUS_COLORS = {
  pending: '#6B7280',
  prepress: '#8B5CF6',
  printing: '#3B82F6',
  postpress: '#F59E0B',
  completed: '#10B981',
  delivered: '#6B7280',
};

export default function DeptScanQR() {
  const [user, setUser] = useState(null);
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me();
      setUser(me);
      if (me?.department_id) {
        const depts = await base44.entities.Department.filter({ id: me.department_id });
        if (depts.length > 0) setDepartment(depts[0]);
      }
      setLoading(false);
    };
    init();
  }, []);

  const allowedStatuses = department?.mapped_statuses || [];

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs-active'],
    queryFn: () => base44.entities.PrintJob.filter({ status: ['pending', 'prepress', 'printing', 'postpress'] }),
    enabled: !loading,
  });

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.PrintJob.subscribe(() => {
      // refetch handled by react-query
    });
    return unsub;
  }, []);

  if (loading || loadingJobs) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Admin sees all statuses
  const isAdmin = user?.role === 'admin';
  const visibleStatuses = isAdmin
    ? Object.keys(STATUS_TH)
    : allowedStatuses;

  if (!isAdmin && visibleStatuses.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-lg font-bold text-gray-900">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-sm text-gray-500 mt-1">
          {department ? `แผนก "${department.name}" ยังไม่มีสถานะที่กำหนด` : 'คุณยังไม่ได้เลือกแผนก'}
        </p>
      </div>
    );
  }

  const baseUrl = window.location.origin;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <QrCode className="w-6 h-6" /> สแกน QR อัพเดทงาน
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {department ? (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                แผนก: <span className="font-semibold text-gray-600">{department.name}</span>
                {isAdmin && <Badge className="text-xs bg-red-100 text-red-700 ml-1">Admin</Badge>}
              </span>
            ) : isAdmin ? (
              <span className="flex items-center gap-1.5">
                <Badge className="text-xs bg-red-100 text-red-700">Admin</Badge> เห็นทุกสถานะ
              </span>
            ) : 'ยังไม่ได้กำหนดแผนก'}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>{user?.full_name || user?.email}</p>
          <p>{jobs.length} งานที่ใช้งานอยู่</p>
        </div>
      </div>

      {/* Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <QrCode className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>วิธีใช้:</strong> พิมพ์ QR Code แล้ววางไว้ที่สถานีงาน พนักงานสแกนเพื่ออัพเดทสถานะงานอัตโนมัติ
          {!isAdmin && <><br />คุณจะเห็นเฉพาะ QR Code ของสถานะที่แผนกของคุณรับผิดชอบเท่านั้น</>}
        </div>
      </div>

      {/* Job List with QR Codes */}
      {jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Printer className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>ไม่มีงานที่กำลังดำเนินการ</p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map(job => (
            <JobQRSection key={job.id} job={job} visibleStatuses={visibleStatuses} baseUrl={baseUrl} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobQRSection({ job, visibleStatuses, baseUrl }) {
  const printRef = React.useRef();

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const content = printRef.current?.innerHTML || '';
    win.document.write(`
      <html><head><title>QR - ${job.job_number}</title>
      <style>
        body { font-family: sans-serif; background: #fff; padding: 24px; }
        h2 { font-size: 16px; margin-bottom: 8px; }
        .grid { display: flex; flex-wrap: wrap; gap: 12px; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; text-align: center; width: 130px; }
        p { margin: 4px 0; font-size: 11px; }
      </style></head>
      <body><h2>${job.job_number} - ${job.product_type || ''}</h2>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{job.job_number}</p>
          <p className="text-xs text-gray-400">{job.product_type} • สถานะ: {STATUS_TH[job.status] || job.status}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> พิมพ์ QR
        </button>
      </div>

      <div ref={printRef} className="p-4">
        <div className="flex flex-wrap gap-3">
          {visibleStatuses.map(status => {
            const color = STATUS_COLORS[status] || '#6B7280';
            const qrValue = `${baseUrl}/ScanStatus?job=${job.id}&status=${status}`;
            return (
              <div key={status} className="flex flex-col items-center bg-gray-50 rounded-xl border border-gray-100 p-3 gap-2 w-28">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <QRCodeSVG value={qrValue} size={80} fgColor={color} bgColor="#ffffff" level="M" />
                <p className="text-[10px] font-bold text-gray-700">{STATUS_TH[status]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}