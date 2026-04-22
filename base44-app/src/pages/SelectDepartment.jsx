import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SelectDepartment() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
  });

  useEffect(() => {
    base44.auth.me().then(me => {
      setUser(me);
      // If user already has a department, redirect
      if (me?.department_id) {
        navigate('/');
      }
    });
  }, []);

  const handleSelect = async () => {
    if (!selected) return;
    setSaving(true);
    const dept = departments.find(d => d.id === selected);
    await base44.auth.updateMe({
      department_id: dept.id,
      department_name: dept.name,
    });
    setSaving(false);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mx-auto flex items-center justify-center mb-4">
            <Printer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">PrintFlow</h1>
          <p className="text-blue-200 text-sm mt-1">เลือกแผนกของคุณเพื่อเริ่มต้นใช้งาน</p>
        </div>

        {/* User Info */}
        {user && (
          <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 mb-6 text-center">
            <p className="text-white text-sm font-medium">{user.full_name || user.email}</p>
            <p className="text-blue-200 text-xs">{user.email}</p>
          </div>
        )}

        {/* Department Grid */}
        <div className="space-y-3 mb-6">
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => setSelected(dept.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selected === dept.id
                  ? 'border-white bg-white/15 shadow-lg'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: (dept.color || '#3B82F6') + '30' }}
              >
                <Building2 className="w-6 h-6" style={{ color: dept.color || '#3B82F6' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{dept.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(dept.mapped_statuses || []).map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-blue-200">{s}</span>
                  ))}
                </div>
              </div>
              {selected === dept.id && (
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
              )}
            </button>
          ))}

          {departments.length === 0 && (
            <div className="text-center py-8 text-blue-200/60 text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>ยังไม่มีแผนกในระบบ</p>
              <p className="text-xs mt-1">กรุณาติดต่อ Admin เพื่อสร้างแผนก</p>
            </div>
          )}
        </div>

        {/* Confirm Button */}
        <Button
          onClick={handleSelect}
          disabled={!selected || saving}
          className="w-full h-12 text-base font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border-0"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          ยืนยันเลือกแผนก
        </Button>

        <p className="text-center text-blue-300/50 text-xs mt-4">
          สามารถเปลี่ยนแผนกได้ภายหลังโดยติดต่อ Admin
        </p>
      </div>
    </div>
  );
}