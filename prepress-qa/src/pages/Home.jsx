import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { loadSettings } from '@/lib/settingsManager';
import { loadPdf, renderAllPages } from '@/lib/pdfRenderer';
import { loadImageAsCanvas } from '@/lib/imageLoader';
import { compareCanvases } from '@/lib/pixelDiff';
import { detectBleed, cropBleed } from '@/lib/bleedCropper';
import { parseJobCode } from '@/lib/jobCodeParser';
import { detectDocumentType } from '@/lib/documentTypeDetector';
import { generateReport } from '@/lib/reportGenerator';
import DiffViewer from '@/components/prepress/DiffViewer';
import DocumentSizeBar from '@/components/prepress/DocumentSizeBar';
import QAReport from '@/components/prepress/QAReport';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileCheck, Loader2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg';

export default function Home() {
  const { user } = useAuth();
  const [masterFile, setMasterFile] = useState(null);
  const [printFile, setPrintFile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [report, setReport] = useState(null);
  const [pageResults, setPageResults] = useState([]);
  const [masterPages, setMasterPages] = useState([]);
  const [printPagesData, setPrintPagesData] = useState([]);
  const [masterInfo, setMasterInfo] = useState(null);
  const [printInfo, setPrintInfo] = useState(null);
  const [sizeInfo, setSizeInfo] = useState(null);
  const [bleedInfo, setBleedInfo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [checkDuration, setCheckDuration] = useState(null);
  const [totalFileSize, setTotalFileSize] = useState(null);

  useEffect(() => { loadSettings().then(setSettings); }, []);

  const isPdf = (f) => f?.type === 'application/pdf' || f?.name?.endsWith('.pdf');
  const onFile = (setter) => (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f) setter(f);
  };

  const reset = () => {
    setMasterFile(null); setPrintFile(null); setReport(null);
    setPageResults([]); setMasterPages([]); setPrintPagesData([]);
    setMasterInfo(null); setPrintInfo(null); setSizeInfo(null); setBleedInfo(null);
    setProgress(0);
  };

  const runCheck = async () => {
    if (!masterFile || !printFile || !settings) return;
    const startTime = Date.now();
    setChecking(true); setReport(null); setPageResults([]); setProgress(5);
    setCheckDuration(null); setTotalFileSize(null);
    setProgressText('กำลังโหลดไฟล์...');
    const fileSizeBytes = (masterFile?.size || 0) + (printFile?.size || 0);
    setTotalFileSize(fileSizeBytes);

    try {
      let mPages, pPages, mWmm = 0, mHmm = 0, pWmm = 0, pHmm = 0;

      if (isPdf(masterFile)) {
        setProgressText('กำลัง render Master PDF...');
        const doc = await loadPdf(masterFile);
        mPages = await renderAllPages(doc, settings.render_scale || 2);
        if (mPages[0]) { mWmm = mPages[0].widthMm; mHmm = mPages[0].heightMm; }
      } else {
        const r = await loadImageAsCanvas(masterFile);
        mPages = [{ ...r, pageNum: 1, widthMm: 0, heightMm: 0 }];
      }
      setMasterPages(mPages);
      setProgress(25);

      if (isPdf(printFile)) {
        setProgressText('กำลัง render Print PDF...');
        const doc = await loadPdf(printFile);
        pPages = await renderAllPages(doc, settings.render_scale || 2);
        if (pPages[0]) { pWmm = pPages[0].widthMm; pHmm = pPages[0].heightMm; }
      } else {
        const r = await loadImageAsCanvas(printFile);
        pPages = [{ ...r, pageNum: 1, widthMm: 0, heightMm: 0 }];
      }
      setPrintPagesData(pPages);
      setProgress(40);

      const mi = { pages: mPages.length, widthMm: Math.round(mWmm * 10) / 100, heightMm: Math.round(mHmm * 10) / 100 };
      const pi = { pages: pPages.length, widthMm: Math.round(pWmm * 10) / 100, heightMm: Math.round(pHmm * 10) / 100 };
      setMasterInfo(mi); setPrintInfo(pi);

      // Bleed
      setProgressText('กำลังตรวจจับ Bleed...');
      const bl = detectBleed(mPages[0].canvas, settings.bleed_mm || 3);
      setBleedInfo(bl);
      setProgress(50);

      // Size
      let stdSizes = [], docRules = [];
      try { stdSizes = typeof settings.standard_sizes === 'string' ? JSON.parse(settings.standard_sizes) : settings.standard_sizes; } catch {}
      try { docRules = typeof settings.document_type_rules === 'string' ? JSON.parse(settings.document_type_rules) : settings.document_type_rules; } catch {}
      const si = detectDocumentType(mWmm, mHmm, mPages.length, docRules, stdSizes);
      setSizeInfo(si);

      // Pixel diff
      setProgressText('กำลังเปรียบเทียบ pixel...');
      const results = [];
      const cnt = Math.min(mPages.length, pPages.length);
      const shiftPx = Math.round(((settings.shift_tolerance_mm || 2) / 25.4) * 300 * (settings.render_scale || 2));

      for (let i = 0; i < cnt; i++) {
        let mc = mPages[i].canvas, pc = pPages[i].canvas;
        if (bl.hasBleed && bl.bleedPixels > 0) {
          mc = cropBleed(mc, bl.bleedPixels);
          pc = cropBleed(pc, bl.bleedPixels);
        }
        const r = compareCanvases(mc, pc, { threshold: settings.diff_threshold || 30, shiftTolerance: shiftPx });
        results.push({ ...r, pageNum: i + 1 });
        setProgress(50 + Math.round((i + 1) / cnt * 35));
        setProgressText(`เปรียบเทียบหน้า ${i + 1}/${cnt}...`);
      }
      setPageResults(results);
      setProgress(90);

      // Report
      setProgressText('กำลังสร้างรายงาน...');
      const rpt = generateReport({ pageResults: results, masterInfo: { pages: mPages.length, widthMm: mWmm, heightMm: mHmm }, printInfo: { pages: pPages.length }, bleedInfo: bl, sizeInfo: si, settings });
      setReport(rpt);
      setProgress(100);
      const durationSec = Math.round((Date.now() - startTime) / 1000);
      setCheckDuration(durationSec);
      setProgressText(`เสร็จสิ้น — ใช้เวลา ${durationSec >= 60 ? Math.floor(durationSec/60) + ' นาที ' + (durationSec%60) + ' วินาที' : durationSec + ' วินาที'}`);

      // Save
      const code = parseJobCode(masterFile?.name || '', settings?.job_code_regex);
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('qa_records').insert({
        job_code: code?.code || masterFile?.name || 'UNKNOWN',
        job_year: code?.year || '', job_month: code?.month || '', job_sequence: code?.sequence || '',
        checker_email: user?.email || '',
        checker_name: user?.user_metadata?.full_name || user?.email || '',
        master_filename: masterFile?.name || '', print_filename: printFile?.name || '',
        master_pages: rpt.summary.masterPages, print_pages: rpt.summary.printPages,
        matched_pages: rpt.summary.masterPages - (rpt.summary.pagesWithDiffs || 0),
        mismatched_pages: rpt.summary.pagesWithDiffs || 0,
        is_ready: rpt.isReady, has_errors: !rpt.isReady,
        error_details: rpt.issues.map(d => d.issue).join('; ') || '',
        detected_size: rpt.summary.detectedSize || 'ไม่ทราบ',
        document_type: rpt.summary.documentType || 'other',
        bleed_detected: rpt.summary.hasBleed || false, bleed_mm: rpt.summary.bleedMm || 0,
        check_date: today,
        check_duration_seconds: durationSec,
        total_file_size_bytes: fileSizeBytes,
      });
    } catch (err) {
      console.error('QA Error:', err);
      setReport({ isReady: false, issues: [{ type: 'system', severity: 'error', issue: `เกิดข้อผิดพลาด: ${err.message}` }], summary: {} });
    } finally { setChecking(false); }
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DropZone label="ไฟล์ต้นฉบับ (Master)" file={masterFile} onDrop={onFile(setMasterFile)} color="blue" />
        <DropZone label="ไฟล์พร้อมพิมพ์ (Print Ready)" file={printFile} onDrop={onFile(setPrintFile)} color="purple" />
      </div>

      <div className="flex gap-3 justify-center">
        <Button size="lg" className="gradient-primary border-0 text-white px-8" onClick={runCheck} disabled={!masterFile || !printFile || checking}>
          {checking ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />กำลังตรวจสอบ...</> : <><FileCheck className="mr-2 h-5 w-5" />เริ่มตรวจสอบ</>}
        </Button>
        {report && <Button size="lg" variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />ตรวจใหม่</Button>}
      </div>

      {/* Progress */}
      {checking && (
        <Card className="animate-fade-in"><CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{progressText}</span><span className="font-medium">{progress}%</span></div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent></Card>
      )}

      {/* Results */}
      <AnimatePresence>
        {report && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Size Bar */}
            <DocumentSizeBar masterInfo={masterInfo} printInfo={printInfo} sizeInfo={sizeInfo} bleedInfo={bleedInfo} />

            {/* Visual Diff Viewer */}
            {pageResults.length > 0 && (
              <DiffViewer pageResults={pageResults} masterPages={masterPages} printPages={printPagesData} />
            )}

            {/* QA Report */}
            <QAReport report={report} checkDuration={checkDuration} totalFileSize={totalFileSize} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropZone({ label, file, onDrop, color }) {
  const ref = useRef(null);
  const bg = color === 'blue' ? 'from-blue-50 to-blue-100 border-blue-300 hover:border-blue-400' : 'from-purple-50 to-purple-100 border-purple-300 hover:border-purple-400';
  const ic = color === 'blue' ? 'text-blue-500' : 'text-purple-500';
  return (
    <Card className="overflow-hidden"><CardContent className="p-0">
      <div className={`relative p-8 border-2 border-dashed rounded-lg bg-gradient-to-b ${bg} transition-all cursor-pointer text-center`}
        onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => ref.current?.click()}>
        <input ref={ref} type="file" accept={ACCEPTED} onChange={onDrop} className="hidden" />
        {file ? (
          <div className="space-y-2"><FileCheck className={`w-10 h-10 mx-auto ${ic}`} /><p className="font-medium truncate">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size/1024/1024).toFixed(2)} MB</p></div>
        ) : (
          <div className="space-y-2"><Upload className={`w-10 h-10 mx-auto ${ic} opacity-60`} /><p className="font-medium">{label}</p><p className="text-xs text-muted-foreground">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก (PDF, PNG, JPG)</p></div>
        )}
      </div>
    </CardContent></Card>
  );
}
