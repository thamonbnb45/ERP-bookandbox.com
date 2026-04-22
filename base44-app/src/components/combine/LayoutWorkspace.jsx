import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  X, Save, Loader2, Wand2, RotateCcw, Zap, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

import GroupInfoPanel from './workspace/GroupInfoPanel';
import LayoutSettingsPanel from './workspace/LayoutSettingsPanel';
import JobItemsTable from './workspace/JobItemsTable';
import RealLayoutPreview from './workspace/RealLayoutPreview';
import PrintMethodPanel from './workspace/PrintMethodPanel';

import PaperCutCalc from './workspace/PaperCutCalc';
import { generateGroupCode, calcCostSharePercents } from '@/utils/combineUtils';
import { useQuery } from '@tanstack/react-query';
import {
  parsePaperSizeMm, autoLayoutEngine, calcGroupSummary,
  calcAreaUsage, generateWarnings
} from '@/utils/layoutEngine';
import { PRINT_METHODS, calcSheetsForMethod, validatePrintMethod } from '@/utils/printMethod';
import {
  autoLayoutWorkAndTurn,
  autoLayoutWorkAndTumble,
  validateWorkAndTurnLayout,
  detectLayoutPattern,
} from '@/utils/workAndTurnEngine';

const DEFAULT_LAYOUT_SETTINGS = {
  gripMm: 10,
  headMm: 5,
  tailMm: 5,
  sideMm: 5,
  bleedMm: 3,
  spacingMm: 3,
  sheetCalcMethod: 'max',
  fixedSheetCount: 500,
  costMethod: 'area',
};

function initItemsFromJobs(selectedJobs, bleedMm = 3) {
  return selectedJobs.map(j => {
    const wMm = j.final_size_w ? j.final_size_w + bleedMm * 2 : 100 + bleedMm * 2;
    const hMm = j.final_size_h ? j.final_size_h + bleedMm * 2 : 150 + bleedMm * 2;
    return {
      job_id: j.id,
      job_number: j.job_number,
      customer_name: j.customer_name || '',
      product_name: j.product_name || j.product_type || '',
      qty: j.quantity || 0,
      waste_qty: Math.ceil((j.quantity || 0) * 0.05),
      final_w_mm: wMm,
      final_h_mm: hMm,
      rotate_allowed: true,
      note: '',
      up_per_sheet: 0, cols: 0, rows: 0, rotated: false,
      pos_x: 0, pos_y: 0, box_width: 0, box_height: 0,
      got_total: 0, diff: 0, area_percent: 0, cost_share_percent: 0,
    };
  });
}

// Map saved CombineItems back to workspace item format
function initItemsFromExisting(existingItems) {
  return existingItems.map(it => ({
    job_id: it.job_id,
    job_number: it.job_number,
    customer_name: it.customer_name || '',
    product_name: it.product_name || '',
    qty: it.qty || 0,
    waste_qty: it.waste_qty || 0,
    final_w_mm: it.final_size_w || 100,
    final_h_mm: it.final_size_h || 150,
    rotate_allowed: it.rotate_allowed !== false,
    note: it.note || '',
    up_per_sheet: it.up_per_sheet || 0,
    cols: it.cols || 0,
    rows: it.rows || 0,
    rotated: false,
    pos_x: it.pos_x || 0,
    pos_y: it.pos_y || 0,
    box_width: it.box_width || 0,
    box_height: it.box_height || 0,
    area_percent: it.area_percent || 0,
    cost_share_percent: it.cost_share_percent || 0,
    got_total: 0, diff: 0,
    // Mark all as manual so recalc won't override saved layout on open
    _manual_up: true,
    // keep DB id for update
    _db_id: it.id,
  }));
}

export default function LayoutWorkspace({ selectedJobs, machines, onClose, onCreated, existingGroup, existingItems }) {
  const { toast } = useToast();
  const isEditMode = !!existingGroup;
  const firstJob = selectedJobs?.[0] || {};

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const [saving, setSaving] = useState(false);
  const [groupCode] = useState(() => isEditMode ? existingGroup.group_code : generateGroupCode());
  const [groupName, setGroupName] = useState(isEditMode ? existingGroup.group_name || '' : '');
  const [paperType, setPaperType] = useState(isEditMode ? existingGroup.paper_type || '' : firstJob.paper || '');
  const [gsm, setGsm] = useState(isEditMode ? String(existingGroup.gsm || '') : firstJob.gsm ? String(firstJob.gsm) : '');
  const [paperSize, setPaperSize] = useState(isEditMode ? existingGroup.paper_size || '' : firstJob.paper_size || '');
  const [machineId, setMachineId] = useState(isEditMode ? existingGroup.machine_id || '' : firstJob.printing_machine_id || '');
  const [plannedDate, setPlannedDate] = useState(isEditMode ? existingGroup.planned_date || moment().add(1, 'day').format('YYYY-MM-DD') : moment().add(1, 'day').format('YYYY-MM-DD'));
  const [note, setNote] = useState(isEditMode ? existingGroup.note || '' : '');
  const [layoutSettings, setLayoutSettings] = useState(DEFAULT_LAYOUT_SETTINGS);
  const [items, setItems] = useState(() =>
    isEditMode
      ? initItemsFromExisting(existingItems || [])
      : initItemsFromJobs(selectedJobs || [], DEFAULT_LAYOUT_SETTINGS.bleedMm)
  );
  const [customCostPercents, setCustomCostPercents] = useState({});
  const [printMethod, setPrintMethod] = useState(isEditMode ? existingGroup.print_method || 'single_side' : 'single_side');
  const [pendingMethodChange, setPendingMethodChange] = useState(null); // { from, to }
  // Track if we've mounted — skip the first recalc in edit mode to preserve saved layout
  const isMountedRef = useRef(false);

  // ============================
  // Core calculation engine
  // ============================
  const recalculate = useCallback((currentItems, currentPaperSize, currentSettings, method) => {
    if (!currentPaperSize || currentItems.length === 0) return currentItems;
    const { w: rawW, h: rawH } = parsePaperSizeMm(currentPaperSize);
    const paperW = rawH > rawW ? rawH : rawW;
    const paperH = rawH > rawW ? rawW : rawH;

    // 1. Choose layout engine based on print method
    let laid;
    if (method === 'work_and_turn') {
      laid = autoLayoutWorkAndTurn(currentItems, paperW, paperH, currentSettings);
    } else if (method === 'work_and_tumble') {
      laid = autoLayoutWorkAndTumble(currentItems, paperW, paperH, currentSettings);
    } else {
      laid = autoLayoutEngine(currentItems, paperW, paperH, currentSettings);
    }

    // 2. Group summary (sheets, got_total, diff)
    const summary = calcGroupSummary(laid, currentSettings);
    if (!summary) return laid;
    const withSummary = summary.items;

    // 3. Cost share
    if (currentSettings.costMethod !== 'custom') {
      const costPercents = calcCostSharePercents(withSummary, currentSettings.costMethod);
      return withSummary.map((it, i) => ({ ...it, cost_share_percent: costPercents[i] }));
    }
    return withSummary;
  }, []);

  // Trigger recalc whenever critical inputs change
  // In edit mode, skip the very first run so we preserve the saved layout
  useEffect(() => {
    if (!paperSize) return;
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      if (isEditMode) return; // don't recalc on first mount in edit mode
    }
    setItems(prev => recalculate(prev, paperSize, layoutSettings, printMethod));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperSize, layoutSettings, printMethod]);

  // ============================
  // Derived values
  // ============================
  const { w: rawW, h: rawH } = paperSize ? parsePaperSizeMm(paperSize) : { w: 650, h: 920 };
  // ใช้ landscape เสมอ (เหมือน preview)
  const paperW = rawH > rawW ? rawH : rawW;
  const paperH = rawH > rawW ? rawW : rawH;
  const machine = machines.find(m => m.id === machineId);

  // ============================
  // Handlers
  // ============================
  const handleAutoLayout = () => {
    if (!paperSize) return;
    let resultItems;
    setItems(prev => {
      const reset = prev.map(it => ({ ...it, _manual_up: false }));
      resultItems = recalculate(reset, paperSize, layoutSettings, printMethod);
      return resultItems;
    });
    const isWT = printMethod === 'work_and_turn' || printMethod === 'work_and_tumble';
    setTimeout(() => {
      // Read strategy from result after state settles
      const strategy = resultItems?.find(it => it._strategy)?._strategy;
      const failedJobs = resultItems?.filter(it => (it.up_per_sheet || 0) === 0).map(it => it.job_number);
      if (failedJobs?.length > 0) {
        toast({
          title: '⚠️ บางงานวางไม่ได้',
          description: `${failedJobs.join(', ')} — พิจารณาเปลี่ยนกระดาษหรือตัดงานออก`,
          duration: 4000,
        });
      } else {
        toast({
          title: isWT ? '✅ จัดวางแบบ W&T สำเร็จ' : `✅ Auto Best Fit สำเร็จ`,
          description: strategy ? `Strategy: ${strategy}` : (isWT ? 'ทุก job ได้ทั้ง FRONT และ BACK' : undefined),
          duration: 2500,
        });
      }
    }, 100);
  };

  const handleRotateAll = () => {
    setItems(prev => {
      const toggled = prev.map(it => ({ ...it, rotate_allowed: true }));
      return recalculate(toggled, paperSize, layoutSettings, printMethod);
    });
  };

  const handleUpdateItem = (idx, updated) => {
    setItems(prev => {
      const next = prev.map((it, i) => i === idx ? updated : it);
      return recalculate(next, paperSize, layoutSettings, printMethod);
    });
  };

  const handleRemoveItem = (idx) => {
    setItems(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return recalculate(next, paperSize, layoutSettings, printMethod);
    });
  };

  // Handle print method change with smart confirm
  const handleMethodChange = (newMethod) => {
    const isWTNew = newMethod === 'work_and_turn' || newMethod === 'work_and_tumble';
    const isWTOld = printMethod === 'work_and_turn' || printMethod === 'work_and_tumble';
    if (isWTNew || isWTOld) {
      setPendingMethodChange({ from: printMethod, to: newMethod });
    } else {
      setPrintMethod(newMethod);
    }
  };

  const confirmMethodChange = (autoRelayout = false) => {
    if (!pendingMethodChange) return;
    setPrintMethod(pendingMethodChange.to);
    if (autoRelayout) {
      // จัดวางใหม่หลัง state update
      setTimeout(() => {
        setItems(prev => {
          const reset = prev.map(it => ({ ...it, _manual_up: false }));
          return recalculate(reset, paperSize, layoutSettings, pendingMethodChange.to);
        });
      }, 50);
    }
    setPendingMethodChange(null);
  };

  const handleLayoutSettingsChange = (newSettings) => {
    setLayoutSettings(newSettings);
    // recalc via useEffect
  };

  const handleCustomCostChange = (jobId, val) => {
    setCustomCostPercents(prev => ({ ...prev, [jobId]: val }));
  };

  // Apply custom percents to items when costMethod === 'custom'
  const displayItems = layoutSettings.costMethod === 'custom'
    ? items.map(it => ({ ...it, cost_share_percent: parseFloat(customCostPercents[it.job_id] ?? 0) || 0 }))
    : items;

  const summary = useMemo(() => calcGroupSummary(displayItems, layoutSettings), [displayItems, layoutSettings]);
  const totalSheets = summary?.totalSheets || 0;
  const areaUsage = useMemo(() => calcAreaUsage(displayItems, paperW, paperH, layoutSettings), [displayItems, paperW, paperH, layoutSettings]);
  const methodWarnings = useMemo(() => validatePrintMethod(printMethod, displayItems), [printMethod, displayItems]);
  const wtLayoutWarnings = useMemo(() =>
    (printMethod === 'work_and_turn' || printMethod === 'work_and_tumble')
      ? validateWorkAndTurnLayout(displayItems, paperW, paperH, layoutSettings, printMethod)
      : [],
    [printMethod, displayItems, paperW, paperH, layoutSettings]
  );
  const warnings = useMemo(() => [
    ...generateWarnings(displayItems, paperW, paperH, layoutSettings),
    ...methodWarnings,
    ...wtLayoutWarnings,
  ], [displayItems, paperW, paperH, layoutSettings, methodWarnings, wtLayoutWarnings]);

  // Detect layout pattern conflict
  const layoutPattern = useMemo(() =>
    detectLayoutPattern(displayItems, paperW, paperH, layoutSettings),
    [displayItems, paperW, paperH, layoutSettings]
  );
  const showWTConflict = (printMethod === 'work_and_turn' || printMethod === 'work_and_tumble') && layoutPattern === 'sheet_wise' && displayItems.length > 1;
  const showSWConflict = printMethod === 'sheet_wise' && layoutPattern === 'mirror_vertical' && displayItems.length > 0;
  const currentMethod = PRINT_METHODS[printMethod] || PRINT_METHODS.single_side;

  // ============================
  // Save
  // ============================
  const handleSave = async () => {
    if (!paperType || !paperSize || !machineId) {
      toast({ title: 'กรุณากรอกข้อมูลให้ครบ', description: 'ประเภทกระดาษ, ขนาด และเครื่องพิมพ์', variant: 'destructive', duration: 3000 });
      return;
    }
    if (items.length < 1) {
      toast({ title: 'ต้องมีงานอย่างน้อย 1 งาน', variant: 'destructive', duration: 3000 });
      return;
    }

    setSaving(true);

    const groupData = {
      group_name: groupName || `${paperType} ${gsm}g ${paperSize}`,
      paper_type: paperType,
      gsm: parseFloat(gsm) || 0,
      paper_size: paperSize,
      machine_id: machineId,
      machine_name: machine?.name || '',
      planned_date: plannedDate,
      print_method: printMethod,
      plate_sets_required: currentMethod.plateSets,
      cutting_instruction: currentMethod.cuttingInstruction,
      cost_share_method: layoutSettings.costMethod,
      total_sheet_count: totalSheets,
      area_usage_percent: areaUsage,
      note,
    };

    const itemPayloads = (groupId, code) => displayItems.map(it => ({
      group_id: groupId,
      group_code: code,
      job_id: it.job_id,
      job_number: it.job_number,
      customer_name: it.customer_name,
      product_name: it.product_name,
      final_size_w: it.final_w_mm,
      final_size_h: it.final_h_mm,
      qty: it.qty,
      waste_qty: it.waste_qty,
      up_per_sheet: it.up_per_sheet,
      planned_sheet_count: it.needed_sheets || totalSheets,
      area_percent: it.area_percent || 0,
      cost_share_percent: it.cost_share_percent || 0,
      rotate_allowed: it.rotate_allowed,
      pos_x: it.pos_x || 0,
      pos_y: it.pos_y || 0,
      box_width: it.box_width || 0,
      box_height: it.box_height || 0,
      cols: it.cols || 0,
      rows: it.rows || 0,
      note: it.note || '',
    }));

    if (isEditMode) {
      // UPDATE existing group
      const historyEntry = {
        action: 'edited',
        timestamp: new Date().toISOString(),
        detail: `แก้ไขเลย์รวม ${items.length} งาน | วางเลย์ ${areaUsage.toFixed(1)}% | ${totalSheets} ใบ`,
      };
      await base44.entities.CombineGroup.update(existingGroup.id, {
        ...groupData,
        history_log: [...(existingGroup.history_log || []), historyEntry],
      });

      // Delete old items and re-create
      await Promise.all((existingItems || []).map(it => base44.entities.CombineItem.delete(it.id)));
      await base44.entities.CombineItem.bulkCreate(itemPayloads(existingGroup.id, existingGroup.group_code));

      toast({ title: 'แก้ไขกลุ่มเลย์รวมสำเร็จ', description: `รหัส: ${existingGroup.group_code}`, duration: 3000 });
    } else {
      // CREATE new group
      const group = await base44.entities.CombineGroup.create({
        group_code: groupCode,
        ...groupData,
        status: 'draft',
        history_log: [{
          action: 'created',
          timestamp: new Date().toISOString(),
          detail: `สร้างกลุ่มเลย์รวม ${items.length} งาน | วางเลย์ ${areaUsage.toFixed(1)}% | ${totalSheets} ใบ`,
        }],
      });
      await base44.entities.CombineItem.bulkCreate(itemPayloads(group.id, groupCode));
      await Promise.all(displayItems.map(it => base44.entities.PrintJob.update(it.job_id, { combine_group_id: group.id })));

      toast({ title: 'สร้างกลุ่มเลย์รวมสำเร็จ', description: `รหัส: ${groupCode}`, duration: 3000 });
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  // ============================
  // Render
  // ============================
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 flex items-stretch justify-center">
      <div className="flex flex-col w-full h-full bg-gray-50 overflow-hidden">

        {/* ── Top bar ── */}
        <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {isEditMode ? `แก้ไข: ${existingGroup.group_code}` : 'Layout Planning Workspace'}
              </h2>
              <p className="text-xs text-gray-400">วางเลย์รวม {items.length} งาน บนกระดาษ {paperSize || '—'} ซม.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Action buttons */}
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleAutoLayout} disabled={!paperSize}>
              <Wand2 className="w-3.5 h-3.5" />Auto Best Fit
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleRotateAll} disabled={!paperSize}>
              <RotateCcw className="w-3.5 h-3.5" />ลองหมุนทั้งหมด
            </Button>
            <div className="w-px h-6 bg-gray-200" />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}>
              <X className="w-3.5 h-3.5 mr-1" />ยกเลิก
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-gray-900 text-white hover:bg-gray-800"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกกลุ่มเลย์รวม'}
            </Button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 overflow-hidden flex gap-0">

          {/* ── Left panel ── */}
          <div className="w-[400px] flex-shrink-0 flex flex-col overflow-y-auto border-r border-gray-200 bg-white p-4 space-y-4">

            {/* A: Print Method */}
            <PrintMethodPanel printMethod={printMethod} setPrintMethod={handleMethodChange} />

            {/* B: Group info */}
            <GroupInfoPanel
              groupCode={groupCode}
              groupName={groupName} setGroupName={setGroupName}
              paperType={paperType} setPaperType={setPaperType}
              gsm={gsm} setGsm={setGsm}
              paperSize={paperSize} setPaperSize={setPaperSize}
              machineId={machineId} setMachineId={setMachineId}
              plannedDate={plannedDate} setPlannedDate={setPlannedDate}
              note={note} setNote={setNote}
              machines={machines}
              materials={materials}
            />

            {/* C: Paper cut calculator */}
            <PaperCutCalc sourceSizeInch={paperSize} onConfirm={setPaperSize} />

            {/* D: Layout settings */}
            <LayoutSettingsPanel
              settings={layoutSettings}
              onChange={handleLayoutSettingsChange}
              items={items}
              customCostPercents={customCostPercents}
              onCustomCostChange={handleCustomCostChange}
            />

          </div>

          {/* ── Right split: Job table + Preview ── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Jobs table top */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white overflow-x-auto" style={{ maxHeight: '42%' }}>
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  รายการงานในกลุ่ม ({items.length} Job)
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>พิมพ์รวม <strong className="text-gray-900 tabular-nums">{totalSheets.toLocaleString()} ใบ</strong></span>
                  <span className={`font-semibold ${areaUsage >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    ใช้พื้นที่ {areaUsage.toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-lg">
                    <span className="font-mono font-bold text-gray-700">{currentMethod.symbol}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-600">{currentMethod.plateSets} แม่พิมพ์</span>
                  </span>
                  {warnings.some(w => w.type === 'error') && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3.5 h-3.5" />มีปัญหา
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                <JobItemsTable
                  items={displayItems}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  locked={false}
                  printMethod={printMethod}
                />
              </div>
            </div>

            {/* Preview bottom */}
            <div className="flex-1 overflow-hidden p-4 bg-gray-50 flex flex-col gap-2">
              {/* W&T Conflict: layout is sheet_wise but method is W&T */}
              {showWTConflict && (
                <div className="flex-shrink-0 bg-red-50 border border-red-300 rounded-xl p-3 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-bold text-sm">❌</span>
                    <div className="flex-1">
                      <div className="font-bold text-red-700 mb-1">Layout ปัจจุบันไม่ถูกต้องสำหรับ Work & Turn</div>
                      <div className="text-red-600 mb-2">งานแต่ละ job อยู่แค่ฝั่งเดียว — นี่คือรูปแบบ "กลับนอก (Sheet-wise)" ไม่ใช่ W&T<br/>Work & Turn ต้องให้ทุก job ปรากฏทั้งฝั่ง FRONT และ BACK</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleAutoLayout}
                          className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 font-medium"
                        >
                          🔧 จัดวางใหม่อัตโนมัติสำหรับ W&T
                        </button>
                        <button
                          onClick={() => setPrintMethod('sheet_wise')}
                          className="bg-white border border-red-300 text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 font-medium"
                        >
                          เปลี่ยนเป็น กลับนอก (Sheet-wise)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sheet-wise conflict: layout looks like W&T mirror */}
              {showSWConflict && (
                <div className="flex-shrink-0 bg-blue-50 border border-blue-300 rounded-xl p-3 text-xs flex items-start gap-2">
                  <span className="text-blue-600">ℹ️</span>
                  <div className="flex-1">
                    <span className="text-blue-700">Layout นี้ดูเหมือนแบบ Work & Turn (ทุก job มีทั้ง 2 ฝั่ง) — ต้องการเปลี่ยนเป็น "กลับในตัว" หรือไม่?</span>
                    <button
                      onClick={() => setPrintMethod('work_and_turn')}
                      className="ml-2 text-blue-600 underline hover:text-blue-800"
                    >เปลี่ยนเป็น W&T</button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                <RealLayoutPreview
                  items={displayItems}
                  paperSize={paperSize}
                  layoutSettings={layoutSettings}
                  warnings={warnings}
                  totalSheets={totalSheets}
                  areaUsage={areaUsage}
                  printMethod={printMethod}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Method change confirm dialog */}
      {pendingMethodChange && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            {(() => {
              const toWT = pendingMethodChange.to === 'work_and_turn' || pendingMethodChange.to === 'work_and_tumble';
              const fromWT = pendingMethodChange.from === 'work_and_turn' || pendingMethodChange.from === 'work_and_tumble';
              const toMethod = PRINT_METHODS[pendingMethodChange.to];
              return (
                <>
                  <div className="text-sm font-bold text-gray-900 mb-2">
                    เปลี่ยนวิธีการพิมพ์เป็น {toMethod?.labelTh}?
                  </div>
                  <div className="text-xs text-gray-600 mb-4 leading-relaxed">
                    {toWT
                      ? `เปลี่ยนเป็น ${toMethod?.labelTh} — ระบบจะจัด layout ใหม่ให้ถูกต้อง ทุก job จะปรากฏทั้งฝั่ง FRONT และ BACK และค่าแม่พิมพ์จะลดลงครึ่งหนึ่ง`
                      : `เปลี่ยนเป็น ${toMethod?.labelTh} — Layout จะยังคงเดิม แต่จะต้องใช้แม่พิมพ์ ${toMethod?.plateSets} ชุด`
                    }
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setPendingMethodChange(null)}
                      className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                    >ยกเลิก</button>
                    {toWT && (
                      <button
                        onClick={() => confirmMethodChange(true)}
                        className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >เปลี่ยนและจัดวางใหม่อัตโนมัติ</button>
                    )}
                    <button
                      onClick={() => confirmMethodChange(false)}
                      className="px-4 py-2 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
                    >{toWT ? 'เปลี่ยนโดยไม่จัดวางใหม่' : 'ดำเนินการต่อ'}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}