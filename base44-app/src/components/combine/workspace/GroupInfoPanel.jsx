import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Parse ขนาด (นิ้ว) และ GSM จากชื่อวัตถุดิบ
 * เช่น "กระดาษอาร์ตมัน 90g 25x36" → { gsm: 90, sizeInch: "25x36" }
 * เช่น "อาร์ตการ์ด Hi-kote C2/S 190g 31x43" → { gsm: 190, sizeInch: "31x43" }
 */
function parseMaterialName(name) {
  if (!name) return {};
  // หา GSM: ตัวเลขตามด้วย g
  const gsmMatch = name.match(/(\d+)\s*g(?:\/m²)?(?:\b|$)/i);
  const gsm = gsmMatch ? parseInt(gsmMatch[1]) : null;
  // หาขนาดนิ้ว: ตัวเลขxตัวเลข ที่อยู่หลังสุดในชื่อ (เป็นนิ้ว)
  const sizeMatches = [...name.matchAll(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/g)];
  let sizeInch = null;
  if (sizeMatches.length > 0) {
    const last = sizeMatches[sizeMatches.length - 1];
    sizeInch = `${last[1]}x${last[2]}`;
  }
  return { gsm, sizeInch };
}

// ขนาดกระดาษมาตรฐาน (นิ้ว)
const PAPER_SIZES_INCH = [
  '25x36', '31x43', '24x35', '28x40', '20x28', '18x25', '17x24'
];

export default function GroupInfoPanel({
  groupCode, groupName, setGroupName,
  paperType, setPaperType,
  gsm, setGsm,
  paperSize, setPaperSize,
  machineId, setMachineId,
  plannedDate, setPlannedDate,
  note, setNote,
  machines,
  materials = [],
}) {
  const paperMaterials = materials.filter(m => m.type === 'paper');

  // เมื่อเลือกประเภทกระดาษ → parse GSM + ขนาด (นิ้ว) จากชื่อ แล้วใส่อัตโนมัติ
  const handleSelectPaperType = (name) => {
    setPaperType(name);
    const { gsm: parsedGsm, sizeInch } = parseMaterialName(name);
    if (parsedGsm) setGsm(String(parsedGsm));
    if (sizeInch) setPaperSize(sizeInch);
  };

  // GSM options ของ material ที่เลือก (ถ้ามี)
  const gsmOptions = useMemo(() => {
    const filtered = paperType
      ? paperMaterials.filter(m => m.name === paperType)
      : paperMaterials;
    const set = new Set(filtered.map(m => {
      const { gsm } = parseMaterialName(m.name);
      return gsm;
    }).filter(Boolean));
    return Array.from(set).sort((a, b) => a - b);
  }, [paperMaterials, paperType]);

  // รวม paper sizes จาก material names + standard
  const allPaperSizes = useMemo(() => {
    const fromMaterials = new Set();
    paperMaterials.forEach(m => {
      const { sizeInch } = parseMaterialName(m.name);
      if (sizeInch) fromMaterials.add(sizeInch);
    });
    const combined = [...fromMaterials, ...PAPER_SIZES_INCH.filter(s => !fromMaterials.has(s))];
    return combined;
  }, [paperMaterials]);

  const isCustomSize = paperSize && !allPaperSizes.includes(paperSize);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">ข้อมูลกลุ่มเลย์รวม</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">รหัสกลุ่ม</label>
          <div className="h-7 px-2 flex items-center text-xs font-mono bg-gray-50 border border-gray-200 rounded text-gray-500">
            {groupCode}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">ชื่อกลุ่ม</label>
          <Input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="h-7 text-xs"
            placeholder="ชื่อกลุ่ม (optional)"
          />
        </div>

        {/* ประเภทกระดาษ */}
        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-0.5 block">ประเภทกระดาษ <span className="text-red-500">*</span></label>
          {paperMaterials.length > 0 ? (
            <Select value={paperType} onValueChange={handleSelectPaperType}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="เลือก..." /></SelectTrigger>
              <SelectContent>
                {paperMaterials.map(m => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={paperType}
              onChange={e => setPaperType(e.target.value)}
              className="h-7 text-xs"
              placeholder="ระบุประเภทกระดาษ..."
            />
          )}
        </div>

        {/* แกรม */}
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">แกรม (g/m²)</label>
          {gsmOptions.length > 1 ? (
            <Select value={gsm} onValueChange={setGsm}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="เลือก..." /></SelectTrigger>
              <SelectContent>
                {gsmOptions.map(g => (
                  <SelectItem key={g} value={String(g)}>{g} g</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={gsm}
              onChange={e => setGsm(e.target.value)}
              className="h-7 text-xs"
              placeholder="เช่น 120"
              type="number"
            />
          )}
        </div>

        {/* ขนาดกระดาษ (นิ้ว) */}
        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">ขนาดกระดาษ (นิ้ว) <span className="text-red-500">*</span></label>
          <Select value={paperSize} onValueChange={setPaperSize}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="เลือก..." /></SelectTrigger>
            <SelectContent>
              {allPaperSizes.map(s => <SelectItem key={s} value={s}>{s} นิ้ว</SelectItem>)}
              {isCustomSize && <SelectItem value={paperSize}>{paperSize} นิ้ว (ผ่าแล้ว)</SelectItem>}
            </SelectContent>
          </Select>
          {isCustomSize && (
            <div className="text-xs text-blue-600 mt-0.5">📐 จากการผ่ากระดาษ</div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-0.5 block">เครื่องพิมพ์ <span className="text-red-500">*</span></label>
          <Select value={machineId} onValueChange={setMachineId}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="เลือก..." /></SelectTrigger>
            <SelectContent>
              {machines.filter(m => m.type === 'printing').map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-0.5 block">วันผลิตที่วางแผน</label>
          <Input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="h-7 text-xs" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-0.5 block">หมายเหตุ</label>
          <Input value={note} onChange={e => setNote(e.target.value)} className="h-7 text-xs" placeholder="หมายเหตุ..." />
        </div>
      </div>
    </div>
  );
}