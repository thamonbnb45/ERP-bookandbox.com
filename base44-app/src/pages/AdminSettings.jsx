import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Save, Eye, EyeOff, GripVertical, Settings,
  LayoutDashboard, PlusCircle, ListOrdered, Printer,
  Kanban, Package, Layers, Loader2, CheckCircle2, Users,
  ChevronDown, ChevronUp, Edit2, X, QrCode
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import DepartmentManager from '../components/admin/DepartmentManager';
import UserManager from '../components/admin/UserManager';

// Default menu definitions
const DEFAULT_MENUS = [
  { page_name: 'Dashboard',          label: 'Dashboard',          icon_name: 'LayoutDashboard', sort_order: 0,  allowed_roles: ['admin', 'user'], is_visible: true },
  { page_name: 'ProductionDashboard',label: 'Production Board',   icon_name: 'Kanban',          sort_order: 1,  allowed_roles: ['admin', 'user'], is_visible: true },
  { page_name: 'CreateJob',          label: 'สร้างงาน',           icon_name: 'PlusCircle',      sort_order: 2,  allowed_roles: ['admin'],         is_visible: true },
  { page_name: 'MachineQueue',       label: 'คิวเครื่อง',         icon_name: 'ListOrdered',     sort_order: 3,  allowed_roles: ['admin', 'user'], is_visible: true },
  { page_name: 'MachineSettings',    label: 'ตั้งค่าเครื่อง',    icon_name: 'Settings',        sort_order: 4,  allowed_roles: ['admin'],         is_visible: true },
  { page_name: 'Inventory',          label: 'วัตถุดิบ & ต้นทุน', icon_name: 'Package',         sort_order: 5,  allowed_roles: ['admin', 'user'], is_visible: true },
  { page_name: 'CombineLayout',      label: 'งานเลย์รวม',        icon_name: 'Layers',          sort_order: 6,  allowed_roles: ['admin', 'user'], is_visible: true },
  { page_name: 'DeptScanQR',         label: 'สแกน QR แผนก',      icon_name: 'QrCode',          sort_order: 7,  allowed_roles: ['admin', 'user'], is_visible: true },
  { page_name: 'AdminSettings',      label: 'ตั้งค่าระบบ',       icon_name: 'Shield',          sort_order: 8,  allowed_roles: ['admin'],         is_visible: true },
];

const ICON_MAP = {
  LayoutDashboard, PlusCircle, ListOrdered, Settings, Printer,
  Kanban, Package, Layers, Shield, Users, QrCode,
};

const ALL_ROLES = ['admin', 'user'];
const ROLE_COLORS = { admin: 'bg-red-100 text-red-700', user: 'bg-blue-100 text-blue-700' };

function IconPicker({ value, onChange }) {
  const icons = Object.keys(ICON_MAP);
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {icons.map(name => {
        const Icon = ICON_MAP[name];
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            title={name}
            className={`p-1.5 rounded-lg border transition-all ${value === name ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:border-gray-400 text-gray-500'}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

function MenuRow({ item, onSave, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setDraft(item); }, [item]);

  const toggleRole = (role) => {
    setDraft(prev => {
      const has = prev.allowed_roles.includes(role);
      return {
        ...prev,
        allowed_roles: has
          ? prev.allowed_roles.filter(r => r !== role)
          : [...prev.allowed_roles, role],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
    toast({ title: 'บันทึกสำเร็จ', description: `อัปเดตเมนู "${draft.label}" แล้ว`, duration: 2000 });
  };

  const Icon = ICON_MAP[draft.icon_name] || Settings;
  const savedIcon = ICON_MAP[item.icon_name] || Settings;

  return (
    <div className={`border rounded-xl transition-all ${editing ? 'border-gray-400 shadow-md' : 'border-gray-100 hover:border-gray-300'} bg-white`}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Order controls */}
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={isFirst} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <GripVertical className="w-3.5 h-3.5 text-gray-300" />
          <button onClick={onMoveDown} disabled={isLast} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Icon */}
        {(() => {
          const SavedIcon = ICON_MAP[item.icon_name] || Settings;
          return (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.is_visible ? 'bg-gray-900' : 'bg-gray-300'}`}>
              <SavedIcon className="w-4 h-4 text-white" />
            </div>
          );
        })()}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{item.label}</span>
            <span className="text-xs text-gray-400 font-mono">{item.page_name}</span>
            {!item.is_visible && <Badge className="text-xs bg-gray-100 text-gray-500">ซ่อน</Badge>}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {item.allowed_roles.map(r => (
              <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r]}`}>{r}</span>
            ))}
            {item.allowed_roles.length === 0 && (
              <span className="text-xs text-red-500">⚠ ไม่มีสิทธิ์ใดเข้าถึงได้</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onSave({ ...item, is_visible: !item.is_visible })}
            title={item.is_visible ? 'ซ่อนเมนู' : 'แสดงเมนู'}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          >
            {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 ${editing ? 'bg-gray-100 text-gray-700' : ''}`}
          >
            {editing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/50 rounded-b-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">ชื่อที่แสดงในเมนู</label>
              <Input
                value={draft.label}
                onChange={e => setDraft(prev => ({ ...prev, label: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">ลำดับ</label>
              <Input
                type="number"
                value={draft.sort_order}
                onChange={e => setDraft(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">ไอคอน</label>
            <IconPicker value={draft.icon_name} onChange={v => setDraft(prev => ({ ...prev, icon_name: v }))} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> สิทธิ์การเข้าถึง
            </label>
            <div className="flex gap-2 flex-wrap">
              {ALL_ROLES.map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    draft.allowed_roles.includes(role)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {draft.allowed_roles.includes(role) ? '✓ ' : ''}{role}
                </button>
              ))}
            </div>
            {draft.allowed_roles.length === 0 && (
              <p className="text-xs text-red-500 mt-1">⚠ ต้องเลือกสิทธิ์อย่างน้อย 1 ประเภท</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || draft.allowed_roles.length === 0} className="h-8 text-xs bg-gray-900 hover:bg-gray-800">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              บันทึก
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDraft(item); setEditing(false); }} className="h-8 text-xs">
              ยกเลิก
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [initializing, setInitializing] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['menu-configs'],
    queryFn: () => base44.entities.MenuConfig.list('sort_order'),
  });

  // Initialize defaults if empty
  const handleInit = async () => {
    setInitializing(true);
    await base44.entities.MenuConfig.bulkCreate(DEFAULT_MENUS);
    queryClient.invalidateQueries({ queryKey: ['menu-configs'] });
    setInitializing(false);
    toast({ title: 'โหลดเมนูเริ่มต้นสำเร็จ', duration: 2000 });
  };

  const handleSave = async (item) => {
    if (item.id) {
      await base44.entities.MenuConfig.update(item.id, item);
    } else {
      await base44.entities.MenuConfig.create(item);
    }
    queryClient.invalidateQueries({ queryKey: ['menu-configs'] });
  };

  const handleMoveUp = async (idx) => {
    if (idx === 0) return;
    const sorted = [...configs].sort((a, b) => a.sort_order - b.sort_order);
    const a = sorted[idx];
    const b = sorted[idx - 1];
    await Promise.all([
      base44.entities.MenuConfig.update(a.id, { sort_order: b.sort_order }),
      base44.entities.MenuConfig.update(b.id, { sort_order: a.sort_order }),
    ]);
    queryClient.invalidateQueries({ queryKey: ['menu-configs'] });
  };

  const handleMoveDown = async (idx) => {
    const sorted = [...configs].sort((a, b) => a.sort_order - b.sort_order);
    if (idx === sorted.length - 1) return;
    const a = sorted[idx];
    const b = sorted[idx + 1];
    await Promise.all([
      base44.entities.MenuConfig.update(a.id, { sort_order: b.sort_order }),
      base44.entities.MenuConfig.update(b.id, { sort_order: a.sort_order }),
    ]);
    queryClient.invalidateQueries({ queryKey: ['menu-configs'] });
  };

  const sorted = [...configs].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6" /> ตั้งค่าระบบ
          </h1>
          <p className="text-sm text-gray-400 mt-1">จัดการเมนูและสิทธิ์การเข้าถึงแต่ละหน้า</p>
        </div>
        {configs.length === 0 && !isLoading && (
          <Button size="sm" onClick={handleInit} disabled={initializing} className="h-8 text-xs">
            {initializing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            โหลดเมนูเริ่มต้น
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>สิทธิ์การเข้าถึง:</strong> <span className="font-mono bg-red-100 text-red-700 px-1 rounded">admin</span> = ผู้ดูแลระบบ, <span className="font-mono bg-blue-100 text-blue-700 px-1 rounded">user</span> = ผู้ใช้ทั่วไป<br />
          การเปลี่ยนแปลงสิทธิ์จะมีผลทันทีกับ sidebar ที่ผู้ใช้แต่ละ role มองเห็น
        </div>
      </div>

      {/* Menu list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มีการตั้งค่าเมนู</p>
          <p className="text-xs mt-1">กดปุ่ม "โหลดเมนูเริ่มต้น" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item, idx) => (
            <MenuRow
              key={item.id}
              item={item}
              onSave={handleSave}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
            />
          ))}
        </div>
      )}

      {/* Department Management */}
      <div className="border-t border-gray-100 pt-6">
        <DepartmentManager />
      </div>

      {/* User Management */}
      <div className="border-t border-gray-100 pt-6">
        <UserManager />
      </div>

      {/* Summary */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{sorted.length}</div>
            <div className="text-xs text-gray-400">เมนูทั้งหมด</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-700">{sorted.filter(m => m.is_visible).length}</div>
            <div className="text-xs text-gray-400">เมนูที่แสดง</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-red-700">{sorted.filter(m => !m.is_visible).length}</div>
            <div className="text-xs text-gray-400">เมนูที่ซ่อน</div>
          </div>
        </div>
      )}
    </div>
  );
}