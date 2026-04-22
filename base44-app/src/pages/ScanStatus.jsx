import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Loader2, AlertTriangle, ShieldAlert, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const STATUS_TH = {
  pending: 'รอดำเนินการ',
  prepress: 'Prepress',
  printing: 'กำลังพิมพ์',
  postpress: 'Postpress',
  completed: 'เสร็จแล้ว',
  delivered: 'ส่งมอบแล้ว'
};

const STATUS_COLORS = {
  prepress: '#8B5CF6',
  printing: '#3B82F6',
  postpress: '#F59E0B',
  completed: '#10B981',
  delivered: '#6B7280',
};

export default function ScanStatus() {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get('job');
  const targetStatus = params.get('status');

  const [state, setState] = useState('loading'); // loading, no_access, ready, updating, success, error
  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [department, setDepartment] = useState(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Check auth
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    const me = await base44.auth.me();
    setUser(me);

    // Fetch job
    if (!jobId || !targetStatus) {
      setState('error');
      setErrorMsg('QR Code ไม่ถูกต้อง');
      return;
    }

    const jobs = await base44.entities.PrintJob.filter({ id: jobId });
    if (!jobs || jobs.length === 0) {
      setState('error');
      setErrorMsg('ไม่พบงานนี้ในระบบ');
      return;
    }
    setJob(jobs[0]);

    // Admin can do everything
    if (me.role === 'admin') {
      setState('ready');
      return;
    }

    // Check department access
    if (!me.department_id) {
      setState('no_access');
      setErrorMsg('คุณยังไม่ได้กำหนดแผนก กรุณาติดต่อ Admin');
      return;
    }

    const depts = await base44.entities.Department.filter({ id: me.department_id });
    if (depts.length === 0) {
      setState('no_access');
      setErrorMsg('ไม่พบข้อมูลแผนกของคุณ');
      return;
    }
    setDepartment(depts[0]);

    const allowed = depts[0].mapped_statuses || [];
    if (!allowed.includes(targetStatus)) {
      setState('no_access');
      setErrorMsg(`แผนก "${depts[0].name}" ไม่มีสิทธิ์อัพเดทสถานะ "${STATUS_TH[targetStatus] || targetStatus}"`);
      return;
    }

    setState('ready');
  };

  const handleUpdate = async () => {
    setState('updating');
    await base44.entities.PrintJob.update(jobId, { status: targetStatus });
    setState('success');
  };

  const color = STATUS_COLORS[targetStatus] || '#6B7280';

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">กำลังตรวจสอบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-gray-200 shadow-lg">
        <CardContent className="p-6 text-center space-y-4">
          {/* Header */}
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
            <QrCode className="w-7 h-7" style={{ color }} />
          </div>

          {state === 'error' && (
            <>
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="font-semibold text-red-700">{errorMsg}</p>
            </>
          )}

          {state === 'no_access' && (
            <>
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="font-semibold text-amber-700">{errorMsg}</p>
              <p className="text-xs text-gray-400">ล็อกอินเป็น: {user?.full_name || user?.email}</p>
            </>
          )}

          {state === 'ready' && (
            <>
              <div>
                <p className="text-lg font-bold text-gray-900">{job?.job_number}</p>
                <p className="text-sm text-gray-500">{job?.product_type}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: color + '15' }}>
                <p className="text-xs text-gray-500">เปลี่ยนสถานะเป็น</p>
                <p className="text-xl font-bold mt-1" style={{ color }}>{STATUS_TH[targetStatus] || targetStatus}</p>
              </div>
              <p className="text-xs text-gray-400">
                สถานะปัจจุบัน: <span className="font-medium text-gray-600">{STATUS_TH[job?.status] || job?.status}</span>
              </p>
              <Button
                onClick={handleUpdate}
                className="w-full h-12 text-base font-bold"
                style={{ backgroundColor: color }}
              >
                ยืนยันอัพเดทสถานะ
              </Button>
              <p className="text-xs text-gray-400">โดย: {user?.full_name || user?.email}</p>
            </>
          )}

          {state === 'updating' && (
            <>
              <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color }} />
              <p className="text-sm text-gray-500">กำลังอัพเดท...</p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color }} />
              <p className="text-lg font-bold text-gray-900">อัพเดทสำเร็จ!</p>
              <p className="text-sm text-gray-500">
                <span className="font-semibold">{job?.job_number}</span> → {STATUS_TH[targetStatus]}
              </p>
              <p className="text-xs text-gray-400">โดย: {user?.full_name || user?.email}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}