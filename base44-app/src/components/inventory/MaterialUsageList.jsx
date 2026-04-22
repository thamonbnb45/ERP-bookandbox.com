import React from 'react';
import { PackageOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function MaterialUsageList({ usages }) {
  if (!usages || usages.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">ยังไม่มีประวัติการใช้วัตถุดิบ</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 text-xs text-gray-400 px-3 pb-1">
        <span>งาน</span>
        <span>วัตถุดิบ</span>
        <span className="text-right">จำนวน</span>
        <span className="text-right">ต้นทุน</span>
        <span className="text-right">วันที่</span>
      </div>
      {usages.map(usage => (
        <div key={usage.id} className="grid grid-cols-5 items-center bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm shadow-sm">
          <span className="font-mono text-gray-700 text-xs">{usage.job_number || '-'}</span>
          <span className="text-gray-700 truncate text-xs pr-2">{usage.material_name || '-'}</span>
          <span className="text-right text-gray-600 text-xs">{usage.quantity_used?.toLocaleString()} {usage.unit}</span>
          <span className="text-right font-medium text-gray-900 text-xs">฿{usage.cost?.toLocaleString()}</span>
          <span className="text-right text-gray-400 text-xs">
            {usage.created_date ? format(new Date(usage.created_date), 'dd/MM/yy') : '-'}
          </span>
        </div>
      ))}
      <div className="text-right pt-2">
        <span className="text-sm text-gray-400">ต้นทุนรวมทั้งหมด: </span>
        <span className="text-lg font-bold text-gray-900">
          ฿{usages.reduce((sum, u) => sum + (u.cost || 0), 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}