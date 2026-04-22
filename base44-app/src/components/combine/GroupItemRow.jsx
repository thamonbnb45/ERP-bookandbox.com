import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink } from 'lucide-react';
import { calcSheetsForJob } from '@/utils/combineUtils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GroupItemRow({ item, totalSheets, onUpdate, onRemove, locked }) {
  const navigate = useNavigate();
  const sheetsNeeded = calcSheetsForJob(item.qty || 0, item.waste_qty || 0, item.up_per_sheet || 1);
  const diff = totalSheets - sheetsNeeded;

  return (
    <tr className="border-b border-gray-50 text-xs hover:bg-gray-50/40">
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          onClick={() => navigate(`${createPageUrl('JobDetail')}?id=${item.job_id}`)}
          className="font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 group"
        >
          {item.job_number}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </td>
      <td className="px-3 py-2 text-gray-600 max-w-[100px] truncate">{item.product_name || item.job_number}</td>
      <td className="px-3 py-2 tabular-nums text-right">{item.qty?.toLocaleString()}</td>
      <td className="px-3 py-2">
        {locked ? (
          <span className="tabular-nums">{item.up_per_sheet}</span>
        ) : (
          <Input
            type="number" min={1}
            value={item.up_per_sheet || ''}
            onChange={e => onUpdate({ ...item, up_per_sheet: parseInt(e.target.value) || 1 })}
            className="h-7 w-16 text-xs text-right"
          />
        )}
      </td>
      <td className="px-3 py-2">
        {locked ? (
          <span className="tabular-nums">{item.waste_qty || 0}</span>
        ) : (
          <Input
            type="number" min={0}
            value={item.waste_qty ?? ''}
            onChange={e => onUpdate({ ...item, waste_qty: parseInt(e.target.value) || 0 })}
            className="h-7 w-16 text-xs text-right"
          />
        )}
      </td>
      <td className="px-3 py-2 tabular-nums text-right font-semibold">{sheetsNeeded.toLocaleString()}</td>
      <td className="px-3 py-2 tabular-nums text-right">{totalSheets.toLocaleString()}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        <span className={diff < 0 ? 'text-red-600 font-semibold' : diff > 0 ? 'text-emerald-600' : 'text-gray-500'}>
          {diff >= 0 ? `+${diff}` : diff}
        </span>
      </td>
      <td className="px-3 py-2 tabular-nums text-right">
        {(item.area_percent || 0).toFixed(1)}%
      </td>
      <td className="px-3 py-2 tabular-nums text-right font-semibold">
        {(item.cost_share_percent || 0).toFixed(1)}%
      </td>
      <td className="px-3 py-2 text-center">
        {locked ? null : (
          <label className="flex justify-center">
            <input
              type="checkbox"
              checked={item.rotate_allowed || false}
              onChange={e => onUpdate({ ...item, rotate_allowed: e.target.checked })}
              className="rounded"
            />
          </label>
        )}
      </td>
      <td className="px-3 py-2">
        {locked ? null : (
          <Input
            value={item.note || ''}
            onChange={e => onUpdate({ ...item, note: e.target.value })}
            className="h-7 text-xs"
            placeholder="หมายเหตุ"
          />
        )}
      </td>
      <td className="px-3 py-2">
        {!locked && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
}