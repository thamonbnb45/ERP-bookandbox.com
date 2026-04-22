import React from 'react';
import { AlertTriangle, Package, Droplets } from 'lucide-react';

export default function LowStockAlert({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 text-sm">⚠️ วัตถุดิบใกล้หมด {items.length} รายการ</h3>
          <div className="mt-2 space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-red-700">
                {item.type === 'paper'
                  ? <Package className="w-3.5 h-3.5 shrink-0" />
                  : <Droplets className="w-3.5 h-3.5 shrink-0" />
                }
                <span className="font-medium">{item.name}</span>
                <span className="text-red-500">
                  คงเหลือ {item.current_stock?.toLocaleString()} {item.unit} (ขั้นต่ำ {item.minimum_stock?.toLocaleString()} {item.unit})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}