import React from 'react';
import { PROCESS_COLORS, PROCESS_LABELS, formatHours } from './SchedulingUtils';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText } from 'lucide-react';
import moment from 'moment';

export default function QueueTimeline({ machine, queueEntries }) {
  const entries = queueEntries
    .filter(q => q.machine_id === machine.id && q.status !== 'completed')
    .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));

  const colors = PROCESS_COLORS[machine.type] || PROCESS_COLORS.printing;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className={`px-5 py-3 border-b border-gray-50 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${colors.bg}`} />
          <div>
            <h3 className="font-semibold text-sm text-gray-900">{machine.name}</h3>
            <p className="text-xs text-gray-400">{machine.capacity_per_hour?.toLocaleString()} แผ่น/ชม. • {PROCESS_LABELS[machine.type]}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">{entries.length} งาน</Badge>
      </div>

      <div className="divide-y divide-gray-50">
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            ไม่มีงานในคิว
          </div>
        ) : (
          entries.map((entry, idx) => {
            const isCompleted = entry.status === 'completed';
            const isInProgress = entry.status === 'in_progress';

            return (
              <div
                key={entry.id}
                className={`px-5 py-3 flex items-center gap-4 transition-colors ${
                  isCompleted ? 'opacity-50' : isInProgress ? `${colors.light}` : 'hover:bg-gray-50/50'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCompleted ? 'bg-gray-100 text-gray-400' :
                    isInProgress ? `${colors.bg} text-white` :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {idx + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-sm text-gray-900 truncate">{entry.job_number?.replace(/^JOB-?/i, 'JOG-')}</span>
                    {isInProgress && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full animate-pulse">กำลังผลิต</span>
                    )}
                    {isCompleted && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">เสร็จแล้ว</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{entry.sheets?.toLocaleString()} แผ่น</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{formatHours(entry.estimated_hours)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {moment(entry.scheduled_start).format('DD/MM HH:mm')} - {moment(entry.scheduled_end).format('HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}