import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, FileText, Ruler, Scissors, ImageIcon, Clock, HardDrive } from 'lucide-react';

export default function QAReport({ report, checkDuration, totalFileSize }) {
  const [open, setOpen] = useState(true);
  if (!report) return null;
  const s = report.summary || {};

  return (
    <div className="space-y-4">
      {/* Collapse Toggle */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        ข้อมูลรายงาน QA
      </button>

      {!open ? null : (
        <>
          {/* Overall Status Banner */}
          <Card className={`border-2 ${report.isReady ? 'border-emerald-400' : 'border-red-400'}`}>
            <CardContent className="py-5">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                  {report.isReady
                    ? <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    : <XCircle className="w-8 h-8 text-red-500" />}
                  <h2 className="text-xl font-bold">
                    {report.isReady ? 'ไฟล์พร้อมส่งพิมพ์' : 'พบปัญหา — ต้องตรวจสอบเพิ่มเติม'}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  ตรวจสอบจำนวนหน้า ขนาดเอกสาร Bleed และเปรียบเทียบภาพ/ตัวอักษร (ค่าเผื่อขยับ ≤1mm)
                </p>
                {(checkDuration != null || totalFileSize != null) && (
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    {checkDuration != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ใช้เวลา: {checkDuration >= 60 ? Math.floor(checkDuration/60) + ' นาที ' + (checkDuration%60) + ' วินาที' : checkDuration + ' วินาที'}
                      </span>
                    )}
                    {totalFileSize != null && (
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5" />
                        ขนาดไฟล์รวม: {totalFileSize >= 1024*1024*1024 ? (totalFileSize/1024/1024/1024).toFixed(2) + ' GB' : (totalFileSize/1024/1024).toFixed(2) + ' MB'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section A: Document Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5" /> A. สรุปรายละเอียดเอกสาร
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                title={`จำนวนหน้า: MASTER ${s.masterPages || 0} หน้า / PRINT ${s.printPages || 0} หน้า`}
                subtitle={s.masterPages === s.printPages ? 'จำนวนหน้าตรงกัน' : 'จำนวนหน้าไม่ตรง!'}
                ok={s.masterPages === s.printPages}
              />
              <DetailRow
                icon={<Ruler className="w-5 h-5" />}
                title={`ขนาดเอกสาร: ${s.detectedSize || 'ไม่ทราบ'}`}
                subtitle={s.isStandard ? `ตรวจพบขนาดมาตรฐาน ${s.detectedSize}` : 'ขนาดไม่ตรงมาตรฐาน'}
                ok={s.isStandard}
              />
              <DetailRow
                icon={<Scissors className="w-5 h-5" />}
                title={`Bleed: ${s.hasBleed ? `ตรวจพบ ~${s.bleedMm}mm` : 'ไม่พบ Bleed'}`}
                subtitle={s.hasBleed ? 'ไฟล์มี Bleed ครบถ้วน' : 'ควรมี Bleed อย่างน้อย 3mm'}
                ok={s.hasBleed}
              />
              <DetailRow
                icon={<ImageIcon className="w-5 h-5" />}
                title={`เปรียบเทียบภาพ/ตัวอักษร: ${s.pagesWithDiffs > 0 ? `พบปัญหา ${s.pagesWithDiffs} หน้า` : 'ไม่พบปัญหา'}`}
                subtitle={s.pagesWithDiffs > 0 ? 'ดูถึงไปในแถบ "จุดที่ผิด" ด้านบน' : 'ภาพตรงกันทุกหน้า'}
                ok={!s.pagesWithDiffs}
              />
            </CardContent>
          </Card>

          {/* Section B: Issues */}
          {report.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> B. รายการปัญหาที่พบ ({report.issues.length} รายการ)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.issues.map((issue, i) => (
                  <div key={i} className={`p-3 rounded-lg border-l-4 ${issue.severity === 'error' ? 'border-l-red-500 bg-red-50' : 'border-l-amber-400 bg-amber-50'}`}>
                    <div className="flex items-start gap-2">
                      <Badge variant={issue.severity === 'error' ? 'destructive' : 'warning'} className="text-[10px] mt-0.5">
                        {issue.severity === 'error' ? 'สูง' : 'เตือน'}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{issue.issue}</p>
                        {issue.type === 'pixel_diff' && (
                          <p className="text-xs text-muted-foreground mt-0.5">ตรวจสอบตัวอักษร รูปภาพ และองค์ประกอบที่ถูกวางไว้ในตำแหน่งของเปรียบเทียบ</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DetailRow({ icon, title, subtitle, ok }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={ok ? 'text-emerald-500' : 'text-red-500'}>{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
