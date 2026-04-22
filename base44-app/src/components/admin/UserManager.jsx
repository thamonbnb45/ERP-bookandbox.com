import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Loader2, Building2, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function UserManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const handleUpdateUser = async (userId, updates) => {
    await base44.entities.User.update(userId, updates);
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
    toast({ title: 'อัพเดทผู้ใช้สำเร็จ', duration: 2000 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" /> จัดการผู้ใช้งาน
        </h2>
        <span className="text-xs text-gray-400">{users.length} ผู้ใช้</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>กำหนดสิทธิ์:</strong> เลือก Role และแผนกให้ผู้ใช้แต่ละคน เมื่อเลือกแผนก ผู้ใช้จะเห็นเฉพาะ QR Code ของแผนกตัวเอง
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>ยังไม่มีผู้ใช้ในระบบ</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <UserRow
              key={user.id}
              user={user}
              departments={departments}
              onUpdate={handleUpdateUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, departments, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const handleRoleChange = async (newRole) => {
    setSaving(true);
    await onUpdate(user.id, { role: newRole });
    setSaving(false);
  };

  const handleDeptChange = async (deptId) => {
    setSaving(true);
    if (deptId === 'none') {
      await onUpdate(user.id, { department_id: '', department_name: '' });
    } else {
      const dept = departments.find(d => d.id === deptId);
      await onUpdate(user.id, { department_id: dept.id, department_name: dept.name });
    }
    setSaving(false);
  };

  return (
    <div className="border border-gray-100 rounded-xl bg-white p-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
          {(user.full_name || user.email || '?')[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name || 'ไม่ระบุชื่อ'}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>

        {/* Role Select */}
        <div className="shrink-0">
          <label className="text-[10px] text-gray-400 block mb-0.5">Role</label>
          <Select value={user.role || 'user'} onValueChange={handleRoleChange}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Department Select */}
        <div className="shrink-0">
          <label className="text-[10px] text-gray-400 block mb-0.5">แผนก</label>
          <Select value={user.department_id || 'none'} onValueChange={handleDeptChange}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="เลือกแผนก" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ไม่ระบุ</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color || '#3B82F6' }} />
                    {d.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
      </div>
    </div>
  );
}