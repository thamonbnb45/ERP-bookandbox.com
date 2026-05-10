"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertTriangle, ChevronLeft, Package, Ruler, Hash, RotateCcw } from 'lucide-react';
import Link from 'next/link';

// ขั้นตอนหลังพิมพ์ทั้งหมด
const PROCESS_STEPS = [
  { id: 'cut', label: 'ตัด', icon: '🔪', color: '#3B82F6' },
  { id: 'fold', label: 'พับ', icon: '📐', color: '#8B5CF6' },
  { id: 'coat', label: 'เคลือบ', icon: '🧴', color: '#EC4899' },
  { id: 'laminate', label: 'ลามิเนต', icon: '🪞', color: '#14B8A6' },
  { id: 'diecut', label: 'ไดคัท', icon: '⬡', color: '#F59E0B' },
  { id: 'foil', label: 'ปั๊มฟอยล์', icon: '✨', color: '#EF4444' },
  { id: 'emboss', label: 'ปั๊มนูน', icon: '🔨', color: '#6366F1' },
  { id: 'glue', label: 'ปะ/ติดกาว', icon: '🧲', color: '#10B981' },
  { id: 'bind', label: 'เข้าเล่ม', icon: '📚', color: '#0EA5E9' },
  { id: 'sew', label: 'เย็บ', icon: '🧵', color: '#D946EF' },
  { id: 'spot_uv', label: 'Spot UV', icon: '💎', color: '#F97316' },
  { id: 'pack', label: 'แพ็ค', icon: '📦', color: '#059669' },
  { id: 'send_supplier', label: 'ส่ง Supplier', icon: '🚚', color: '#7C3AED' },
  { id: 'other', label: 'อื่นๆ', icon: '➕', color: '#6B7280' },
];

// ปริมาณด่วน
const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 3000, 5000, 10000];

type LogStep = 'scan' | 'process' | 'count' | 'done';

interface JobInfo {
  id: string;
  jobNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  productType: string;
}

export default function ProductionLogPage() {
  const [step, setStep] = useState<LogStep>('scan');
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [goodCount, setGoodCount] = useState<string>('');
  const [defectCount, setDefectCount] = useState<string>('0');
  const [scrapNote, setScrapNote] = useState('');
  const [measureMode, setMeasureMode] = useState<'count' | 'height'>('count');
  const [heightCm, setHeightCm] = useState<string>('');
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [manualJobId, setManualJobId] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate scanning QR code (in real app, use camera API)
  const handleScanOrManual = () => {
    const jobId = manualJobId.trim() || 'JOB-103';
    // Mock job data - in production, this queries Supabase
    const mockJob: JobInfo = {
      id: '1',
      jobNumber: jobId.toUpperCase(),
      customerName: 'บริษัท แสนสิริ จำกัด',
      productName: 'ใบปลิว A4 • 4 สี 2 ด้าน เคลือบ PVC ด้าน',
      quantity: 5879,
      productType: 'leaflet',
    };
    setJobInfo(mockJob);
    setStep('process');
  };

  const handleSelectProcess = (processId: string) => {
    setSelectedProcess(processId);
    if (processId === 'send_supplier') {
      setMeasureMode('height');
    }
    setStep('count');
  };

  const handleQuickAmount = (amount: number) => {
    setGoodCount(String(amount));
  };

  const handleSave = async () => {
    if (!jobInfo || !selectedProcess) return;
    setSaving(true);

    const logEntry = {
      jobNumber: jobInfo.jobNumber,
      customerName: jobInfo.customerName,
      process: selectedProcess,
      goodCount: measureMode === 'count' ? Number(goodCount) : null,
      defectCount: Number(defectCount),
      heightCm: measureMode === 'height' ? Number(heightCm) : null,
      scrapNote,
      supplierName: selectedProcess === 'send_supplier' ? supplierName : null,
      measureMode,
      note,
      timestamp: new Date().toISOString(),
      worker: 'พนักงาน', // In production: from login session
    };

    // TODO: Save to Supabase via API
    // await fetch('/api/production/log', { method: 'POST', body: JSON.stringify(logEntry) });

    setTodayLogs(prev => [logEntry, ...prev]);
    setSaving(false);
    setStep('done');
  };

  const handleReset = () => {
    setStep('scan');
    setJobInfo(null);
    setSelectedProcess('');
    setGoodCount('');
    setDefectCount('0');
    setScrapNote('');
    setMeasureMode('count');
    setHeightCm('');
    setSupplierName('');
    setNote('');
    setManualJobId('');
  };

  const processInfo = PROCESS_STEPS.find(p => p.id === selectedProcess);

  return (
    <div className="min-h-screen bg-slate-100 font-sans" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="bg-[#1F4E79] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          {step !== 'scan' && (
            <button onClick={handleReset} className="p-2 -ml-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold tracking-tight">🏭 บันทึกงานผลิต</h1>
            <p className="text-xs text-blue-200">BookAndBox Production Logger</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-200">{new Date().toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p className="text-sm font-bold">{todayLogs.length} รายการวันนี้</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white px-4 py-2 flex gap-1 border-b">
        {['สแกน QR', 'เลือกงาน', 'กรอกจำนวน', 'เสร็จ'].map((label, i) => {
          const stepIdx = ['scan', 'process', 'count', 'done'].indexOf(step);
          return (
            <div key={label} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1 transition-all ${i <= stepIdx ? 'bg-[#1F4E79]' : 'bg-slate-200'}`} />
              <span className={`text-[10px] ${i <= stepIdx ? 'text-[#1F4E79] font-bold' : 'text-slate-400'}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Scan QR / Enter Job ID */}
      {step === 'scan' && (
        <div className="p-4 space-y-4">
          {/* QR Scanner placeholder */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center shadow-xl">
            <Camera className="w-16 h-16 mx-auto text-white/60 mb-3" />
            <p className="text-white font-bold text-lg">📷 สแกน QR Code</p>
            <p className="text-slate-400 text-sm mt-1">เอามือถือส่องที่ QR บน Job Ticket</p>
            <button
              onClick={() => handleScanOrManual()}
              className="mt-4 bg-[#FFC000] text-slate-900 font-bold py-3 px-8 rounded-xl text-lg shadow-lg active:scale-95 transition-transform"
            >
              📷 เปิดกล้องสแกน
            </button>
          </div>

          {/* Manual entry */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <p className="text-sm font-bold text-slate-700 mb-2">หรือพิมพ์เลข Job เอง:</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualJobId}
                onChange={(e) => setManualJobId(e.target.value)}
                placeholder="เช่น JOB-103"
                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-mono focus:border-[#1F4E79] outline-none"
              />
              <button
                onClick={handleScanOrManual}
                className="bg-[#1F4E79] text-white font-bold px-6 rounded-xl active:scale-95 transition-transform text-lg"
              >
                ค้นหา
              </button>
            </div>
          </div>

          {/* Today's log summary */}
          {todayLogs.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <p className="text-sm font-bold text-slate-700 mb-2">📋 บันทึกวันนี้ ({todayLogs.length} รายการ)</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {todayLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                    <span className="text-xl">{PROCESS_STEPS.find(p => p.id === log.process)?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{log.jobNumber} • {log.customerName}</p>
                      <p className="text-xs text-slate-500">
                        {PROCESS_STEPS.find(p => p.id === log.process)?.label}
                        {log.goodCount != null && ` • ✅ ${log.goodCount.toLocaleString()}`}
                        {log.defectCount > 0 && ` • ❌ ${log.defectCount}`}
                        {log.heightCm != null && ` • 📏 ${log.heightCm} ซม.`}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Select Process */}
      {step === 'process' && jobInfo && (
        <div className="p-4 space-y-4">
          {/* Job info card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="bg-[#1F4E79] text-white text-xs font-bold px-2 py-0.5 rounded">{jobInfo.jobNumber}</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{jobInfo.customerName}</p>
                <p className="text-sm text-slate-600">{jobInfo.productName}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#1F4E79]">{jobInfo.quantity.toLocaleString()}</p>
                <p className="text-xs text-slate-500">ใบ</p>
              </div>
            </div>
          </div>

          {/* Process grid */}
          <p className="text-sm font-bold text-slate-700">เลือกขั้นตอนที่ทำ:</p>
          <div className="grid grid-cols-3 gap-3">
            {PROCESS_STEPS.map((proc) => (
              <button
                key={proc.id}
                onClick={() => handleSelectProcess(proc.id)}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center shadow-sm active:scale-95 active:border-[#1F4E79] transition-all hover:shadow-md"
                style={{ borderColor: selectedProcess === proc.id ? proc.color : undefined }}
              >
                <span className="text-3xl block mb-1">{proc.icon}</span>
                <span className="text-sm font-bold text-slate-700">{proc.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Enter Count */}
      {step === 'count' && jobInfo && processInfo && (
        <div className="p-4 space-y-4">
          {/* Job + Process summary */}
          <div className="bg-white rounded-2xl p-3 shadow-sm border flex items-center gap-3">
            <span className="text-3xl">{processInfo.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">{jobInfo.jobNumber} • {processInfo.label}</p>
              <p className="text-xs text-slate-500">{jobInfo.customerName} • {jobInfo.productName}</p>
            </div>
          </div>

          {/* Mode toggle for supplier jobs */}
          {selectedProcess === 'send_supplier' && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
              <p className="text-sm font-bold text-purple-800 mb-2">ส่ง Supplier — วัดแบบไหน?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMeasureMode('count')}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition ${measureMode === 'count' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 border border-purple-300'}`}
                >
                  <Hash className="w-4 h-4" /> นับใบ
                </button>
                <button
                  onClick={() => setMeasureMode('height')}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition ${measureMode === 'height' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 border border-purple-300'}`}
                >
                  <Ruler className="w-4 h-4" /> วัดความสูง (ซม.)
                </button>
              </div>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="ชื่อ Supplier เช่น ร้านเคลือบอาร์ม"
                className="mt-2 w-full border border-purple-200 rounded-xl px-3 py-2 text-sm focus:border-purple-500 outline-none"
              />
            </div>
          )}

          {/* Count input */}
          {measureMode === 'count' ? (
            <>
              {/* ของดี */}
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-emerald-800 flex items-center gap-1 mb-2">
                  <CheckCircle2 className="w-4 h-4" /> ของดี (ใบ)
                </p>
                <input
                  type="number"
                  inputMode="numeric"
                  value={goodCount}
                  onChange={(e) => setGoodCount(e.target.value)}
                  placeholder="0"
                  className="w-full text-center text-4xl font-black py-3 border-2 border-emerald-300 rounded-xl focus:border-emerald-500 outline-none bg-white"
                />
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleQuickAmount(amt)}
                      className="bg-white border border-emerald-300 rounded-xl py-2 text-sm font-bold text-emerald-700 active:bg-emerald-100 active:scale-95 transition"
                    >
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* ของเสีย */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-red-800 flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-4 h-4" /> ของเสีย (ใบ)
                </p>
                <input
                  type="number"
                  inputMode="numeric"
                  value={defectCount}
                  onChange={(e) => setDefectCount(e.target.value)}
                  placeholder="0"
                  className="w-full text-center text-3xl font-black py-2 border-2 border-red-300 rounded-xl focus:border-red-500 outline-none bg-white"
                />
                <input
                  type="text"
                  value={scrapNote}
                  onChange={(e) => setScrapNote(e.target.value)}
                  placeholder="หมายเหตุเศษ/สาเหตุ (ถ้ามี)"
                  className="mt-2 w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 outline-none"
                />
              </div>
            </>
          ) : (
            /* Height measurement mode */
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-purple-800 flex items-center gap-1 mb-2">
                <Ruler className="w-4 h-4" /> ความสูง (เซนติเมตร)
              </p>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="0.0"
                className="w-full text-center text-4xl font-black py-3 border-2 border-purple-300 rounded-xl focus:border-purple-500 outline-none bg-white"
              />
              <p className="text-xs text-purple-600 mt-2 text-center">วัดความสูงของกองกระดาษ (ซม.)</p>
            </div>
          )}

          {/* Note */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="📝 หมายเหตุเพิ่มเติม (ถ้ามี)"
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#1F4E79] outline-none"
          />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || (measureMode === 'count' && !goodCount) || (measureMode === 'height' && !heightCm)}
            className="w-full py-4 rounded-2xl font-bold text-xl shadow-lg active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 bg-[#1F4E79] text-white"
          >
            {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึก!'}
          </button>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 'done' && (
        <div className="p-4 flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm w-full">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">บันทึกสำเร็จ! ✅</h2>
            <p className="text-slate-500 mb-6">ข้อมูลเข้า ERP แล้ว</p>

            {jobInfo && processInfo && (
              <div className="bg-slate-50 rounded-xl p-3 mb-6 text-left">
                <p className="text-sm font-bold text-slate-700">{jobInfo.jobNumber} • {processInfo.label} {processInfo.icon}</p>
                <p className="text-xs text-slate-500">{jobInfo.customerName}</p>
                {goodCount && <p className="text-sm text-emerald-600 font-bold mt-1">✅ ของดี: {Number(goodCount).toLocaleString()} ใบ</p>}
                {Number(defectCount) > 0 && <p className="text-sm text-red-600 font-bold">❌ ของเสีย: {Number(defectCount).toLocaleString()} ใบ</p>}
                {heightCm && <p className="text-sm text-purple-600 font-bold">📏 ความสูง: {heightCm} ซม.</p>}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleReset}
                className="w-full py-4 rounded-2xl font-bold text-lg bg-[#1F4E79] text-white shadow-lg active:scale-[0.98] transition"
              >
                📷 สแกนงานถัดไป
              </button>
              <Link
                href="/"
                className="w-full py-3 rounded-2xl font-bold text-sm bg-slate-100 text-slate-600 block text-center active:bg-slate-200 transition"
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="flex">
          <Link href="/factory/log" className="flex-1 py-3 text-center text-[#1F4E79]">
            <Package className="w-5 h-5 mx-auto" />
            <span className="text-[10px] font-bold block mt-0.5">บันทึกงาน</span>
          </Link>
          <Link href="/factory/ai" className="flex-1 py-3 text-center text-slate-400">
            <span className="text-xl block">🤖</span>
            <span className="text-[10px] font-bold block mt-0.5">AI ช่วยเหลือ</span>
          </Link>
          <Link href="/factory/knowledge" className="flex-1 py-3 text-center text-slate-400">
            <span className="text-xl block">📚</span>
            <span className="text-[10px] font-bold block mt-0.5">คู่มือ/คลิป</span>
          </Link>
          <Link href="/" className="flex-1 py-3 text-center text-slate-400">
            <span className="text-xl block">📊</span>
            <span className="text-[10px] font-bold block mt-0.5">Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Bottom padding for nav */}
      <div className="h-20" />
    </div>
  );
}
