import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PROCESS_LABELS, PROCESS_COLORS } from '../components/scheduling/SchedulingUtils';
import { Plus, Pencil, Trash2, Printer, Power } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const TYPES = ['printing', 'diecut', 'lamination', 'folding', 'binding', 'cutting'];

export default function MachineSettings() {
  const queryClient = useQueryClient();
  const [editingMachine, setEditingMachine] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'printing', capacity_per_hour: '', working_hours_start: '08:00', working_hours_end: '18:00', status: 'active' });

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
  });

  const openAdd = () => {
    setEditingMachine(null);
    setForm({ name: '', type: 'printing', capacity_per_hour: '', working_hours_start: '08:00', working_hours_end: '18:00', status: 'active' });
    setShowDialog(true);
  };

  const openEdit = (machine) => {
    setEditingMachine(machine);
    setForm({
      name: machine.name,
      type: machine.type,
      capacity_per_hour: machine.capacity_per_hour,
      working_hours_start: machine.working_hours_start || '08:00',
      working_hours_end: machine.working_hours_end || '18:00',
      status: machine.status || 'active'
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = { ...form, capacity_per_hour: Number(form.capacity_per_hour) };
    if (editingMachine) {
      await base44.entities.Machine.update(editingMachine.id, data);
    } else {
      await base44.entities.Machine.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['machines'] });
    setShowDialog(false);
  };

  const handleDelete = async (id) => {
    if (confirm('คุณต้องการลบเครื่องนี้หรือไม่?')) {
      await base44.entities.Machine.delete(id);
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ตั้งค่าเครื่องจักร</h1>
          <p className="text-sm text-gray-400 mt-1">จัดการ Capacity และเวลาทำงานของเครื่องจักร</p>
        </div>
        <Button onClick={openAdd} className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มเครื่อง
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {machines.map(machine => {
            const colors = PROCESS_COLORS[machine.type] || PROCESS_COLORS.printing;
            return (
              <Card key={machine.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                    <Printer className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-gray-900">{machine.name}</h3>
                      <Badge variant="secondary" className={`text-xs ${colors.light} ${colors.text} ${colors.border}`}>
                        {PROCESS_LABELS[machine.type]}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${machine.status === 'active' ? 'text-emerald-600 border-emerald-200' : 'text-gray-400 border-gray-200'}`}>
                        <Power className="w-3 h-3 mr-1" />{machine.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {machine.capacity_per_hour?.toLocaleString()} แผ่น/ชม. • เวลาทำงาน {machine.working_hours_start || '08:00'} - {machine.working_hours_end || '18:00'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(machine)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(machine.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMachine ? 'แก้ไขเครื่องจักร' : 'เพิ่มเครื่องจักรใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">ชื่อเครื่อง</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ประเภท</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{PROCESS_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Capacity (แผ่น/ชั่วโมง)</Label>
              <Input type="number" value={form.capacity_per_hour} onChange={e => setForm({...form, capacity_per_hour: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">เวลาเริ่มงาน</Label>
                <Input type="time" value={form.working_hours_start} onChange={e => setForm({...form, working_hours_start: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">เวลาเลิกงาน</Label>
                <Input type="time" value={form.working_hours_end} onChange={e => setForm({...form, working_hours_end: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานะ</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                  <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>ยกเลิก</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSave}>บันทึก</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}