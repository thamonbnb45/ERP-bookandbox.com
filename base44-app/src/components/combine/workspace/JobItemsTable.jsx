import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCw, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { JOB_COLORS } from '@/utils/layoutEngine';

export default function JobItemsTable({ items, onUpdateItem, onRemoveItem, locked, printMethod = 'single_side' }) {
  const isWT = printMethod === 'work_and_turn' || printMethod === 'work_and_tumble';
  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-gray-400 text-xs">
        ยังไม่มีงานในกลุ่ม
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-2 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">#</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">Job / ลูกค้า</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">ขนาดสำเร็จ (mm)</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">จำนวน</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">เผื่อเสีย</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">หมุน</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">ลงต่อแผ่น</th>
              {isWT && <th className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">Up/โซน</th>}
              <th className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">แถว×คอล</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">ได้รวม</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">ขาด/เกิน</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-500 whitespace-nowrap">สถานะ</th>
              {!locked && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((it, idx) => {
              const color = JOB_COLORS[idx % JOB_COLORS.length];
              const canPlace = (it.up_per_sheet || 0) > 0;
              const diff = it.diff || 0;
              const totalNeeded = (it.qty || 0) + (it.waste_qty || 0);

              return (
                <tr key={it.job_id || idx} className="hover:bg-gray-50/50">
                  <td className="px-2 py-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="font-semibold text-gray-800 font-mono">{it.job_number}</div>
                    <div className="text-gray-400 truncate max-w-[100px]">{it.customer_name}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    {locked ? (
                      <span className="tabular-nums">{it.final_w_mm}×{it.final_h_mm}</span>
                    ) : (
                      <div className="flex gap-1 items-center">
                        <Input
                          type="number"
                          value={it.final_w_mm || ''}
                          onChange={e => onUpdateItem(idx, { ...it, final_w_mm: parseFloat(e.target.value) || 0 })}
                          className="w-14 h-6 text-xs px-1"
                          placeholder="W"
                        />
                        <span className="text-gray-300">×</span>
                        <Input
                          type="number"
                          value={it.final_h_mm || ''}
                          onChange={e => onUpdateItem(idx, { ...it, final_h_mm: parseFloat(e.target.value) || 0 })}
                          className="w-14 h-6 text-xs px-1"
                          placeholder="H"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {locked ? it.qty?.toLocaleString() : (
                      <Input
                        type="number"
                        value={it.qty || ''}
                        onChange={e => onUpdateItem(idx, { ...it, qty: parseInt(e.target.value) || 0 })}
                        className="w-20 h-6 text-xs px-1"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {locked ? it.waste_qty : (
                      <Input
                        type="number"
                        value={it.waste_qty || ''}
                        onChange={e => onUpdateItem(idx, { ...it, waste_qty: parseInt(e.target.value) || 0 })}
                        className="w-16 h-6 text-xs px-1"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      disabled={locked}
                      onClick={() => onUpdateItem(idx, { ...it, rotate_allowed: !it.rotate_allowed })}
                      className={`p-1 rounded transition-colors ${it.rotate_allowed ? 'text-blue-600 bg-blue-50' : 'text-gray-300 hover:text-gray-500'} ${locked ? 'opacity-50 cursor-default' : ''}`}
                      title="อนุญาตหมุน 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    {it.rotated && <span className="text-blue-500 text-xs ml-0.5">↺</span>}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                     {locked ? (
                       <span className="font-bold tabular-nums">{it.up_per_sheet}</span>
                     ) : (
                       <Input
                         type="number"
                         value={it.up_per_sheet || ''}
                         onChange={e => onUpdateItem(idx, { ...it, up_per_sheet: parseInt(e.target.value) || 1, _manual_up: true })}
                         className="w-14 h-6 text-xs px-1 text-center font-bold"
                       />
                     )}
                   </td>
                   {isWT && (
                     <td className="px-2 py-1.5 text-center tabular-nums">
                       <span className="text-blue-600 font-semibold">{Math.floor((it.up_per_sheet || 0) / 2)}</span>
                       <span className="text-gray-400 text-xs">×2</span>
                     </td>
                   )}
                  <td className="px-2 py-1.5 text-center tabular-nums text-gray-600">
                    {(it.rows || 0) > 0 ? `${it.rows}×${it.cols}` : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums font-semibold">
                    {(it.got_total || 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    <span className={`font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {diff > 0 ? '+' : ''}{diff}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {canPlace
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      : <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                    }
                  </td>
                  {!locked && (
                    <td className="px-2 py-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-gray-300 hover:text-red-500"
                        onClick={() => onRemoveItem(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isWT && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
          <strong>W&T:</strong> Up ที่แสดงคือจำนวนทั้งหมดรวมทั้ง 2 โซน (หน้า+หลัง) — ตัดครึ่งแผ่นได้ 2 ชุด
          &nbsp;| Up/โซน = จำนวน up ฝั่ง FRONT หรือ BACK แต่ละฝั่ง
        </div>
      )}
    </div>
  );
}