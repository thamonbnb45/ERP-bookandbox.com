import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STATUS_COLORS, PRIORITY_COLORS, PROCESS_LABELS, formatHours } from './SchedulingUtils';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, FileText } from 'lucide-react';
import DailyReportModal from './DailyReportModal';

const STATUS_OPTIONS = ['pending', 'prepress', 'printing', 'postpress', 'completed', 'delivered'];
const PRIORITY_OPTIONS = ['normal', 'urgent', 'rush'];

export default function JobScheduleTable({ jobs, queueEntries }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ jobNumber: '', productType: '', status: '', priority: '', deliveryDate: '' });
  const [showReport, setShowReport] = useState(false);

  const setFilter = (key, val) => setFilters((prev) => ({ ...prev, [key]: val }));

  const filteredJobs = jobs.filter((job) => {
    if (filters.jobNumber && !job.job_number?.toLowerCase().includes(filters.jobNumber.toLowerCase())) return false;
    if (filters.productType && !job.product_type?.toLowerCase().includes(filters.productType.toLowerCase())) return false;
    if (filters.status && job.status !== filters.status) return false;
    if (filters.priority && job.priority !== filters.priority) return false;
    if (filters.deliveryDate) {
      const delivery = job.estimated_delivery ?
      moment(job.estimated_delivery).format('YYYY-MM-DD') :
      null;
      if (!delivery || !delivery.startsWith(filters.deliveryDate)) return false;
    }
    return true;
  });

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
        <p className="text-gray-400 text-sm">ยังไม่มีงาน</p>
      </div>);

  }

  return (
    <>
    <DailyReportModal open={showReport} onClose={() => setShowReport(false)} jobs={jobs} queueEntries={queueEntries} />
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm text-gray-500">{filteredJobs.length} งาน</p>
        


          
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 min-w-[130px]">
                <div className="space-y-1">
                  <div>Job Number</div>
                  <input
                      className="w-full text-xs font-normal border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-blue-400"
                      placeholder="ค้นหา..."
                      value={filters.jobNumber}
                      onChange={(e) => setFilter('jobNumber', e.target.value)}
                      onClick={(e) => e.stopPropagation()} />
                    
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 min-w-[140px]">
                <div className="space-y-1">
                  <div>ประเภทสินค้า</div>
                  <input
                      className="w-full text-xs font-normal border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-blue-400"
                      placeholder="ค้นหา..."
                      value={filters.productType}
                      onChange={(e) => setFilter('productType', e.target.value)}
                      onClick={(e) => e.stopPropagation()} />
                    
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">จำนวนแผ่น</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 min-w-[120px]">
                <div className="space-y-1">
                  <div>สถานะ</div>
                  <select
                      className="w-full text-xs font-normal border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-blue-400"
                      value={filters.status}
                      onChange={(e) => setFilter('status', e.target.value)}
                      onClick={(e) => e.stopPropagation()}>
                      
                    <option value="">ทั้งหมด</option>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 min-w-[110px]">
                <div className="space-y-1">
                  <div>ความสำคัญ</div>
                  <select
                      className="w-full text-xs font-normal border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-blue-400"
                      value={filters.priority}
                      onChange={(e) => setFilter('priority', e.target.value)}
                      onClick={(e) => e.stopPropagation()}>
                      
                    <option value="">ทั้งหมด</option>
                    {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">ขั้นตอน Postpress</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">Leadtime รวม</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">วันผลิตเสร็จ</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 min-w-[130px]">
                <div className="space-y-1">
                  <div>วันส่งมอบ</div>
                  <input
                      type="date"
                      className="w-full text-xs font-normal border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-blue-400"
                      value={filters.deliveryDate}
                      onChange={(e) => setFilter('deliveryDate', e.target.value)}
                      onClick={(e) => e.stopPropagation()} />
                    
                </div>
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job) => {
                const jobEntries = queueEntries.filter((q) => q.job_id === job.id);
                const totalHours = jobEntries.reduce((sum, e) => sum + (e.estimated_hours || 0), 0);
                const latestEnd = jobEntries.reduce((latest, e) => {
                  const end = new Date(e.scheduled_end);
                  return end > latest ? end : latest;
                }, new Date(0));
                const hasSchedule = jobEntries.length > 0 && latestEnd.getFullYear() > 2000;

                return (
                  <TableRow
                    key={job.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`${createPageUrl('JobDetail')}?id=${job.id}`)}>
                    
                  <TableCell className="font-semibold text-sm text-blue-700 underline underline-offset-2">
                    {job.job_number?.replace(/^JOB-?/i, 'JOG-')}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{job.product_type}</TableCell>
                  <TableCell className="text-sm tabular-nums">{job.sheets?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[job.status]} text-xs`}>{job.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${PRIORITY_COLORS[job.priority]} text-xs`}>{job.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(job.postpress_steps || []).map((step) =>
                        <span key={step} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {PROCESS_LABELS[step]}
                        </span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    {totalHours > 0 ? formatHours(totalHours) : '-'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {hasSchedule ? moment(latestEnd).format('DD/MM/YYYY HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {job.estimated_delivery ?
                      moment(job.estimated_delivery).format('DD/MM/YYYY') :
                      hasSchedule ?
                      moment(latestEnd).add(1, 'day').format('DD/MM/YYYY') :
                      '-'
                      }
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </TableCell>
                </TableRow>);

              })}
          </TableBody>
        </Table>
      </div>
    </div>
    </>);

}