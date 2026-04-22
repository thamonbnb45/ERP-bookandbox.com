import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, ChevronRight, X, Loader2, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    title: 'ยืนยันการยกเลิกงาน',
    subtitle: 'คุณต้องการยกเลิกคำสั่งงานนี้ใช่หรือไม่?',
    desc: 'การยกเลิกจะลบข้อมูลงาน, คิวการผลิต และไม่สามารถกู้คืนได้',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    confirmLabel: 'ใช่, ดำเนินการต่อ',
    cancelLabel: 'ไม่ใช่ กลับไป',
    btnColor: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  {
    title: 'ขั้นที่ 2 — ยืนยันอีกครั้ง',
    subtitle: 'คิวการผลิตทั้งหมดจะถูกลบ',
    desc: 'ขั้นตอนการผลิตที่อยู่ระหว่างดำเนินการจะถูกยกเลิกทันที เครื่องจักรจะถูกปลดจากคิวงานนี้',
    icon: Trash2,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    confirmLabel: 'ยืนยัน ลบคิวทั้งหมด',
    cancelLabel: 'ยกเลิก',
    btnColor: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  {
    title: 'ขั้นสุดท้าย — พิมพ์รหัสงานเพื่อยืนยัน',
    subtitle: 'กรุณาพิมพ์รหัสงานเพื่อยืนยันการลบถาวร',
    desc: null,
    icon: X,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    confirmLabel: 'ลบถาวร',
    cancelLabel: 'ยกเลิก',
    btnColor: 'bg-red-600 hover:bg-red-700 text-white',
  },
];

export default function CancelJobDialog({ open, onClose, jobNumber, onConfirm }) {
  const [step, setStep] = useState(0);
  const [typedCode, setTypedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const current = STEPS[step];
  const isLastStep = step === 2;
  const canConfirmLast = typedCode === jobNumber;

  const handleClose = () => {
    setStep(0);
    setTypedCode('');
    setDone(false);
    onClose();
  };

  const handleNext = async () => {
    if (isLastStep) {
      setLoading(true);
      await onConfirm();
      setLoading(false);
      setDone(true);
      setTimeout(handleClose, 1500);
    } else {
      setStep(s => s + 1);
    }
  };

  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl">
        {/* Top danger strip */}
        <div className={`h-1.5 w-full ${step === 0 ? 'bg-amber-400' : step === 1 ? 'bg-orange-500' : 'bg-red-600'} transition-all duration-500`} />

        {done ? (
          <div className="flex flex-col items-center justify-center py-14 px-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-base font-semibold text-gray-800">ยกเลิกงานเรียบร้อยแล้ว</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2">
              {STEPS.map((_, i) => (
                <React.Fragment key={i}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i < step ? 'bg-gray-800 text-white' :
                    i === step ? (step === 0 ? 'bg-amber-500 text-white ring-2 ring-amber-200' : step === 1 ? 'bg-orange-500 text-white ring-2 ring-orange-200' : 'bg-red-600 text-white ring-2 ring-red-200') :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 transition-all duration-500 ${i < step ? 'bg-gray-800' : 'bg-gray-100'}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Icon + Title */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-2xl ${current.iconBg} flex items-center justify-center`}>
                <Icon className={`w-7 h-7 ${current.iconColor}`} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{current.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{current.subtitle}</p>
              </div>
            </div>

            {/* Job badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                <span className="text-xs text-gray-400">Job:</span>
                <span className="font-mono font-bold text-gray-900">{jobNumber}</span>
              </div>
            </div>

            {/* Desc */}
            {current.desc && (
              <div className={`text-xs text-center px-4 py-2.5 rounded-xl ${
                step === 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                step === 1 ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {current.desc}
              </div>
            )}

            {/* Step 3: type confirm */}
            {isLastStep && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 block text-center">
                  พิมพ์ <span className="font-mono font-bold text-gray-900">{jobNumber}</span> เพื่อยืนยัน
                </label>
                <Input
                  value={typedCode}
                  onChange={e => setTypedCode(e.target.value)}
                  placeholder={jobNumber}
                  className={`text-center font-mono text-sm h-10 transition-colors ${
                    typedCode && !canConfirmLast ? 'border-red-300 bg-red-50' :
                    canConfirmLast ? 'border-green-400 bg-green-50' : ''
                  }`}
                  autoFocus
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-10 text-sm"
                onClick={handleClose}
              >
                {current.cancelLabel}
              </Button>
              <Button
                className={`flex-1 h-10 text-sm gap-2 ${current.btnColor} transition-all`}
                onClick={handleNext}
                disabled={loading || (isLastStep && !canConfirmLast)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {current.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}