import React, { useMemo, useState } from 'react';
import { parsePaperSizeMm, getPrintableArea } from '@/utils/layoutEngine';
import { JOB_COLORS } from '@/utils/layoutEngine';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { PRINT_METHODS } from '@/utils/printMethod';

const PREVIEW_MAX_W = 680;
const PREVIEW_MAX_H = 420;

export default function RealLayoutPreview({ items, paperSize, layoutSettings, warnings, totalSheets, areaUsage, printMethod = 'single_side' }) {
  const [sheetSide, setSheetSide] = useState('front'); // for sheet_wise toggle
  const method = PRINT_METHODS[printMethod] || PRINT_METHODS.single_side;

  // Pick strategy info from first item that has it
  const strategyItem = items.find(it => it._strategy);
  const strategyName = strategyItem?._strategy || null;
  const columnUsage = strategyItem?._columnUsage || null;
  const colConfig = strategyItem?._colConfig || null;
  const isColumnStrip = strategyName?.startsWith('ColumnStrip:');
  const rotatedJobs = items.filter(it => it.rotated || (it.allPlacements || []).some(p => p.rotated));
  // แสดงกระดาษในแนวนอน (landscape) เสมอ → swap W↔H ถ้ากระดาษแนวตั้ง
  const { w: rawW, h: rawH } = parsePaperSizeMm(paperSize);
  const isPortrait = rawH > rawW;
  const paperW = isPortrait ? rawH : rawW;
  const paperH = isPortrait ? rawW : rawH;

  const scaleByW = PREVIEW_MAX_W / paperW;
  const scaleByH = PREVIEW_MAX_H / paperH;
  const scale = Math.min(scaleByW, scaleByH);
  const previewW = Math.round(paperW * scale);
  const previewH = Math.round(paperH * scale);

  const { offsetX, offsetY, pw, ph } = getPrintableArea(paperW, paperH, layoutSettings);
  const { gripMm, headMm, tailMm, sideMm } = layoutSettings;

  const printableLeft = Math.round(offsetX * scale);
  const printableTop = Math.round(offsetY * scale);
  const printableW = Math.round(pw * scale);
  const printableH = Math.round(ph * scale);
  const gripPx = Math.round((gripMm) * scale);
  const headPx = Math.round(headMm * scale);
  const tailPx = Math.round(tailMm * scale);

  const hasError = warnings.some(w => w.type === 'error');

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-2 mb-3 flex-shrink-0">
        <SummaryChip
          label="ใช้พื้นที่"
          value={`${areaUsage.toFixed(1)}%`}
          color={areaUsage > 90 ? 'amber' : areaUsage < 40 ? 'red' : 'emerald'}
        />
        <SummaryChip
          label="พื้นที่เสีย"
          value={`${(100 - areaUsage).toFixed(1)}%`}
          color="gray"
        />
        <SummaryChip
          label="จำนวนพิมพ์"
          value={`${totalSheets.toLocaleString()} ใบ`}
          color="blue"
        />
        <SummaryChip
          label="สถานะ"
          value={hasError ? 'วางไม่ได้' : 'วางได้'}
          color={hasError ? 'red' : 'emerald'}
          icon={hasError ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1 mb-3 flex-shrink-0 max-h-24 overflow-y-auto">
          {warnings.map((w, i) => (
            <div key={i} className={`text-xs px-2.5 py-1.5 rounded-lg flex items-start gap-1.5 ${
              w.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {w.msg}
            </div>
          ))}
        </div>
      )}

      {/* sheet_wise toggle */}
      {printMethod === 'sheet_wise' && (
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <span className="text-xs text-gray-500">ดูกรอบ:</span>
          <button onClick={() => setSheetSide('front')}
            className={`text-xs px-3 py-1 rounded-lg border font-medium transition-colors ${sheetSide === 'front' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            กรอบที่ 1 (หน้า)
          </button>
          <button onClick={() => setSheetSide('back')}
            className={`text-xs px-3 py-1 rounded-lg border font-medium transition-colors ${sheetSide === 'back' ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            กรอบที่ 2 (หลัง)
          </button>
        </div>
      )}

      {/* Paper canvas */}
      <div className="flex-1 flex items-center justify-center overflow-auto bg-gray-100 rounded-xl p-4">
        <div>
          {/* Paper label */}
          <div className="text-xs text-gray-400 text-center mb-1">
            กระดาษ {paperSize} ซม. ({paperW}×{paperH} mm)
          </div>

          {/* Paper sheet */}
          <div
            className="relative bg-white shadow-lg border border-gray-300 overflow-hidden"
            style={{ width: previewW, height: previewH }}
          >
            {/* Gripper zone */}
            <div
              className="absolute left-0 right-0 top-0 bg-blue-100 border-b-2 border-dashed border-blue-300"
              style={{ height: gripPx }}
            >
              <div className="text-center text-blue-500 leading-none" style={{ fontSize: 9, paddingTop: Math.max(2, gripPx / 2 - 5) }}>
                GRIP {gripMm}mm
              </div>
            </div>

            {/* Head margin */}
            {headMm > 0 && (
              <div
                className="absolute left-0 right-0 bg-yellow-50 border-b border-dashed border-yellow-300 opacity-60"
                style={{ top: gripPx, height: headPx }}
              />
            )}

            {/* Tail margin */}
            {tailMm > 0 && (
              <div
                className="absolute left-0 right-0 bg-yellow-50 border-t border-dashed border-yellow-300 opacity-60"
                style={{ bottom: Math.round(tailMm * scale), height: tailPx }}
              />
            )}

            {/* Side margins */}
            {sideMm > 0 && (
              <>
                <div className="absolute top-0 bottom-0 left-0 bg-yellow-50 border-r border-dashed border-yellow-300 opacity-60"
                  style={{ width: printableLeft }} />
                <div className="absolute top-0 bottom-0 right-0 bg-yellow-50 border-l border-dashed border-yellow-300 opacity-60"
                  style={{ width: printableLeft }} />
              </>
            )}

            {/* Printable area outline — color changes per sheet_wise side */}
            <div
              className="absolute border border-dashed"
              style={{
                left: printableLeft, top: printableTop,
                width: printableW, height: printableH,
                borderColor: printMethod === 'sheet_wise'
                  ? (sheetSide === 'front' ? '#3B82F6' : '#EF4444')
                  : '#22C55E',
              }}
            />

            {/* W&T: vertical cut line + FRONT/BACK zone overlays */}
            {printMethod === 'work_and_turn' && (
              <>
                {/* FRONT zone overlay */}
                <div className="absolute pointer-events-none"
                  style={{
                    left: printableLeft, top: printableTop,
                    width: printableW / 2, height: printableH,
                    backgroundColor: 'rgba(34,197,94,0.06)',
                    borderRight: '1px solid rgba(34,197,94,0.3)',
                  }} />
                {/* BACK zone overlay */}
                <div className="absolute pointer-events-none"
                  style={{
                    left: printableLeft + printableW / 2, top: printableTop,
                    width: printableW / 2, height: printableH,
                    backgroundColor: 'rgba(249,115,22,0.06)',
                  }} />
                {/* Cut line */}
                <div className="absolute" style={{
                  left: printableLeft + printableW / 2 - 1, top: 0,
                  width: 3, height: previewH,
                  background: 'repeating-linear-gradient(to bottom, #EF4444 5px, transparent 5px, transparent 9px)',
                  opacity: 0.9,
                }}/>
                {/* Cut label */}
                <div className="absolute flex flex-col items-center"
                  style={{ left: printableLeft + printableW / 2 - 14, top: previewH / 2 - 16 }}>
                  <div style={{ fontSize: 14 }} className="text-red-500 font-bold">✂</div>
                  <div style={{ fontSize: 7, writingMode: 'vertical-rl', color: '#EF4444', fontWeight: 'bold' }}>ตัดที่นี่</div>
                </div>
                {/* FRONT label */}
                <div className="absolute font-bold bg-green-600 text-white rounded-r px-2 py-0.5 flex items-center gap-1"
                  style={{ left: printableLeft, top: printableTop + 6, fontSize: 9 }}>
                  🖨 ด้านหน้า FRONT
                </div>
                {/* BACK label */}
                <div className="absolute font-bold bg-orange-500 text-white rounded-l px-2 py-0.5 flex items-center gap-1"
                  style={{ right: previewW - (printableLeft + printableW) + 0, top: printableTop + 6, fontSize: 9 }}>
                  🔄 ด้านหลัง BACK
                </div>
                {/* Flip arrow */}
                <div className="absolute text-center font-bold text-blue-500"
                  style={{ left: printableLeft, bottom: 4, width: printableW, fontSize: 8 }}>
                  ↔ กลับกระดาษซ้าย↔ขวาแล้วพิมพ์รอบ 2 ด้วยแม่พิมพ์เดิม
                </div>
                {/* Gripper label (single edge) */}
                <div className="absolute left-0 right-0 flex items-center justify-center"
                  style={{ bottom: 0, height: gripPx > 0 ? gripPx : 12 }}>
                  <span style={{ fontSize: 7 }} className="text-yellow-700 font-medium">GRIPPER — ใช้ขอบเดียวกันทั้ง 2 รอบ</span>
                </div>
              </>
            )}

            {/* W&Tb: horizontal cut line + FRONT/BACK zone overlays */}
            {printMethod === 'work_and_tumble' && (
              <>
                {/* FRONT zone */}
                <div className="absolute pointer-events-none"
                  style={{
                    left: printableLeft, top: printableTop,
                    width: printableW, height: printableH / 2,
                    backgroundColor: 'rgba(34,197,94,0.06)',
                    borderBottom: '1px solid rgba(34,197,94,0.3)',
                  }} />
                {/* BACK zone */}
                <div className="absolute pointer-events-none"
                  style={{
                    left: printableLeft, top: printableTop + printableH / 2,
                    width: printableW, height: printableH / 2,
                    backgroundColor: 'rgba(249,115,22,0.06)',
                  }} />
                {/* Cut line */}
                <div className="absolute" style={{
                  left: 0, top: printableTop + printableH / 2 - 1,
                  width: previewW, height: 3,
                  background: 'repeating-linear-gradient(to right, #EF4444 5px, transparent 5px, transparent 9px)',
                  opacity: 0.9,
                }}/>
                <div className="absolute font-bold text-red-500 bg-white border border-red-300 rounded px-1"
                  style={{ left: previewW / 2 - 8, top: printableTop + printableH / 2 - 10, fontSize: 10 }}>✂</div>
                {/* Labels */}
                <div className="absolute font-bold bg-green-600 text-white rounded-b px-2 py-0.5"
                  style={{ left: printableLeft + 6, top: printableTop + 6, fontSize: 9 }}>🖨 ด้านหน้า FRONT</div>
                <div className="absolute font-bold bg-orange-500 text-white rounded-t px-2 py-0.5"
                  style={{ left: printableLeft + 6, top: printableTop + printableH / 2 + 6, fontSize: 9 }}>🔄 ด้านหลัง BACK (กลับหัว-ท้าย)</div>
                {/* Flip arrow */}
                <div className="absolute font-bold text-blue-500 text-center"
                  style={{ right: 4, top: printableTop, height: printableH, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexDirection: 'column' }}>
                  <span>↕</span><span style={{ writingMode: 'vertical-rl', fontSize: 7 }}>กลับหัว-ท้าย</span>
                </div>
                {/* Double gripper indicator */}
                <div className="absolute left-0 right-0 bg-orange-200 border-t-2 border-dashed border-orange-400 flex items-center justify-center"
                  style={{ bottom: 0, height: Math.max(gripPx, 10) }}>
                  <span style={{ fontSize: 7 }} className="text-orange-700 font-medium">GRIPPER ล่าง (รอบ 2)</span>
                </div>
              </>
            )}

            {/* single_side: badge */}
            {printMethod === 'single_side' && (
              <div className="absolute text-xs font-bold bg-emerald-600 text-white rounded px-1.5 py-0.5"
                style={{ left: printableLeft + 4, top: printableTop + 4, fontSize: 9 }}>หน้าเดียว</div>
            )}

            {/* sheet_wise: side badge */}
            {printMethod === 'sheet_wise' && (
              <div className="absolute text-xs font-bold text-white rounded px-1.5 py-0.5"
                style={{
                  left: printableLeft + 4, top: printableTop + 4, fontSize: 9,
                  backgroundColor: sheetSide === 'front' ? '#3B82F6' : '#EF4444',
                }}>
                {sheetSide === 'front' ? 'กรอบที่ 1 — หน้า' : 'กรอบที่ 2 — หลัง'}
              </div>
            )}

            {/* perfecting: badge */}
            {printMethod === 'perfecting' && (
              <div className="absolute text-xs font-bold bg-red-600 text-white rounded px-1.5 py-0.5"
                style={{ left: printableLeft + 4, top: printableTop + 4, fontSize: 9 }}>PERF — 2 หน้าพร้อมกัน</div>
            )}

            {/* Column dividers — only for ColumnStrip strategy */}
            {isColumnStrip && colConfig && colConfig.cols && (() => {
              let xOffset = 0;
              return colConfig.cols.map((colW, i) => {
                const divX = Math.round((offsetX + xOffset) * scale);
                const labelX = Math.round((offsetX + xOffset + colW / 2) * scale);
                xOffset += colW;
                return (
                  <React.Fragment key={i}>
                    {/* Column label */}
                    <div className="absolute text-center font-medium text-gray-400 pointer-events-none"
                      style={{ left: labelX - 30, top: printableTop + 2, width: 60, fontSize: 8, zIndex: 5 }}>
                      Col {i+1} ({Math.round(colW)}mm)
                    </div>
                    {/* Vertical divider line (not for last column) */}
                    {i < colConfig.cols.length - 1 && (
                      <div className="absolute pointer-events-none"
                        style={{
                          left: Math.round((offsetX + xOffset) * scale),
                          top: printableTop,
                          width: 1,
                          height: printableH,
                          background: 'repeating-linear-gradient(to bottom, #9CA3AF 4px, transparent 4px, transparent 8px)',
                          opacity: 0.7,
                          zIndex: 4,
                        }} />
                    )}
                  </React.Fragment>
                );
              });
            })()}

            {/* No jobs placeholder */}
            {items.length === 0 && (
              <div
                className="absolute flex items-center justify-center text-gray-300 text-xs"
                style={{ left: printableLeft, top: printableTop, width: printableW, height: printableH }}
              >
                พื้นที่วางงาน
              </div>
            )}

            {/* Job blocks — render each placement from MaxRects */}
            {items.map((it, idx) => {
              const color = JOB_COLORS[idx % JOB_COLORS.length];
              const canPlace = (it.up_per_sheet || 0) > 0;

              // Reconstruct placements from cols/rows if allPlacements not available (e.g. loaded from DB)
              let placements = it.allPlacements || [];
              if (placements.length === 0 && canPlace && (it.box_width || 0) > 0 && (it.box_height || 0) > 0) {
                const spacingMm = layoutSettings?.spacingMm ?? 3;
                const jw = it.final_w_mm || it.final_size_w || 0;
                const jh = it.final_h_mm || it.final_size_h || 0;
                const cols = it.cols || Math.max(1, Math.floor((it.box_width + spacingMm) / (jw + spacingMm)));
                const rows = it.rows || Math.max(1, Math.floor((it.box_height + spacingMm) / (jh + spacingMm)));
                const up = it.up_per_sheet || 1;
                let count = 0;
                for (let r = 0; r < rows && count < up; r++) {
                  for (let c = 0; c < cols && count < up; c++) {
                    placements.push({
                      x: (it.pos_x || 0) + c * (jw + spacingMm),
                      y: (it.pos_y || 0) + r * (jh + spacingMm),
                      w: jw, h: jh,
                    });
                    count++;
                  }
                }
              }

              if (placements.length === 0) {
                if (!canPlace) return null;
                // Last resort: show bounding box
                const bw = Math.round((it.box_width || 0) * scale);
                const bh = Math.round((it.box_height || 0) * scale);
                if (bw < 2 || bh < 2) return null;
                return (
                  <div key={it.job_id || idx} className="absolute border-2 flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      left: Math.round((it.pos_x || 0) * scale),
                      top: Math.round((it.pos_y || 0) * scale),
                      width: bw, height: bh,
                      backgroundColor: color + 'aa',
                      borderColor: color,
                    }}>
                    {it.job_number}
                  </div>
                );
              }

              return placements.map((p, pi) => {
                const px = Math.round(p.x * scale);
                const py = Math.round(p.y * scale);
                const pw2 = Math.round(p.w * scale);
                const ph2 = Math.round(p.h * scale);
                if (pw2 < 2 || ph2 < 2) return null;
                const isFirst = pi === 0;
                const isBack = p.zone === 'back' || p.rotate180;
                const fontSize = Math.max(7, Math.min(11, Math.min(pw2, ph2) / 5));
                const bgOpacity = isBack ? 'aa' : 'cc';
                return (
                  <div
                    key={`${it.job_id || idx}-${pi}`}
                    className="absolute border overflow-hidden"
                    style={{
                      left: px, top: py,
                      width: pw2 - 1, height: ph2 - 1,
                      backgroundColor: color + bgOpacity,
                      borderColor: color,
                      borderStyle: isBack ? 'dashed' : 'solid',
                    }}
                  >
                    {isFirst && pw2 > 20 && ph2 > 14 && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none"
                        style={{ fontSize }}
                      >
                        <div className="font-bold drop-shadow leading-tight truncate px-0.5 text-center">{it.product_name || it.job_number}</div>
                        {ph2 > 28 && <div className="opacity-80 drop-shadow leading-tight text-center truncate px-0.5">#{it.job_number}</div>}
                        {ph2 > 40 && <div className="opacity-90 drop-shadow leading-tight">{it.up_per_sheet} up</div>}
                      </div>
                    )}
                    {/* 180° badge for BACK zone items */}
                    {isBack && pw2 > 16 && ph2 > 12 && (
                      <div className="absolute top-0.5 right-0.5 bg-orange-500 text-white rounded leading-none font-bold"
                        style={{ fontSize: 6, padding: '1px 2px' }}>↻180°</div>
                    )}
                    {/* 90° rotation badge */}
                    {p.rotated && !isBack && pw2 > 16 && ph2 > 12 && (
                      <div className="absolute top-0.5 right-0.5 bg-amber-500 text-white rounded leading-none font-bold"
                        style={{ fontSize: 6, padding: '1px 2px' }}>↺90°</div>
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* Legend */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 justify-center">
              {items.map((it, idx) => {
                const hasRotation = it.rotated || (it.allPlacements || []).some(p => p.rotated);
                return (
                  <div key={it.job_id || idx} className="flex items-center gap-1 text-xs text-gray-600">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: JOB_COLORS[idx % JOB_COLORS.length] }} />
                    <span className="font-mono">{it.product_name || it.job_number}</span>
                    <span className="text-gray-400 font-mono"> #{it.job_number}</span>
                    <span className="text-gray-400">×{it.up_per_sheet}</span>
                    {hasRotation && <span className="text-amber-500 font-bold">↺90°</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Strategy Info Panel */}
          {strategyName && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs">
              <div className="font-bold text-emerald-700 mb-1">
                ✅ Strategy: {isColumnStrip ? 'Column Strip Packing' : 'MaxRects BSSF'}
              </div>
              {isColumnStrip && colConfig && (
                <div className="text-emerald-600 space-y-0.5">
                  <div>{colConfig.cols.length} คอลัมน์: {colConfig.cols.map(w => `${Math.round(w)}mm`).join(' + ')}</div>
                  {rotatedJobs.length > 0 && (
                    <div>↺ หมุน 90°: {rotatedJobs.map(j => j.job_number || j.product_name).join(', ')}</div>
                  )}
                  {columnUsage && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {columnUsage.map((col, i) => (
                        <div key={i} className="bg-emerald-100 rounded px-2 py-0.5 text-emerald-700">
                          Col {i+1}: {Math.round(col.usedH)}/{Math.round(col.totalH)}mm ({col.pct}%)
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-emerald-700 font-medium">พื้นที่ใช้: {areaUsage.toFixed(1)}% | {items.filter(it => (it.up_per_sheet || 0) > 0).length}/{items.length} งานได้วาง ✓</div>
                </div>
              )}
              {!isColumnStrip && (
                <div className="text-emerald-600">{strategyName}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, color, icon }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <div className={`border rounded-lg px-3 py-2 ${colors[color] || colors.gray}`}>
      <div className="text-xs text-current opacity-70">{label}</div>
      <div className="font-bold text-sm flex items-center gap-1 mt-0.5">
        {icon}{value}
      </div>
    </div>
  );
}