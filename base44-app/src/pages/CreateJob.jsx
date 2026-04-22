import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobForm from '../components/scheduling/JobForm';
import { calculateProductionHours, calculateSchedule, PROCESS_ORDER, PROCESS_LABELS, formatHours } from '../components/scheduling/SchedulingUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, Plus, Image, Upload, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import JobQRCode from '../components/scheduling/JobQRCode';

export default function CreateJob() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [jobImages, setJobImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
  });

  const { data: queueEntries = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: () => base44.entities.QueueEntry.list('-created_date', 200),
  });

  const handleImageAdd = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImage(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPendingImages(prev => [...prev, file_url]);
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleImageRemove = (url) => {
    setPendingImages(prev => prev.filter(u => u !== url));
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setResult(null);

    // 1. Create the job (with pre-uploaded images)
    const job = await base44.entities.PrintJob.create({ ...formData, images: pendingImages });

    // 2. Build queue entries for each process
    const allProcesses = ['printing', ...(formData.postpress_steps || [])];
    const orderedProcesses = PROCESS_ORDER.filter(p => allProcesses.includes(p));

    const queueResults = [];
    let previousEnd = null;

    for (const process of orderedProcesses) {
      // Find the right machine
      let machine;
      if (process === 'printing') {
        machine = machines.find(m => m.id === formData.printing_machine_id);
      } else {
        machine = machines.find(m => m.type === process && m.status === 'active');
      }

      if (!machine) continue;

      const hours = calculateProductionHours(formData.sheets, machine.capacity_per_hour);

      // Get existing queue for this machine
      const machineQueue = queueEntries.filter(q => q.machine_id === machine.id);

      const schedule = calculateSchedule(
        machine,
        machineQueue,
        hours,
        previousEnd || new Date()
      );

      const entry = await base44.entities.QueueEntry.create({
        job_id: job.id,
        job_number: formData.job_number,
        machine_id: machine.id,
        machine_name: machine.name,
        process_type: process,
        sheets: formData.sheets,
        estimated_hours: hours,
        scheduled_start: schedule.scheduled_start,
        scheduled_end: schedule.scheduled_end,
        status: 'queued',
        queue_position: machineQueue.length + 1
      });

      queueResults.push({ process, machine, hours, schedule, entry });
      previousEnd = new Date(schedule.scheduled_end);
    }

    // 3. Update job with estimated completion/delivery
    if (queueResults.length > 0) {
      const lastEnd = queueResults[queueResults.length - 1].schedule.scheduled_end;
      const deliveryDate = new Date(lastEnd);
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      // Skip weekends for delivery
      while (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
      }

      await base44.entities.PrintJob.update(job.id, {
        estimated_completion: lastEnd,
        estimated_delivery: deliveryDate.toISOString()
      });
    }

    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['queue'] });

    setResult({ job, queueResults });
    setSubmitting(false);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">สร้างงานใหม่</h1>
        <p className="text-sm text-gray-400 mt-1">กรอกข้อมูลงานเพื่อคำนวณ Leadtime และจัดคิวอัตโนมัติ</p>
      </div>

      {submitting && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">กำลังคำนวณและจัดคิว...</p>
          </div>
        </div>
      )}

      {!result && !submitting && (
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <JobForm machines={machines} onSubmit={handleSubmit} />

            {/* Image section above submit button */}
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" /> รูปภาพงาน (ถ้ามี)
                </Label>
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingImage ? 'กำลังอัปโหลด...' : 'เพิ่มรูป'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
                </label>
              </div>
              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingImages.map((url, i) => (
                    <div key={i} className="relative group w-20 h-20">
                      <img src={url} className="w-20 h-20 object-cover rounded-lg border border-gray-100" />
                      <button
                        type="button"
                        onClick={() => handleImageRemove(url)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Success */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-900">จัดคิวสำเร็จ!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                งาน <span className="font-bold">{result.job.job_number}</span> ถูกจัดเข้าคิว {result.queueResults.length} ขั้นตอน
              </p>
            </div>
          </div>

          {/* Process Details */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">รายละเอียดการผลิต</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.queueResults.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{PROCESS_LABELS[item.process]}</span>
                        <Badge variant="secondary" className="text-xs">{item.machine.name}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.entry.sheets?.toLocaleString()} แผ่น @ {item.machine.capacity_per_hour?.toLocaleString()} แผ่น/ชม.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatHours(item.hours)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(item.schedule.scheduled_start).toLocaleString('th-TH', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })} - {new Date(item.schedule.scheduled_end).toLocaleString('th-TH', { hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Leadtime รวม</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatHours(result.queueResults.reduce((sum, i) => sum + i.hours, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">วันส่งมอบ (ประมาณ)</p>
                  <p className="text-lg font-bold text-gray-900">
                    {result.queueResults.length > 0
                      ? (() => {
                          const lastEnd = new Date(result.queueResults[result.queueResults.length - 1].schedule.scheduled_end);
                          lastEnd.setDate(lastEnd.getDate() + 1);
                          return lastEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
                        })()
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <JobQRCode job={result.job} />

          <div className="flex gap-3">
            <a href={createPageUrl('CreateJob')} onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> สร้างงานใหม่
            </a>
            <a href={createPageUrl('Dashboard')}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              กลับ Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}