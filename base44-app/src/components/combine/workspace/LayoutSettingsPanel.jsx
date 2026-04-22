import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2 } from 'lucide-react';

// customCostPercents: { [jobId]: number } — ส่งผ่าน props จาก parent

export default function LayoutSettingsPanel({ settings, onChange, items = [], customCostPercents = {}, onCustomCostChange }) {
  const set = (key, val) => onChange({ ...settings, [key]: parseFloat(val) || 0 });
  const setStr = (key, val) => onChange({ ...settings, [key]: val });

  const totalCustom = items.reduce((s, it) => s + (parseFloat(customCostPercents[it.job_id] ?? 0) || 0), 0);
  const customError = Math.abs(totalCustom - 100) > 0.5;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
        <Settings2 className="w-3.5 h-3.5" /> ตั้งค่าการวางเลย์
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Grip (mm)" value={settings.gripMm} onChange={v => set('gripMm', v)} />
        <Field label="Head margin (mm)" value={settings.headMm} onChange={v => set('headMm', v)} />
        <Field label="Tail margin (mm)" value={settings.tailMm} onChange={v => set('tailMm', v)} />
        <Field label="Side margin (mm)" value={settings.sideMm} onChange={v => set('sideMm', v)} />
        <Field label="Bleed รอบงาน (mm)" value={settings.bleedMm} onChange={v => set('bleedMm', v)} />
        <Field label="ระยะห่างชิ้นงาน (mm)" value={settings.spacingMm} onChange={v => set('spacingMm', v)} />
      </div>

      <div className="mt-3">
        <label className="text-xs text-gray-500 mb-1 block">วิธีคำนวณจำนวนพิมพ์</label>
        <Select value={settings.sheetCalcMethod} onValueChange={v => setStr('sheetCalcMethod', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="max">ตาม Job ที่ต้องการมากสุด</SelectItem>
            <SelectItem value="avg">เฉลี่ยกลาง</SelectItem>
            <SelectItem value="fixed">กำหนดเอง</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.sheetCalcMethod === 'fixed' && (
        <div className="mt-2">
          <Field label="จำนวนใบพิมพ์ที่กำหนด" value={settings.fixedSheetCount} onChange={v => set('fixedSheetCount', v)} />
        </div>
      )}

      <div className="mt-3">
        <label className="text-xs text-gray-500 mb-1 block">วิธีแชร์ต้นทุน</label>
        <Select value={settings.costMethod} onValueChange={v => setStr('costMethod', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="area">ตามพื้นที่</SelectItem>
            <SelectItem value="quantity">ตามจำนวนชิ้น</SelectItem>
            <SelectItem value="custom">กำหนดเอง</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.costMethod === 'custom' && items.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {items.map(it => (
            <div key={it.job_id} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 truncate flex-1 min-w-0" title={it.job_number}>
                {it.job_number}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={customCostPercents[it.job_id] ?? ''}
                  onChange={e => onCustomCostChange?.(it.job_id, e.target.value)}
                  className="h-6 w-16 text-xs text-right tabular-nums"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
          ))}
          <div className={`text-xs text-right font-medium ${customError ? 'text-red-500' : 'text-emerald-600'}`}>
            รวม {totalCustom.toFixed(1)}% {customError ? '⚠ ต้องรวมเป็น 100%' : '✓'}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-7 text-xs tabular-nums"
        step="0.5"
      />
    </div>
  );
}