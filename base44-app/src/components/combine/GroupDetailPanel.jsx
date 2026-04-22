import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Lock, Unlock, Trash2, Send, ChevronRight, Loader2, Edit2, X, RefreshCw
} from 'lucide-react';
import GroupItemRow from './GroupItemRow';
import LayoutPreview from './LayoutPreview';
import CancelGroupDialog from './CancelGroupDialog';
import { calcGroupTotalSheets, calcAreaPercents, calcCostSharePercents, parsePaperSize, COMBINE_STATUS, COST_SHARE_METHODS, autoLayout } from '@/utils/combineUtils';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

export default function GroupDetailPanel({ group, items: initItems, machines, onClose, onRefresh, onEdit }) {
  const { toast } = useToast();
  const [items, setItems] = useState(initItems);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'lock'|'release'
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const locked = group.status === 'locked' || group.status === 'released';
  const totalSheets = calcGroupTotalSheets(items);
  const machine = machines.find(m => m.id === group.machine_id);

  const recalc = (updatedItems) => {
    if (!group.paper_size) return updatedItems;
    const { w, h } = parsePaperSize(group.paper_size);
    const laid = autoLayout(updatedItems, w, h);
    const areaPercents = calcAreaPercents(laid, w, h);
    const withArea = laid.map((it, i) => ({ ...it, area_percent: areaPercents[i] }));
    const costPercents = calcCostSharePercents(withArea, group.cost_share_method || 'area');
    return withArea.map((it, i) => ({ ...it, cost_share_percent: costPercents[i] }));
  };

  const handleUpdateItem = (idx, updated) => {
    setItems(prev => recalc(prev.map((it, i) => i === idx ? updated : it)));
  };

  const handleSaveItems = async () => {
    setSaving(true);
    try {
      await Promise.all(items.map(it =>
        base44.entities.CombineItem.update(it.id, it)
      ));
      await base44.entities.CombineGroup.update(group.id, {
        total_sheet_count: totalSheets,
        history_log: [...(group.history_log || []), {
          action: 'updated',
          timestamp: new Date().toISOString(),
          detail: 'แก้ไขรายการงานในกลุ่ม',
        }],
      });
      toast({ title: 'บันทึกสำเร็จ', duration: 3000 });
      onRefresh();
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', description: String(err), variant: 'destructive', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async () => {
    setSaving(true);
    try {
      await base44.entities.CombineGroup.update(group.id, {
        status: 'locked',
        history_log: [...(group.history_log || []), { action: 'locked', timestamp: new Date().toISOString(), detail: 'ล็อกกลุ่ม' }],
      });
      toast({ title: 'ล็อกกลุ่มเรียบร้อย', duration: 3000 });
      onRefresh();
    } finally { setSaving(false); setConfirmAction(null); }
  };

  const handleCancel = async () => {
    await base44.entities.CombineGroup.update(group.id, {
      status: 'cancelled',
      history_log: [...(group.history_log || []), { action: 'cancelled', timestamp: new Date().toISOString(), detail: 'ยกเลิกกลุ่ม' }],
    });
    await Promise.all(items.map(it =>
      base44.entities.PrintJob.update(it.job_id, { combine_group_id: null })
    ));
    onRefresh();
  };

  const handleRelease = async () => {
    setSaving(true);
    try {
      // Create queue entries for the group
      const jobsData = await Promise.all(items.map(it => base44.entities.PrintJob.filter({ id: it.job_id })));
      const machineData = machines.find(m => m.id === group.machine_id);

      if (machineData) {
        await base44.entities.QueueEntry.create({
          job_id: items[0]?.job_id || '',
          job_number: `[กลุ่ม] ${group.group_code}`,
          machine_id: group.machine_id,
          machine_name: machineData.name,
          process_type: 'printing',
          sheets: totalSheets,
          estimated_hours: machineData.capacity_per_hour > 0 ? totalSheets / machineData.capacity_per_hour : 0,
          status: 'queued',
        });
      }

      // Update group status
      await base44.entities.CombineGroup.update(group.id, {
        status: 'released',
        history_log: [...(group.history_log || []), { action: 'released', timestamp: new Date().toISOString(), detail: `ส่งเข้าคิวผลิต ${totalSheets} ใบ` }],
      });

      // Update all jobs to prepress
      await Promise.all(items.map(it =>
        base44.entities.PrintJob.update(it.job_id, { status: 'prepress' })
      ));

      toast({ title: 'ส่งเข้าคิวผลิตสำเร็จ', description: `กลุ่ม ${group.group_code} — ${totalSheets} ใบพิมพ์`, duration: 3000 });
      onRefresh();
      onClose();
    } finally { setSaving(false); setConfirmAction(null); }
  };

  const statusInfo = COMBINE_STATUS[group.status] || COMBINE_STATUS.draft;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900 text-sm">{group.group_code}</span>
            <Badge className={`${statusInfo.color} text-xs`}>{statusInfo.label}</Badge>
          </div>
          <div className="text-xs text-gray-500">
            {group.group_name} • {group.paper_type} {group.gsm}g • {group.paper_size} • {machine?.name || '-'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            วันผลิต: {group.planned_date ? moment(group.planned_date).format('DD/MM/YYYY') : '-'}
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 flex-wrap">
        {group.status === 'draft' && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit && onEdit(group, items)}>
              <Edit2 className="w-3 h-3" />แก้ไขเลย์รวม
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setConfirmAction('lock')}>
              <Lock className="w-3 h-3" />ล็อกกลุ่ม
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowCancelDialog(true)}>
              <Trash2 className="w-3 h-3" />ยกเลิกกลุ่ม
            </Button>
          </>
        )}
        {group.status === 'locked' && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowCancelDialog(true)}>
              <Unlock className="w-3 h-3" />ปลดล็อก/ยกเลิก
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConfirmAction('release')}>
              <Send className="w-3 h-3" />ส่งเข้าคิวผลิต
            </Button>
          </>
        )}

      </div>

      {/* Confirm action (lock/release only) */}
      {confirmAction && (
        <div className="mx-5 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-center gap-3">
          <span className="flex-1 text-amber-800">
            {confirmAction === 'lock' && 'ล็อกกลุ่ม? จะไม่สามารถแก้ไขได้จนกว่าจะปลดล็อก'}
            {confirmAction === 'release' && `ส่งเข้าคิวผลิต? จะสร้าง queue entry ${totalSheets} ใบ และเปลี่ยนสถานะงานเป็น prepress`}
          </span>
          <Button size="sm" className="h-6 text-xs" onClick={
            confirmAction === 'lock' ? handleLock : handleRelease
          } disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'ยืนยัน'}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setConfirmAction(null)}>ยกเลิก</Button>
        </div>
      )}

      {/* Cancel dialog */}
      {showCancelDialog && (
        <CancelGroupDialog
          group={group}
          itemCount={items.length}
          onConfirm={handleCancel}
          onClose={() => { setShowCancelDialog(false); onRefresh(); onClose(); }}
        />
      )}

      {/* Summary */}
      <div className="flex gap-4 px-5 py-3 text-xs text-gray-600 border-b border-gray-50">
        <span>{items.length} งาน</span>
        <span>ใบพิมพ์รวม: <strong className="text-gray-900">{totalSheets.toLocaleString()}</strong></span>
        <span>แชร์ต้นทุน: <strong>{group.cost_share_method === 'area' ? 'ตามพื้นที่' : 'ตามจำนวน'}</strong></span>
      </div>

      {/* Items table */}
      <div className="flex-1 overflow-auto px-5 py-3 space-y-4">
        <div className="overflow-x-auto rounded-lg border border-gray-100">
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
                 key={it.id || it.job_id}
                 item={it}
                 totalSheets={totalSheets}
                 onUpdate={updated => handleUpdateItem(idx, updated)}
                 onRemove={() => {}}
                 locked={true}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Preview */}
        <LayoutPreview items={items} paperSize={group.paper_size} totalSheets={totalSheets} />

        {/* History log */}
        {group.history_log?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 mb-2">History Log</h4>
            <div className="space-y-1">
              {[...group.history_log].reverse().map((log, i) => (
                <div key={i} className="text-xs text-gray-500 flex gap-2">
                  <span className="text-gray-400 whitespace-nowrap">{moment(log.timestamp).format('DD/MM HH:mm')}</span>
                  <Badge className="text-xs bg-gray-100 text-gray-600 h-4 px-1">{log.action}</Badge>
                  <span>{log.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}