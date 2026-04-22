import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download } from 'lucide-react';

const STATUS_STEPS = [
  { status: 'prepress',   label: 'พรีเพรส',    color: '#8B5CF6' },
  { status: 'printing',   label: 'พิมพ์',       color: '#3B82F6' },
  { status: 'postpress',  label: 'โพสต์เพรส',  color: '#F59E0B' },
  { status: 'completed',  label: 'เสร็จสิ้น',  color: '#10B981' },
  { status: 'delivered',  label: 'ส่งมอบ',      color: '#6B7280' },
];

function QRCard({ job, status, label, color }) {
  const baseUrl = window.location.origin;
  const qrValue = `${baseUrl}/ScanStatus?job=${job.id}&status=${status}`;

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl border border-gray-100 shadow-sm p-4 gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <QRCodeSVG
        value={qrValue}
        size={110}
        fgColor={color}
        bgColor="#ffffff"
        level="M"
      />
      <div className="text-center">
        <p className="text-xs font-bold text-gray-800 mt-1">{label}</p>
        <p className="text-[10px] text-gray-400">{job.job_number}</p>
      </div>
    </div>
  );
}

export default function JobQRCode({ job }) {
  const printRef = useRef();

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const content = printRef.current?.innerHTML || '';
    win.document.write(`
      <html><head><title>QR Code - ${job.job_number}</title>
      <style>
        body { font-family: sans-serif; background: #fff; }
        .grid { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; padding: 24px; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; width: 140px; }
        p { margin: 4px 0; font-size: 11px; color: #374151; font-weight: bold; }
        span { font-size: 10px; color: #9ca3af; }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">QR Code อัพเดทสถานะ</h3>
          <p className="text-xs text-gray-400 mt-0.5">พนักงานสแกนเพื่ออัพเดทสถานะงาน {job.job_number}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> พิมพ์ QR
        </button>
      </div>

      <div ref={printRef} className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {STATUS_STEPS.map(step => (
            <QRCard key={step.status} job={job} {...step} />
          ))}
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          แต่ละ QR Code แทนสถานะงาน — สแกนด้วยแอปสแกนเนอร์เพื่ออัพเดทในระบบ
        </p>
      </div>
    </div>
  );
}