import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Droplets, Plus, Loader2 } from 'lucide-react';

export default function MaterialUsageForm({ job, onClose }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ material_id: '', quantity_used: '' });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const selectedMaterial = materials.find(m => m.id === form.material_id);
  const estimatedCost = selectedMaterial && form.quantity_used
    ? (Number(form.quantity_used) * selectedMaterial.cost_per_unit).toLocaleString()
    : null;

  const handleSave = async () => {
    if (!form.material_id || !form.quantity_used) return;
    setSaving(true);
    const material = materials.find(m => m.id === form.material_id);
    const cost = Number(form.quantity_used) * material.cost_per_unit;

    await base44.entities.MaterialUsage.create({
      job_id: job.id,
      job_number: job.job_number,
      material_id: material.id,
      material_name: material.name,
      quantity_used: Number(form.quantity_used),
      unit: material.unit,
      cost,
    });

    // Deduct stock
    await base44.entities.Material.update(material.id, {
      current_stock: Math.max(0, material.current_stock - Number(form.quantity_used))
    });

    queryClient.invalidateQueries({ queryKey: ['material-usages'] });
    queryClient.invalidateQueries({ queryKey: ['materials'] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>บันทึกการใช้วัตถุดิบ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-xs text-gray-400">งาน: <span className="font-semibold text-gray-700">{job.job_number}</span></p>
          <div className="space-y-1.5">
            <Label className="text-xs">วัตถุดิบ</Label>
            <Select value={form.material_id} onValueChange={v => setForm({ ...form, material_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกวัตถุดิบ" />
              </SelectTrigger>
              <SelectContent>
                {materials.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      {m.type === 'paper'
                        ? <Package className="w-3.5 h-3.5 text-blue-500" />
                        : <Droplets className="w-3.5 h-3.5 text-purple-500" />
                      }
                      {m.name} (คงเหลือ {m.current_stock?.toLocaleString()} {m.unit})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">จำนวนที่ใช้ {selectedMaterial ? `(${selectedMaterial.unit})` : ''}</Label>
            <Input
              type="number"
              value={form.quantity_used}
              onChange={e => setForm({ ...form, quantity_used: e.target.value })}
              placeholder="0"
            />
          </div>
          {estimatedCost && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm">
              <span className="text-gray-500">ต้นทุนประมาณ: </span>
              <span className="font-bold text-gray-900">฿{estimatedCost}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800"
              onClick={handleSave}
              disabled={saving || !form.material_id || !form.quantity_used}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              บันทึก
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}