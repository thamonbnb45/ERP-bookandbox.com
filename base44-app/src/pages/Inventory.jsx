import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Plus, Pencil, Trash2, Package, Droplets, PackageOpen } from 'lucide-react';
import LowStockAlert from '../components/inventory/LowStockAlert';
import MaterialUsageList from '../components/inventory/MaterialUsageList';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [activeTab, setActiveTab] = useState('materials');
  const [form, setForm] = useState({ name: '', type: 'paper', unit: 'รีม', cost_per_unit: '', current_stock: '', minimum_stock: '', description: '' });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['material-usages'],
    queryFn: () => base44.entities.MaterialUsage.list('-created_date', 100),
  });

  const lowStockItems = materials.filter(m => m.current_stock <= m.minimum_stock);

  const openAdd = () => {
    setEditingMaterial(null);
    setForm({ name: '', type: 'paper', unit: 'รีม', cost_per_unit: '', current_stock: '', minimum_stock: '', description: '' });
    setShowDialog(true);
  };

  const openEdit = (material) => {
    setEditingMaterial(material);
    setForm({
      name: material.name,
      type: material.type,
      unit: material.unit,
      cost_per_unit: material.cost_per_unit,
      current_stock: material.current_stock,
      minimum_stock: material.minimum_stock,
      description: material.description || ''
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      cost_per_unit: Number(form.cost_per_unit),
      current_stock: Number(form.current_stock),
      minimum_stock: Number(form.minimum_stock),
    };
    if (editingMaterial) {
      await base44.entities.Material.update(editingMaterial.id, data);
    } else {
      await base44.entities.Material.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['materials'] });
    setShowDialog(false);
  };

  const handleDelete = async (id) => {
    if (confirm('ต้องการลบวัตถุดิบนี้หรือไม่?')) {
      await base44.entities.Material.delete(id);
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    }
  };

  const totalValue = materials.reduce((sum, m) => sum + (m.current_stock * m.cost_per_unit), 0);
  const papers = materials.filter(m => m.type === 'paper');
  const inks = materials.filter(m => m.type === 'ink');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">วัตถุดิบ & ต้นทุน</h1>
          <p className="text-sm text-gray-400 mt-1">ติดตามสต็อกกระดาษ หมึก และคำนวณต้นทุนการผลิต</p>
        </div>
        <Button onClick={openAdd} className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มวัตถุดิบ
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && <LowStockAlert items={lowStockItems} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">รายการทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">กระดาษ</p>
            <p className="text-2xl font-bold text-blue-600">{papers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">หมึก</p>
            <p className="text-2xl font-bold text-purple-600">{inks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-red-50 shadow-sm border-red-100">
          <CardContent className="p-4">
            <p className="text-xs text-red-400">ใกล้หมด</p>
            <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100">
        {[
          { key: 'materials', label: 'สต็อกวัตถุดิบ', icon: Package },
          { key: 'usages', label: 'ประวัติการใช้', icon: PackageOpen },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'materials' && (
        isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : (
          <div className="space-y-3">
            {materials.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">ยังไม่มีวัตถุดิบ กด "เพิ่มวัตถุดิบ" เพื่อเริ่มต้น</p>
              </div>
            ) : materials.map(material => {
              const isLow = material.current_stock <= material.minimum_stock;
              const stockPct = Math.min((material.current_stock / (material.minimum_stock * 3)) * 100, 100);
              return (
                <Card key={material.id} className={`border-gray-100 shadow-sm ${isLow ? 'border-red-200 bg-red-50/30' : ''}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${material.type === 'paper' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {material.type === 'paper'
                        ? <Package className="w-5 h-5 text-blue-600" />
                        : <Droplets className="w-5 h-5 text-purple-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{material.name}</span>
                        <Badge variant="secondary" className={`text-xs ${material.type === 'paper' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {material.type === 'paper' ? 'กระดาษ' : 'หมึก'}
                        </Badge>
                        {isLow && (
                          <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" /> ใกล้หมด
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-emerald-400'}`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">
                          {material.current_stock?.toLocaleString()} / ขั้นต่ำ {material.minimum_stock?.toLocaleString()} {material.unit}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ราคา {material.cost_per_unit?.toLocaleString()} บาท/{material.unit} • มูลค่าสต็อก ฿{(material.current_stock * material.cost_per_unit).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(material)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(material.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Total value */}
            {materials.length > 0 && (
              <div className="text-right pt-2">
                <span className="text-sm text-gray-400">มูลค่าสต็อกรวม: </span>
                <span className="text-lg font-bold text-gray-900">฿{totalValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        )
      )}

      {activeTab === 'usages' && (
        <MaterialUsageList usages={usages} />
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ชื่อวัตถุดิบ</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ประเภท</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper">กระดาษ</SelectItem>
                    <SelectItem value="ink">หมึก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">หน่วยนับ</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="รีม, ลิตร, กก." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ราคา/หน่วย (บาท)</Label>
                <Input type="number" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">สต็อกปัจจุบัน</Label>
                <Input type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">สต็อกขั้นต่ำ (แจ้งเตือน)</Label>
                <Input type="number" value={form.minimum_stock} onChange={e => setForm({ ...form, minimum_stock: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">หมายเหตุ</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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