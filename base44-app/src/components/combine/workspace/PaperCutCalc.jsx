import React, { useState, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Scissors, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

// ขนาดกระดาษมาตรฐาน (นิ้ว)
const STANDARD_SIZES_INCH = [
  '25x36', '31x43', '24x35', '28x40', '20x28', '18x25', '17x24'
];

function parseSize(str) {
  if (!str) return null;
  const parts = str.split('x').map(n => parseFloat(n));
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { w: parts[0], h: parts[1] };
}

function calcCuts(sheetW, sheetH, cutW, cutH) {
  if (!sheetW || !sheetH || !cutW || !cutH || cutW <= 0 || cutH <= 0) return null;
  const a = Math.floor(sheetW / cutW) * Math.floor(sheetH / cutH);
  const b = Math.floor(sheetW / cutH) * Math.floor(sheetH / cutW);
  if (a === 0 && b === 0) return null;
  const best = Math.max(a, b);
  const rotated = b > a;
  const cols = rotated ? Math.floor(sheetW / cutH) : Math.floor(sheetW / cutW);
  const rows = rotated ? Math.floor(sheetH / cutW) : Math.floor(sheetH / cutH);
  const usedW = rotated ? cols * cutH : cols * cutW;
  const usedH = rotated ? rows * cutW : rows * cutH;
  const wasteW = sheetW - usedW;
  const wasteH = sheetH - usedH;
  const usagePercent = (best * (cutW * cutH)) / (sheetW * sheetH) * 100;
  return { count: best, cols, rows, rotated, wasteW, wasteH, usagePercent };
}

/**
 * sourceSizeInch: ขนาดกระดาษที่เลือกด้านบน เช่น "31x43" (นิ้ว) → ใช้เป็น default
 * onConfirm(sizeStr): callback เมื่อกดยืนยันใช้ขนาดที่ผ่าแล้ว
 */
export default function PaperCutCalc({ sourceSizeInch, onConfirm }) {
  const [open, setOpen] = useState(false);
  const [sourceSize, setSourceSize] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [targetW, setTargetW] = useState('');
  const [targetH, setTargetH] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // เมื่อ sourceSizeInch (จากด้านบน) เปลี่ยน → set เป็นค่า default ของเครื่องคิดเลข
  useEffect(() => {
    if (sourceSizeInch && STANDARD_SIZES_INCH.includes(sourceSizeInch)) {
      setSourceSize(sourceSizeInch);
    } else if (sourceSizeInch) {
      // ขนาด custom
      setSourceSize('__custom__');
      setCustomSource(sourceSizeInch);
    }
  }, [sourceSizeInch]);

  const sheetStr = sourceSize === '__custom__' ? customSource : sourceSize;
  const sheet = parseSize(sheetStr);
  const cut = parseSize(`${targetW}x${targetH}`);

  const result = useMemo(() => {
    if (!sheet || !cut) return null;
    return calcCuts(sheet.w, sheet.h, cut.w, cut.h);
  }, [sheet, cut]);

  const handleConfirm = () => {
    if (!result || !targetW || !targetH) return;
    const sizeStr = `${targetW}x${targetH}`;
    onConfirm && onConfirm(sizeStr);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2500);
  };

  // รวม sizes: standard + sourceSizeInch ที่ไม่ได้อยู่ใน standard
  const sizeOptions = useMemo(() => {
    const set = new Set(STANDARD_SIZES_INCH);
    if (sourceSizeInch && !set.has(sourceSizeInch) && sourceSizeInch.includes('x')) {
      return [sourceSizeInch, ...STANDARD_SIZES_INCH];
    }
    return STANDARD_SIZES_INCH;
  }, [sourceSizeInch]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wide hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-gray-500" />
          เครื่องคิดเลขผ่ากระดาษ
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Source paper size */}
          <div>
            <label className="text-xs text-gray-400 mb-0.5 block">
              ขนาดกระดาษตั้งต้น (นิ้ว)
              {sourceSizeInch && (
                <span className="ml-1.5 text-blue-500">← จากที่เลือก: {sourceSizeInch}"</span>
              )}
            </label>
            <Select value={sourceSize} onValueChange={setSourceSize}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="เลือกขนาดแผ่นใหญ่..." />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map(s => (
                  <SelectItem key={s} value={s}>{s} นิ้ว</SelectItem>
                ))}
                <SelectItem value="__custom__">กำหนดเอง...</SelectItem>
              </SelectContent>
            </Select>
            {sourceSize === '__custom__' && (
              <Input
                className="h-7 text-xs mt-1"
                placeholder="เช่น 31x43"
                value={customSource}
                onChange={e => setCustomSource(e.target.value)}
              />
            )}
          </div>

          {/* Target cut size */}
          <div>
            <label className="text-xs text-gray-400 mb-0.5 block">ขนาดที่ต้องการผ่า (นิ้ว)</label>
            <div className="flex gap-1 items-center">
              <Input
                className="h-7 text-xs"
                placeholder="กว้าง"
                value={targetW}
                onChange={e => { setTargetW(e.target.value); setConfirmed(false); }}
              />
              <span className="text-gray-400 text-xs">×</span>
              <Input
                className="h-7 text-xs"
                placeholder="สูง"
                value={targetH}
                onChange={e => { setTargetH(e.target.value); setConfirmed(false); }}
              />
            </div>
          </div>

          {/* Result */}
          {result ? (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ได้จำนวน</span>
                <span className="text-sm font-bold text-gray-900">{result.count} ชิ้น</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">แถว × คอลัมน์</span>
                <span className="text-xs font-medium text-gray-700">{result.rows} × {result.cols}</span>
              </div>
              {result.rotated && (
                <div className="text-xs text-blue-600">⟳ หมุน 90° เพื่อได้มากขึ้น</div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">เปอร์เซ็นต์ใช้งาน</span>
                <span className={`text-xs font-semibold ${result.usagePercent >= 70 ? 'text-emerald-600' : result.usagePercent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {result.usagePercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">เศษกระดาษ</span>
                <span className="text-xs text-gray-500">
                  {result.wasteW.toFixed(2)} × {result.wasteH.toFixed(2)} นิ้ว
                </span>
              </div>

              {/* Confirm button */}
              {onConfirm && (
                <Button
                  size="sm"
                  className={`w-full h-7 text-xs mt-1 gap-1.5 transition-colors ${confirmed ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
                  onClick={handleConfirm}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {confirmed ? `✓ ใช้ขนาด ${targetW}×${targetH} นิ้ว แล้ว` : `ยืนยัน — ใช้ขนาด ${targetW}×${targetH} นิ้ว`}
                </Button>
              )}
            </div>
          ) : sheet && cut ? (
            <div className="text-xs text-red-500 bg-red-50 rounded px-3 py-2">
              ขนาดที่กรอกใหญ่กว่าแผ่นกระดาษ หรือข้อมูลไม่ถูกต้อง
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}