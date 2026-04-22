import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import GroupItemRow from './GroupItemRow';
import LayoutPreview from './LayoutPreview';
import {
  generateGroupCode, calcGroupTotalSheets, autoLayout,
  calcAreaPercents, calcCostSharePercents, parsePaperSize,
  PAPER_TYPES, PAPER_SIZES, GSM_OPTIONS, COST_SHARE_METHODS
} from '@/utils/combineUtils';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

export default function CreateGroupModal({ open, onClose, selectedJobs, machines, onCreated }) {
  const { toast } = useToast();
  const firstJob = selectedJobs[0] || {};

  const [saving, setSaving] = useState(false);
  const [costMethod, setCostMethod] = useState('area');
  const [groupName, setGroupName] = useState('');
  const [paperType, setPaperType] = useState(firstJob.paper || '');
  const [gsm, setGsm] = useState(firstJob.gsm ? String(firstJob.gsm) : '');
  const [paperSize, setPaperSize] = useState(firstJob.paper_size || '');
  const [machineId, setMachineId] = useState(firstJob.printing_machine_id || '');
  const [plannedDate, setPlannedDate] = useState(moment().add(1, 'day').format('YYYY-MM-DD'));
  const [note, setNote] = useState('');

  const [items, setItems] = useState(() =>
    selectedJobs.map(j => ({
      job_id: j.id,
      job_number: j.job_number,
      customer_name: j.customer_name || '',
      product_name: j.product_name || j.product_type,
      qty: j.quantity || 0,
      up_per_sheet: 1,
      waste_qty: Math.ceil((j.quantity || 0) * 0.05),
      area_percent: 0,
      cost_share_percent: 0,
      rotate_allowed: false,
      note: '',
      pos_x: 0, pos_y: 0, box_width: 0, box_height: 0,
    }))
  );

  // Recalculate layout + area + cost share whenever items/paper change
  useEffect(() => {
    if (!paperSize || items.length === 0) return;
    const { w, h } = parsePaperSize(paperSize);
    const laid = autoLayout(items, w, h);
    const areaPercents = calcAreaPercents(laid, w, h);
    const withArea = laid.map((it, i) => ({ ...it, area_percent: areaPercents[i] }));
    const costPercents = calcCostSharePercents(withArea, costMethod);
    const final = withArea.map((it, i) => ({ ...it, cost_share_percent: costPercents[i] }));
    setItems(final);
  }, [paperSize, costMethod, items.map(i => `${i.up_per_sheet},${i.waste_qty}`).join('|')]);

  const totalSheets = calcGroupTotalSheets(items);
  const groupCode = generateGroupCode();
  const machine = machines.find(m => m.id === machineId);

  const handleUpdateItem = (idx, updated) => {
    setItems(prev => prev.map((it, i) => i === idx ? updated : it));
  };
  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

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
    try {
      // 1. Create group
      const group = await base44.entities.CombineGroup.create({
        group_code: groupCode,
        group_name: groupName || `${paperType} ${gsm}g ${paperSize}`,
        paper_type: paperType,
        gsm: parseFloat(gsm) || 0,
        paper_size: paperSize,
        machine_id: machineId,
        machine_name: machine?.name || '',
        planned_date: plannedDate,
        cost_share_method: costMethod,
        total_sheet_count: totalSheets,
        status: 'draft',
        note,
        history_log: [{
          action: 'created',
          timestamp: new Date().toISOString(),
          detail: `สร้างกลุ่มเลย์รวม ${items.length} งาน`,
        }],
      });

      // 2. Create items
      await base44.entities.CombineItem.bulkCreate(
        items.map(it => ({ ...it, group_id: group.id, group_code: groupCode }))
      );

      // 3. Update jobs: mark combine_group_id
      await Promise.all(
        items.map(it =>
          base44.entities.PrintJob.update(it.job_id, { combine_group_id: group.id })
        )
      );

      toast({ title: 'สร้างกลุ่มเลย์รวมสำเร็จ', description: `รหัส: ${groupCode}`, duration: 3000 });
      onCreated();
      onClose();
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', description: String(err), variant: 'destructive', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-base font-semibold">สร้างกลุ่มเลย์รวม</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Group settings */}
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">รหัสกลุ่ม</label>
                <div className="h-8 px-3 flex items-center text-xs font-mono bg-gray-100 rounded border border-gray-200 text-gray-600">{groupCode}</div>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs text-gray-500 mb-1 block">ชื่อกลุ่ม</label>
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} className="h-8 text-xs" placeholder="ชื่อกลุ่ม (optional)" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ประเภทกระดาษ <span className="text-red-500">*</span></label>
                <Select value={paperType} onValueChange={setPaperType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAPER_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">แกรม</label>
                <Select value={gsm} onValueChange={setGsm}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{GSM_OPTIONS.map(g => <SelectItem key={g} value={String(g)}>{g} g</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ขนาดกระดาษ <span className="text-red-500">*</span></label>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAPER_SIZES.map(s => <SelectItem key={s} value={s}>{s} ซม.</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">เครื่องพิมพ์ <span className="text-red-500">*</span></label>
                <Select value={machineId} onValueChange={setMachineId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{machines.filter(m => m.type === 'printing').map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">วันผลิตที่วางแผน</label>
                <Input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">วิธีแชร์ต้นทุน</label>
                <Select value={costMethod} onValueChange={setCostMethod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{COST_SHARE_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-2">
              <label className="text-xs text-gray-500 mb-1 block">หมายเหตุ</label>
              <Input value={note} onChange={e => setNote(e.target.value)} className="h-8 text-xs" placeholder="หมายเหตุเพิ่มเติม" />
            </div>
          </div>

          {/* Summary bar */}
          <div className="px-6 py-3 flex items-center gap-6 bg-white border-b border-gray-100 text-xs text-gray-600">
            <span>{items.length} งานในกลุ่ม</span>
            <span>ใบพิมพ์รวม: <strong className="text-gray-900 tabular-nums">{totalSheets.toLocaleString()} ใบ</strong></span>
            <span>วิธีแชร์: <strong>{costMethod === 'area' ? 'ตามพื้นที่' : 'ตามจำนวนชิ้น'}</strong></span>
          </div>

          <div className="px-6 py-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Items table */}
            <div className="xl:col-span-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    {['Job No.','สินค้า','จำนวน','ลงต่อแผ่น','เผื่อ','ต้องการ','ได้จริง','ต่าง','พื้นที่%','แชร์ต้นทุน%','หมุน','หมายเหตุ',''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <GroupItemRow
                      key={it.job_id}
                      item={it}
                      totalSheets={totalSheets}
                      onUpdate={updated => handleUpdateItem(idx, updated)}
                      onRemove={() => handleRemoveItem(idx)}
                      locked={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Preview */}
            <div className="xl:col-span-1">
              <LayoutPreview items={items} paperSize={paperSize} totalSheets={totalSheets} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 bg-gray-900 text-white hover:bg-gray-800">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึกกลุ่มเลย์รวม
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}