import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2, Trash2, Building2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ALL_STATUSES = [
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'prepress', label: 'Prepress' },
  { value: 'printing', label: 'กำลังพิมพ์' },
  { value: 'postpress', label: 'Postpress' },
  { value: 'completed', label: 'เสร็จแล้ว' },
  { value: 'delivered', label: 'ส่งมอบแล้ว' },
];

const ALL_PROCESSES = [
  { value: 'printing', label: 'พิมพ์' },
  { value: 'lamination', label: 'เคลือบ' },
  { value: 'diecut', label: 'ไดคัท' },
  { value: 'folding', label: 'พับ' },
  { value: 'binding', label: 'เข้าเล่ม' },
  { value: 'cutting', label: 'ตัด' },
];

const DEFAULT_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

export default function DepartmentManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', mapped_statuses: [], mapped_processes: [], color: '#3B82F6' });
  const [saving, setSaving] = useState(false);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const handleCreate = async () => {
    if (!newDept.name.trim()) return;
    setSaving(true);
    await base44.entities.Department.create({ ...newDept, is_active: true });
    queryClient.invalidateQueries({ queryKey: ['departments'] });
    setNewDept({ name: '', mapped_statuses: [], mapped_processes: [], color: DEFAULT_COLORS[departments.length % DEFAULT_COLORS.length] });
    setShowAdd(false);
    setSaving(false);
    toast({ title: 'สร้างแผนกสำเร็จ', duration: 2000 });
  };

  const handleDelete = async (id) => {
    await base44.entities.Department.delete(id);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
    toast({ title: 'ลบแผนกแล้ว', duration: 2000 });
  };

  const handleUpdate = async (dept, updates) => {
    await base44.entities.Department.update(dept.id, updates);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const toggleArrayItem = (arr, item) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  if (isLoading) {
    return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" /> จัดการแผนก
        </h2>
        <Button size="sm" onClick={() => setShowAdd(true)} className="h-8 text-xs gap-1">
          <Plus className="w-3.5 h-3.5" /> เพิ่มแผนก
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">ชื่อแผนก</label>
                <Input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="เช่น แผนกพิมพ์" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">สี</label>
                <div className="flex gap-1.5">
                  {DEFAULT_COLORS.map(c => (
                    <button key={c} onClick={() => setNewDept(p => ({ ...p, color: c }))} className={`w-6 h-6 rounded-full border-2 ${newDept.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">สถานะที่รับผิดชอบ (QR Code)</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map(s => (
                  <button key={s.value} onClick={() => setNewDept(p => ({ ...p, mapped_statuses: toggleArrayItem(p.mapped_statuses, s.value) }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${newDept.mapped_statuses.includes(s.value) ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                    {newDept.mapped_statuses.includes(s.value) ? '✓ ' : ''}{s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">ประเภท process ที่รับผิดชอบ</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PROCESSES.map(p => (
                  <button key={p.value} onClick={() => setNewDept(prev => ({ ...prev, mapped_processes: toggleArrayItem(prev.mapped_processes, p.value) }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${newDept.mapped_processes.includes(p.value) ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                    {newDept.mapped_processes.includes(p.value) ? '✓ ' : ''}{p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={saving || !newDept.name.trim()} className="h-8 text-xs">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />} บันทึก
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="h-8 text-xs">ยกเลิก</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dept list */}
      {departments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>ยังไม่มีแผนก กดเพิ่มแผนกเพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map(dept => (
            <DeptRow key={dept.id} dept={dept} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeptRow({ dept, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(dept);

  const toggleArrayItem = (arr, item) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const handleSave = async () => {
    await onUpdate(dept, { name: draft.name, mapped_statuses: draft.mapped_statuses, mapped_processes: draft.mapped_processes, color: draft.color });
    setEditing(false);
  };

  return (
    <div className="border border-gray-100 rounded-xl bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: dept.color || '#3B82F6' }}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(dept.mapped_statuses || []).map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{s}</span>
            ))}
            {(dept.mapped_processes || []).map(p => (
              <span key={p} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">{p}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setDraft(dept); setEditing(!editing); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-xs">
            {editing ? '✕' : '✎'}
          </button>
          <button onClick={() => onDelete(dept.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <Input value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">สถานะที่รับผิดชอบ</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map(s => (
                <button key={s.value} onClick={() => setDraft(p => ({ ...p, mapped_statuses: toggleArrayItem(p.mapped_statuses || [], s.value) }))}
                  className={`px-2 py-0.5 rounded text-xs border ${(draft.mapped_statuses || []).includes(s.value) ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ประเภท process</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PROCESSES.map(p => (
                <button key={p.value} onClick={() => setDraft(prev => ({ ...prev, mapped_processes: toggleArrayItem(prev.mapped_processes || [], p.value) }))}
                  className={`px-2 py-0.5 rounded text-xs border ${(draft.mapped_processes || []).includes(p.value) ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="h-7 text-xs">บันทึก</Button>
        </div>
      )}
    </div>
  );
}