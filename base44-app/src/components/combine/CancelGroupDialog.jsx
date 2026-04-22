import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    title: 'ยกเลิกแผนเลย์รวม?',
    desc: (group) => `คุณกำลังจะยกเลิกกลุ่ม "${group.group_code}" ระบบจะคืนสถานะงานทั้งหมดกลับเป็น "พร้อมเลย์รวม"`,
    confirmLabel: 'ต้องการยกเลิกแผน',
    btnLabel: 'ใช่ ยกเลิกแผนนี้',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  {
    icon: Trash2,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    title: 'ยืนยันการลบแผนการผลิต',
    desc: (group) => `การดำเนินการนี้จะ:\n• ลบกลุ่มเลย์รวม ${group.group_code} ออกจากระบบ\n• คืนงานทั้ง ${group._itemCount || ''} รายการกลับสู่คิวรอเลย์รวม\n• ไม่สามารถย้อนกลับได้`,
    confirmLabel: 'ยืนยันการลบถาวร',
    btnLabel: 'ลบแผนการผลิต',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  {
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50',
    title: 'ยกเลิกสำเร็จ',
    desc: () => 'ระบบได้คืนสถานะงานทั้งหมดเรียบร้อยแล้ว',
    confirmLabel: null,
    btnLabel: 'ปิด',
    btnClass: 'bg-gray-900 hover:bg-gray-800 text-white',
  },
];

export default function CancelGroupDialog({ group, itemCount, onConfirm, onClose }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const enrichedGroup = { ...group, _itemCount: itemCount };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setLoading(true);
      await onConfirm();
      setLoading(false);
      setStep(2);
    } else {
      onClose();
    }
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const descText = current.desc(enrichedGroup);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={step === 2 ? onClose : undefined} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Top color bar */}
        <div className={`h-1.5 w-full ${step === 0 ? 'bg-amber-400' : step === 1 ? 'bg-red-500' : 'bg-green-500'}`} />

        {/* Step indicator */}
        <div className="flex justify-center gap-2 pt-5 pb-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-gray-800' : i < step ? 'w-4 bg-gray-300' : 'w-4 bg-gray-100'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${current.iconBg} mb-4`}>
            <Icon className={`w-8 h-8 ${current.iconColor}`} />
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-3">{current.title}</h2>

          <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left bg-gray-50 rounded-xl px-4 py-3 mb-6">
            {descText}
          </div>

          {step < 2 && (
            <p className="text-xs text-gray-400 mb-6">
              ขั้นตอนที่ {step + 1} จาก 2
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-8 pb-8">
          {step < 2 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-1" /> ไม่ ยังไม่ยกเลิก
            </Button>
          )}
          <Button
            className={`flex-1 ${current.btnClass}`}
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            {current.btnLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}