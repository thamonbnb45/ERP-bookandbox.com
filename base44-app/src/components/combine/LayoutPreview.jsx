import React from 'react';
import { parsePaperSizeMm } from '@/utils/layoutEngine';

const JOB_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
];

const PREVIEW_W = 480;

// Reconstruct individual cell placements from saved DB data
function reconstructPlacements(it, spacingMm = 3) {
  // If allPlacements is available (in-memory), use it directly
  if (it.allPlacements?.length) return it.allPlacements;

  const up = it.up_per_sheet || 1;
  const zoneX = it.pos_x || 0;
  const zoneY = it.pos_y || 0;
  const zoneW = it.box_width || 0;
  const zoneH = it.box_height || 0;

  if (zoneW < 1 || zoneH < 1) return [];

  // Use stored final_size_w/h (these are in mm, including bleed)
  // Try both field names (final_size_w from DB, final_w_mm from in-memory)
  const jw = it.final_size_w || it.final_w_mm || 0;
  const jh = it.final_size_h || it.final_h_mm || 0;

  if (jw < 1 || jh < 1) return [];

  // Determine cols/rows from stored data
  const cols = it.cols || Math.max(1, Math.floor((zoneW + spacingMm) / (jw + spacingMm)));
  const rows = it.rows || Math.max(1, Math.floor((zoneH + spacingMm) / (jh + spacingMm)));

  // Build individual cell placements
  const placements = [];
  let count = 0;
  for (let r = 0; r < rows && count < up; r++) {
    for (let c = 0; c < cols && count < up; c++) {
      placements.push({
        x: zoneX + c * (jw + spacingMm),
        y: zoneY + r * (jh + spacingMm),
        w: jw,
        h: jh,
      });
      count++;
    }
  }
  return placements;
}

export default function LayoutPreview({ items, paperSize, totalSheets, layoutSettings }) {
  // Parse paper size (support both formats)
  let paperW = 650, paperH = 920;
  try {
    const r = parsePaperSizeMm(paperSize);
    paperW = r.w; paperH = r.h;
  } catch { /* ignore */ }

  // Always landscape
  if (paperH > paperW) { const tmp = paperW; paperW = paperH; paperH = tmp; }

  const scale = PREVIEW_W / paperW;
  const previewH = Math.round(paperH * scale);

  const gripMm = layoutSettings?.gripMm ?? 10;
  const spacingMm = layoutSettings?.spacingMm ?? 3;
  const gripPx = Math.round(gripMm * scale);

  // Calculate usage
  const usedArea = items.reduce((s, it) => {
    const jw = it.final_size_w || it.final_w_mm || 0;
    const jh = it.final_size_h || it.final_h_mm || 0;
    return s + jw * jh * (it.up_per_sheet || 0);
  }, 0);
  const printableArea = paperW * (paperH - gripMm);
  const usagePercent = printableArea > 0 ? Math.min((usedArea / printableArea) * 100, 100) : 0;
  const remainPercent = 100 - usagePercent;

  const warnings = [];
  if (usagePercent > 95) warnings.push('พื้นที่แทบเต็มแล้ว ควรเผื่อ margin');
  if (usagePercent < 40 && items.length > 0) warnings.push('พื้นที่ใช้น้อยมาก ควรเพิ่มจำนวนลงต่อแผ่น');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Preview Layout</h3>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>กระดาษ: <strong>{paperSize}</strong></span>
          <span>ใช้พื้นที่: <strong className={usagePercent > 90 ? 'text-orange-600' : 'text-emerald-600'}>{usagePercent.toFixed(1)}%</strong></span>
          <span>เหลือ: <strong>{remainPercent.toFixed(1)}%</strong></span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-1.5">
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      <div
        className="relative border-2 border-gray-300 bg-white mx-auto overflow-hidden rounded"
        style={{ width: PREVIEW_W, height: previewH }}
      >
        {/* Gripper area */}
        <div
          className="absolute left-0 right-0 top-0 bg-gray-200 border-b border-dashed border-gray-400 flex items-center justify-center"
          style={{ height: gripPx }}
        >
          <span className="text-gray-500" style={{ fontSize: 9 }}>GRIPPER {gripMm}mm</span>
        </div>

        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
            ยังไม่มีงานในกลุ่ม
          </div>
        )}

        {items.map((it, idx) => {
          const color = JOB_COLORS[idx % JOB_COLORS.length];
          const placements = reconstructPlacements(it, spacingMm);

          if (!placements.length) return null;

          return placements.map((p, pi) => {
            const px = Math.round(p.x * scale);
            const py = Math.round(p.y * scale);
            const pw = Math.round(p.w * scale);
            const ph = Math.round(p.h * scale);
            if (pw < 2 || ph < 2) return null;
            const isFirst = pi === 0;
            const fontSize = Math.max(7, Math.min(11, Math.min(pw, ph) / 5));
            return (
              <div
                key={`${it.job_id || idx}-${pi}`}
                className="absolute border overflow-hidden"
                style={{ left: px, top: py, width: pw - 1, height: ph - 1, backgroundColor: color + 'cc', borderColor: color }}
              >
                {isFirst && pw > 20 && ph > 14 && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none"
                    style={{ fontSize }}
                  >
                    <div className="font-bold drop-shadow leading-tight truncate px-0.5 text-center">
                      {it.product_name || it.job_number}
                    </div>
                    {ph > 28 && (
                      <div className="opacity-80 drop-shadow leading-tight text-center truncate px-0.5">
                        #{it.job_number}
                      </div>
                    )}
                    {ph > 40 && (
                      <div className="opacity-90 drop-shadow leading-tight">
                        {it.up_per_sheet} up
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })}
      </div>

      {/* Legend */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((it, idx) => (
            <div key={it.job_id || idx} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: JOB_COLORS[idx % JOB_COLORS.length] }} />
              <span className="font-medium">{it.product_name || it.job_number}</span>
              <span className="text-gray-400">#{it.job_number} ×{it.up_per_sheet}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}