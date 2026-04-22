import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { formatHours } from './SchedulingUtils';

export default function BottleneckAlert({ bottlenecks }) {
  const criticalMachines = bottlenecks.filter(b => b.isBottleneck);

  if (criticalMachines.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-600 text-sm">✓</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">ระบบทำงานปกติ</p>
            <p className="text-xs text-emerald-600">ไม่พบ Bottleneck ในสายการผลิต</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">พบ Bottleneck!</p>
          <p className="text-xs text-red-600">{criticalMachines.length} เครื่องมีคิวงานเกินกำลังผลิต</p>
        </div>
      </div>

      <div className="space-y-2">
        {criticalMachines.map((item) => (
          <div key={item.machine.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-gray-900">{item.machine.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{item.queueCount} งาน</span>
              <ArrowRight className="w-3 h-3" />
              <span className="font-medium text-red-600">{formatHours(item.totalHours)}</span>
              <span className="text-red-500">~{item.daysLoaded.toFixed(1)} วัน</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}