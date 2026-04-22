import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { PAPER_TYPES, PAPER_SIZES, GSM_OPTIONS } from '@/utils/combineUtils';

const EMPTY = 'all';

export default function CombineFilterBar({ filters, onChange, machines, onReset }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Job Number"
            value={filters.jobNumber}
            onChange={e => set('jobNumber', e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Input
          placeholder="ชื่อลูกค้า"
          value={filters.customer}
          onChange={e => set('customer', e.target.value)}
          className="h-8 text-xs"
        />
        <Select value={filters.paperType} onValueChange={v => set('paperType', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="ประเภทกระดาษ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>ทั้งหมด</SelectItem>
            {PAPER_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.gsm} onValueChange={v => set('gsm', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="แกรม" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>ทั้งหมด</SelectItem>
            {GSM_OPTIONS.map(g => <SelectItem key={g} value={String(g)}>{g} แกรม</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.paperSize} onValueChange={v => set('paperSize', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="ขนาดกระดาษ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>ทั้งหมด</SelectItem>
            {PAPER_SIZES.map(s => <SelectItem key={s} value={s}>{s} ซม.</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.machineId} onValueChange={v => set('machineId', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="เครื่องพิมพ์" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>ทั้งหมด</SelectItem>
            {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={filters.priority} onValueChange={v => set('priority', v)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY}>ทั้งหมด</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="rush">Rush</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.readyOnly}
            onChange={e => set('readyOnly', e.target.checked)}
            className="rounded"
          />
          พร้อมเลย์รวมเท่านั้น
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.hideGrouped}
            onChange={e => set('hideGrouped', e.target.checked)}
            className="rounded"
          />
          ซ่อนงานที่อยู่ในกลุ่มแล้ว
        </label>

        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs text-gray-500 ml-auto">
          <X className="w-3 h-3 mr-1" />
          ล้าง Filter
        </Button>
      </div>
    </div>
  );
}