import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  STATUS_COLORS, PRIORITY_COLORS, PROCESS_LABELS, PROCESS_COLORS, formatHours } from
'../components/scheduling/SchedulingUtils';
import { ArrowLeft, Printer, Clock, Calendar, Layers, CheckCircle2, Package, FileText, Hash, AlignLeft, Image, PackagePlus, XCircle, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';
import { Skeleton } from '@/components/ui/skeleton';
import JobImageUpload from '../components/scheduling/JobImageUpload';
import MaterialUsageForm from '../components/inventory/MaterialUsageForm';
import CancelJobDialog from '../components/scheduling/CancelJobDialog';
import EditJobDialog from '../components/scheduling/EditJobDialog';
import JobQRCode from '../components/scheduling/JobQRCode';

const STATUS_STEPS = ['pending', 'prepress', 'printing', 'postpress', 'completed', 'delivered'];
const STATUS_TH = {
  pending: 'รอดำเนินการ',
  prepress: 'Prepress',
  printing: 'กำลังพิมพ์',
  postpress: 'Postpress',
  completed: 'เสร็จแล้ว',
  delivered: 'ส่งมอบแล้ว'
};

export default function JobDetail() {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [jobImages, setJobImages] = useState(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    const unsubs = [
      base44.entities.PrintJob.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['job', jobId] });
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }),
      base44.entities.QueueEntry.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['queue-job', jobId] });
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [queryClient, jobId]);

  const { data: job, isLoading: loadingJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => base44.entities.PrintJob.filter({ id: jobId }).then((r) => r[0]),
    enabled: !!jobId
  });

  const { data: queueEntries = [], isLoading: loadingQueue } = useQuery({
    queryKey: ['queue-job', jobId],
    queryFn: () => base44.entities.QueueEntry.filter({ job_id: jobId }),
    enabled: !!jobId
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list()
  });

  const handleStatusChange = async (newStatus) => {
    await base44.entities.PrintJob.update(jobId, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const handleQueueStatusChange = async (entryId, newStatus) => {
    await base44.entities.QueueEntry.update(entryId, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['queue-job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['queue'] });
  };

  const handleCancelJob = async () => {
    // Delete all queue entries
    for (const entry of queueEntries) {
      await base44.entities.QueueEntry.delete(entry.id);
    }
    // Delete the job
    await base44.entities.PrintJob.delete(jobId);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['queue'] });
    navigate(-1);
  };

  if (!jobId) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>ไม่พบรหัสงาน</p>
        <Link to={createPageUrl('Dashboard')} className="text-blue-500 text-sm mt-2 inline-block">กลับ Dashboard</Link>
      </div>);

  }

  if (loadingJob || loadingQueue) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>);

  }

  if (!job) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>ไม่พบข้อมูลงาน</p>
        <Link to={createPageUrl('Dashboard')} className="text-blue-500 text-sm mt-2 inline-block">กลับ Dashboard</Link>
      </div>);

  }

  const sortedEntries = [...queueEntries].sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
  const totalHours = queueEntries.reduce((sum, e) => sum + (e.estimated_hours || 0), 0);
  const latestEnd = queueEntries.reduce((latest, e) => {
    const end = new Date(e.scheduled_end);
    return end > latest ? end : latest;
  }, new Date(0));
  const hasSchedule = queueEntries.length > 0 && latestEnd.getFullYear() > 2000;

  const printingMachine = machines.find((m) => m.id === job.printing_machine_id);
  const currentStatusIdx = STATUS_STEPS.indexOf(job.status);

  return (
    <div className="bg-yellow-100 mx-auto p-4 md:p-6 max-w-4xl space-y-5">
      {/* Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
            แก้ไขสเป็คงาน
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle className="w-3.5 h-3.5" />
            ยกเลิกคำสั่งงาน
          </Button>
        </div>
      </div>

      <CancelJobDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        jobNumber={job?.job_number || ''}
        onConfirm={handleCancelJob}
      />
      <EditJobDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        job={job}
        machines={machines}
      />

      {/* Header Card */}
      <Card className="border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-gray-800 to-gray-600" />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{job.job_number?.replace(/^JOB-?/i, 'JOG-')}</h1>
                <Badge className={`${STATUS_COLORS[job.status]} text-xs`}>{STATUS_TH[job.status] || job.status}</Badge>
                <Badge className={`${PRIORITY_COLORS[job.priority]} text-xs`}>{job.priority}</Badge>
              </div>
              <p className="text-gray-500 mt-1">{job.product_type}</p>
            </div>
            <div className="shrink-0">
              <p className="text-xs text-gray-400 mb-1">เปลี่ยนสถานะ</p>
              <Select value={job.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_STEPS.map((s) =>
                  <SelectItem key={s} value={s}>{STATUS_TH[s]}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = idx <= currentStatusIdx;
                const isCurrent = idx === currentStatusIdx;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent ? 'bg-gray-900 text-white ring-2 ring-gray-300 ring-offset-1' :
                      isDone ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-400'}`
                      }>
                        {isDone && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className="text-xs text-gray-400 mt-1 hidden sm:block whitespace-nowrap">{STATUS_TH[step]}</span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 &&
                    <div className={`flex-1 h-0.5 mx-1 ${idx < currentStatusIdx ? 'bg-gray-700' : 'bg-gray-100'}`} />
                    }
                  </React.Fragment>);

              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoBlock icon={Hash} label="จำนวนพิมพ์" value={`${job.quantity?.toLocaleString()} ชิ้น`} />
        <InfoBlock icon={Layers} label="จำนวนแผ่น" value={`${job.sheets?.toLocaleString()} แผ่น`} />
        <InfoBlock icon={Printer} label="สี / เพลท" value={`${job.colors || '-'} สี / ${job.plates || '-'} เพลท`} />
        <InfoBlock icon={Package} label="กระดาษ" value={job.paper || '-'} />
        <InfoBlock icon={Printer} label="เครื่องพิมพ์" value={printingMachine?.name || '-'} />
        <InfoBlock icon={Clock} label="Leadtime รวม" value={totalHours > 0 ? formatHours(totalHours) : '-'} />
        <InfoBlock icon={Calendar} label="วันกำหนดส่ง" value={job.due_date ? moment(job.due_date).format('DD MMM YYYY') : '-'} />
        <InfoBlock icon={CheckCircle2} label="วันส่งมอบ (คาด)" value={hasSchedule ? moment(latestEnd).add(1, 'day').format('DD MMM YYYY') : '-'} />
      </div>

      {/* Images */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Image className="w-4 h-4 text-gray-400" />
            รูปภาพงาน
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <JobImageUpload
            jobId={jobId}
            images={jobImages ?? (job.images || [])}
            onUpdate={setJobImages} />
          
        </CardContent>
      </Card>

      {/* Notes */}
      {job.notes &&
      <Card className="border-gray-100">
          <CardContent className="p-4 flex gap-3">
            <AlignLeft className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-600">{job.notes}</p>
          </CardContent>
        </Card>
      }

      {/* Material Usage */}
      {showMaterialForm && job && (
        <MaterialUsageForm job={job} onClose={() => setShowMaterialForm(false)} />
      )}

      {/* QR Code */}
      <JobQRCode job={job} />

      {/* Production Queue */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              ขั้นตอนการผลิต
              <Badge variant="secondary" className="text-xs ml-1">{sortedEntries.length} ขั้นตอน</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowMaterialForm(true)}>
              <PackagePlus className="w-3.5 h-3.5" /> บันทึกวัตถุดิบ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedEntries.length === 0 ?
          <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีคิว</div> :

          <div className="divide-y divide-gray-50">
              {sortedEntries.map((entry, idx) => {
              const colors = PROCESS_COLORS[entry.process_type] || PROCESS_COLORS.printing;
              return (
                <div key={entry.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white ${colors.bg} shrink-0`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{PROCESS_LABELS[entry.process_type]}</span>
                        <span className="text-xs text-gray-400">{entry.machine_name}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.sheets?.toLocaleString()} แผ่น •{' '}
                        {moment(entry.scheduled_start).format('DD/MM HH:mm')} → {moment(entry.scheduled_end).format('DD/MM HH:mm')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-700">{formatHours(entry.estimated_hours)}</p>
                    </div>
                    <div className="shrink-0">
                      <Select value={entry.status} onValueChange={(v) => handleQueueStatusChange(entry.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="queued">รอคิว</SelectItem>
                          <SelectItem value="in_progress">กำลังผลิต</SelectItem>
                          <SelectItem value="completed">เสร็จแล้ว</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>);

            })}
            </div>
          }
        </CardContent>
      </Card>
    </div>);

}

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>);

}