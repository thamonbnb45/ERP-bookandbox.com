import React from 'react';
import { PROCESS_COLORS, formatHours } from './SchedulingUtils';
import { AlertTriangle } from 'lucide-react';

export default function CapacityMeter({ machine, queueEntries }) {
  const entries = queueEntries.filter(q => q.machine_id === machine.id && q.status !== 'completed');
  const totalHours = entries.reduce((sum, e) => sum + (e.estimated_hours || 0), 0);
  
  const workStart = machine.working_hours_start || '08:00';
  const workEnd = machine.working_hours_end || '18:00';
  const [sh, sm] = workStart.split(':').map(Number);
  const [eh, em] = workEnd.split(':').map(Number);
  const workHoursPerDay = (eh + em / 60) - (sh + sm / 60);
  const daysLoaded = totalHours / workHoursPerDay;
  const utilization = Math.min((daysLoaded / 5) * 100, 100);
  
  const colors = PROCESS_COLORS[machine.type] || PROCESS_COLORS.printing;
  const isOverloaded = daysLoaded > 3;

  return (
    <div className={`rounded-xl border p-4 ${isOverloaded ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-white'} transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm text-gray-900">{machine.name}</h4>
          <p className="text-xs text-gray-400">{machine.capacity_per_hour?.toLocaleString()} แผ่น/ชม.</p>
        </div>
        <div className="flex items-center gap-2">
          {isOverloaded && <AlertTriangle className="w-4 h-4 text-red-500" />}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isOverloaded ? 'bg-red-100 text-red-700' : 
            utilization > 70 ? 'bg-amber-100 text-amber-700' : 
            'bg-emerald-100 text-emerald-700'
          }`}>
            {entries.length} งาน
          </span>
        </div>
      </div>

      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverloaded ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : colors.bg
          }`}
          style={{ width: `${Math.min(utilization, 100)}%` }}
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">โหลด {formatHours(totalHours)}</span>
        <span className="text-xs text-gray-400">~{daysLoaded.toFixed(1)} วัน</span>
      </div>
    </div>
  );
}