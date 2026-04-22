import React, { useState } from 'react';
import { PRINT_METHODS } from '@/utils/printMethod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Info, BookOpen, X } from 'lucide-react';

const METHOD_COLORS = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
};

function QuickRefModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-gray-900">คู่มือวิธีพิมพ์ออฟเซต</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          {Object.values(PRINT_METHODS).map(m => {
            const c = METHOD_COLORS[m.color] || METHOD_COLORS.emerald;
            return (
              <div key={m.key} className={`border rounded-xl p-4 ${c.border} ${c.bg}`}>
                <div className="flex items-start gap-3">
                  {/* SVG Diagram */}
                  <div className="flex-shrink-0">
                    <PrintMethodDiagram method={m.key} size={80} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded font-mono ${c.badge}`}>{m.symbol}</span>
                      <span className="font-bold text-gray-900 text-sm">{m.labelTh}</span>
                      <span className="text-xs text-gray-400">({m.labelEn})</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{m.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">แม่พิมพ์:</span> <strong>{m.plateSets} ชุด</strong></div>
                      <div><span className="text-gray-400">ตัวอย่างงาน:</span> <span>{m.exampleJobs}</span></div>
                      <div className="col-span-2"><span className="text-gray-400">ตัด:</span> {m.cuttingInstruction}</div>
                      {m.warning && (
                        <div className="col-span-2 flex items-start gap-1 text-amber-700">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {m.warning}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Summary table */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['วิธีการ', 'สัญลักษณ์', 'แม่พิมพ์', 'การกลับกระดาษ', 'เหมาะกับ'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-600 font-semibold border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['พิมพ์หน้าเดียว', '1/0', '1 ชุด', 'ไม่กลับ', 'โปสเตอร์, ฉลาก'],
                  ['กลับในตัว W&T', 'W&T', '1 ชุด', 'กลับซ้าย-ขวา', 'หนังสือ, โบรชัวร์'],
                  ['กลับตีลังกา', 'W&Tb', '1 ชุด', 'กลับหัว-ท้าย', 'งานที่กลับซ้าย-ขวาไม่ได้'],
                  ['กลับนอก S/W', 'S/W', '2 ชุด', 'ใช้แม่พิมพ์ต่างชุด', 'หนังสือจำนวนมาก'],
                  ['Perfecting', 'PERF', '2 ชุด', 'พิมพ์พร้อมกัน', 'เครื่องมี Perfector unit'],
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 border-b border-gray-100 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrintMethodDiagram({ method, size = 100 }) {
  const s = size;
  const sw = s * 0.75; // sheet width
  const sh = s * 0.55; // sheet height
  const ox = (s - sw) / 2;
  const oy = (s - sh) / 2;

  if (method === 'single_side') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={ox} y={oy} width={sw} height={sh} rx="3" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
        <text x={s/2} y={s/2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.13} fill="#059669" fontWeight="bold">FRONT</text>
        <text x={s/2} y={oy + sh + s*0.1} textAnchor="middle" fontSize={s*0.09} fill="#6B7280">1 side only</text>
      </svg>
    );
  }

  if (method === 'work_and_turn') {
    const mid = ox + sw / 2;
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={ox} y={oy} width={sw/2 - 1} height={sh} rx="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
        <text x={ox + sw/4} y={oy + sh/2} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.1} fill="#1D4ED8" fontWeight="bold">F</text>
        <rect x={mid + 1} y={oy} width={sw/2 - 1} height={sh} rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,2" />
        <text x={mid + sw/4} y={oy + sh/2} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.1} fill="#3B82F6">B</text>
        {/* cut line */}
        <line x1={mid} y1={oy - 4} x2={mid} y2={oy + sh + 4} stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,2" />
        <text x={mid} y={oy + sh + s*0.12} textAnchor="middle" fontSize={s*0.09} fill="#EF4444">✂</text>
        {/* flip arrow */}
        <text x={s/2} y={s - 4} textAnchor="middle" fontSize={s*0.1} fill="#6B7280">↔ กลับซ้าย-ขวา</text>
      </svg>
    );
  }

  if (method === 'work_and_tumble') {
    const mid = oy + sh / 2;
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={ox} y={oy} width={sw} height={sh/2 - 1} rx="2" fill="#FED7AA" stroke="#F97316" strokeWidth="1.5" />
        <text x={s/2} y={oy + sh/4} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.1} fill="#C2410C" fontWeight="bold">FRONT</text>
        <rect x={ox} y={mid + 1} width={sw} height={sh/2 - 1} rx="2" fill="#FFF7ED" stroke="#F97316" strokeWidth="1.5" strokeDasharray="3,2" />
        <text x={s/2} y={mid + sh/4} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.1} fill="#F97316">BACK</text>
        <line x1={ox - 4} y1={mid} x2={ox + sw + 4} y2={mid} stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,2" />
        <text x={s/2} y={s - 4} textAnchor="middle" fontSize={s*0.1} fill="#6B7280">↕ กลับหัว-ท้าย</text>
      </svg>
    );
  }

  if (method === 'sheet_wise') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={ox + 4} y={oy + 4} width={sw} height={sh} rx="3" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
        <text x={s/2 + 4} y={s/2 + 4} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.09} fill="#7C3AED">กรอบ 2 (หลัง)</text>
        <rect x={ox} y={oy} width={sw} height={sh} rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
        <text x={s/2} y={s/2 - 2} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.09} fill="#1D4ED8">กรอบ 1 (หน้า)</text>
        <text x={s/2} y={s - 4} textAnchor="middle" fontSize={s*0.09} fill="#6B7280">2 แม่พิมพ์</text>
      </svg>
    );
  }

  if (method === 'perfecting') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={ox} y={oy} width={sw} height={sh} rx="3" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" />
        <text x={s/2} y={oy + sh*0.35} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.1} fill="#DC2626" fontWeight="bold">FRONT</text>
        <line x1={ox + 8} y1={oy + sh*0.55} x2={ox + sw - 8} y2={oy + sh*0.55} stroke="#EF4444" strokeWidth="1" strokeDasharray="2,2" />
        <text x={s/2} y={oy + sh*0.75} textAnchor="middle" dominantBaseline="middle" fontSize={s*0.09} fill="#F97316">BACK (same pass)</text>
        <text x={s/2} y={s - 4} textAnchor="middle" fontSize={s*0.09} fill="#6B7280">พิมพ์พร้อมกัน</text>
      </svg>
    );
  }

  return null;
}

export default function PrintMethodPanel({ printMethod, setPrintMethod }) {
  const [showRef, setShowRef] = useState(false);
  const method = PRINT_METHODS[printMethod] || PRINT_METHODS.single_side;
  const c = METHOD_COLORS[method.color] || METHOD_COLORS.emerald;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">วิธีการพิมพ์</h3>
        <button
          onClick={() => setShowRef(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />คู่มือ
        </button>
      </div>

      {/* Dropdown */}
      <Select value={printMethod} onValueChange={setPrintMethod}>
        <SelectTrigger className="h-8 text-xs mb-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(PRINT_METHODS).map(m => (
            <SelectItem key={m.key} value={m.key}>
              <span className="font-mono font-bold mr-2">[{m.symbol}]</span>
              {m.labelTh}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Info card */}
      <div className={`border rounded-xl p-3 ${c.bg} ${c.border}`}>
        <div className="flex items-start gap-3">
          <PrintMethodDiagram method={printMethod} size={72} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono ${c.badge}`}>{method.symbol}</span>
              <span className={`text-xs font-semibold ${c.text}`}>{method.labelEn}</span>
            </div>
            <p className="text-xs text-gray-600 mb-2 leading-relaxed">{method.description}</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-400 w-20 flex-shrink-0">แม่พิมพ์:</span>
                <strong className={c.text}>{method.plateSets} ชุด</strong>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-gray-400 w-20 flex-shrink-0">ตัดหลังพิมพ์:</span>
                <span className="text-gray-700 leading-tight">{method.cuttingInstruction}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        {method.warning && (
          <div className="mt-2 flex items-start gap-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
            <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
            <span className="text-amber-700">{method.warning}</span>
          </div>
        )}

        {/* Info for 2-plate methods */}
        {method.plateSets === 2 && (
          <div className="mt-2 flex items-start gap-1.5 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
            <Info className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-blue-700">วิธีนี้ใช้แม่พิมพ์ 2 ชุด — ค่าแม่พิมพ์จะคิด × 2</span>
          </div>
        )}
      </div>

      {showRef && <QuickRefModal onClose={() => setShowRef(false)} />}
    </div>
  );
}