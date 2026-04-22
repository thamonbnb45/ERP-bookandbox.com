import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, Info, Layers } from 'lucide-react';
import { isJobEligible } from '@/utils/combineUtils';
import moment from 'moment';

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  prepress: 'bg-yellow-100 text-yellow-700',
  printing: 'bg-blue-100 text-blue-700',
  postpress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};
const PRIORITY_COLORS = {
  normal: 'bg-gray-100 text-gray-600',
  urgent: 'bg-orange-100 text-orange-700',
  rush: 'bg-red-100 text-red-700',
};

function EligibleBadge({ job }) {
  if (job.combine_group_id) return (
    <Badge className="bg-blue-100 text-blue-700 text-xs gap-1"><Layers className="w-3 h-3" />ในกลุ่มแล้ว</Badge>
  );
  if (!isJobEligible(job)) return (
    <Badge className="bg-red-100 text-red-700 text-xs gap-1"><XCircle className="w-3 h-3" />ไม่พร้อม</Badge>
  );
  return (
    <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1"><CheckCircle2 className="w-3 h-3" />พร้อม</Badge>
  );
}

export default function CombineJobTable({ jobs, selected, onToggle, onSelectAll, machines }) {
  const allSelected = jobs.length > 0 && jobs.every(j => selected.includes(j.id));
  const someSelected = selected.length > 0;
  const getMachine = (id) => machines.find(m => m.id === id);

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => onSelectAll(e.target.checked)}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Job No.</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">ลูกค้า</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">สินค้า</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">ประเภท</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">จำนวน</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">กระดาษ</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">แกรม</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">ขนาด</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">เครื่อง</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">วันส่ง</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Priority</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">สถานะ</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">เลย์รวม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {jobs.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center py-12 text-gray-400">
                  ไม่พบงานที่ตรงกับเงื่อนไข
                </td>
              </tr>
            )}
            {jobs.map(job => {
              const isSelected = selected.includes(job.id);
              const eligible = isJobEligible(job);
              const machine = getMachine(job.printing_machine_id);
              const hasWarning = job.priority === 'urgent' || job.priority === 'rush';

              return (
                <tr
                  key={job.id}
                  className={`transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'} ${!eligible ? 'opacity-60' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => eligible && onToggle(job.id)}
                      disabled={!eligible}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-blue-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {job.job_number}
                      {hasWarning && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{job.customer_name || '-'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{job.product_name || job.product_type}</td>
                  <td className="px-3 py-2 text-gray-600">{job.product_type}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{job.quantity?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{job.paper || '-'}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-600">{job.gsm || '-'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{job.paper_size || '-'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{machine?.name || '-'}</td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                    {job.due_date ? (
                      <span className={`${new Date(job.due_date) < new Date() ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {moment(job.due_date).format('DD/MM/YY')}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`${PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.normal} text-xs`}>
                      {job.priority}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`${STATUS_COLORS[job.status] || STATUS_COLORS.pending} text-xs`}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <EligibleBadge job={job} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}