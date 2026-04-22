import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, FileText, Copy, Check, Printer } from 'lucide-react';
import moment from 'moment';
import ReactMarkdown from 'react-markdown';

export default function DailyReportModal({ open, onClose, jobs, queueEntries }) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setReport('');

    const today = moment().format('DD MMMM YYYY');

    const jobSummaries = jobs.map(job => {
      const entries = queueEntries.filter(q => q.job_id === job.id);
      const totalHours = entries.reduce((sum, e) => sum + (e.estimated_hours || 0), 0);
      const latestEnd = entries.reduce((latest, e) => {
        const end = new Date(e.scheduled_end);
        return end > latest ? end : latest;
      }, new Date(0));
      const hasSchedule = entries.length > 0 && latestEnd.getFullYear() > 2000;

      return {
        job_number: job.job_number,
        product_type: job.product_type,
        quantity: job.quantity,
        sheets: job.sheets,
        status: job.status,
        priority: job.priority,
        postpress_steps: job.postpress_steps || [],
        total_hours: totalHours.toFixed(1),
        estimated_completion: hasSchedule ? moment(latestEnd).format('DD/MM/YYYY HH:mm') : '-',
        estimated_delivery: job.estimated_delivery
          ? moment(job.estimated_delivery).format('DD/MM/YYYY')
          : hasSchedule ? moment(latestEnd).add(1, 'day').format('DD/MM/YYYY') : '-',
        due_date: job.due_date || '-',
        notes: job.notes || '',
      };
    });

    const statusCount = {};
    jobs.forEach(j => { statusCount[j.status] = (statusCount[j.status] || 0) + 1; });
    const priorityCount = {};
    jobs.forEach(j => { priorityCount[j.priority] = (priorityCount[j.priority] || 0) + 1; });

    const prompt = `คุณคือผู้ช่วยฝ่ายผลิตโรงพิมพ์ Offset Printing กรุณาสรุปรายงานการประชุมประจำวัน ${today} จากข้อมูลต่อไปนี้:

สถิติรวม:
- งานทั้งหมด: ${jobs.length} งาน
- สถานะงาน: ${Object.entries(statusCount).map(([k,v]) => `${k} ${v} งาน`).join(', ')}
- ระดับความสำคัญ: ${Object.entries(priorityCount).map(([k,v]) => `${k} ${v} งาน`).join(', ')}

รายละเอียดงานแต่ละชิ้น:
${JSON.stringify(jobSummaries, null, 2)}

กรุณาสรุปเป็นรายงานการประชุมภาษาไทย โดยมีหัวข้อดังนี้:
1. สรุปภาพรวมการผลิตวันนี้
2. งานที่กำลังดำเนินการ (printing/prepress/postpress)
3. งานที่ต้องติดตามเร่งด่วน (urgent/rush หรือใกล้ due_date)
4. งานที่เสร็จแล้วหรือส่งมอบแล้ว
5. ข้อเสนอแนะและการติดตามงาน

เขียนให้กระชับ ชัดเจน เหมาะสำหรับนำเสนอในที่ประชุม`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setReport(result);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>รายงานการประชุมประจำวัน — ${moment().format('DD MMMM YYYY')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px 40px; }
    h1 { font-size: 16px; font-weight: 700; border-bottom: 2px solid #1a5c2a; padding-bottom: 8px; margin-bottom: 16px; color: #1a5c2a; }
    h2, h3 { font-size: 13px; font-weight: 700; margin-top: 14px; margin-bottom: 4px; color: #1a5c2a; }
    p { line-height: 1.7; margin-bottom: 6px; }
    ul, ol { padding-left: 18px; margin-bottom: 8px; }
    li { line-height: 1.7; }
    strong { font-weight: 700; }
    .header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .date { font-size: 11px; color: #666; margin-top: 2px; }
    @media print {
      body { padding: 20px 28px; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>รายงานการประชุมประจำวัน — ${moment().format('DD MMMM YYYY')}</h1>
      <div class="date">สร้างโดยระบบ PrintFlow • ${moment().format('HH:mm น.')}</div>
    </div>
  </div>
  <div id="content">${report.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^### (.*)/gm, '<h3>$1</h3>').replace(/^## (.*)/gm, '<h2>$1</h2>').replace(/^# (.*)/gm, '<h2>$1</h2>').replace(/^(\d+)\. (.*)/gm, '<p><strong>$1. $2</strong></p>')}</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            รายงานการประชุมประจำวัน — {moment().format('DD MMMM YYYY')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2">
          {!report && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <FileText className="w-12 h-12 text-gray-200" />
              <p className="text-gray-400 text-sm">กดปุ่มด้านล่างเพื่อสร้างรายงานการประชุมจากข้อมูลงานทั้งหมด</p>
              <Button onClick={generateReport} className="bg-gray-900 hover:bg-gray-800 text-white">
                <FileText className="w-4 h-4 mr-2" />
                สร้างรายงาน
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              <p className="text-gray-400 text-sm">กำลังสร้างรายงาน...</p>
            </div>
          )}

          {report && !loading && (
            <div className="prose prose-sm prose-gray max-w-none p-4 bg-gray-50 rounded-xl text-sm leading-relaxed">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          )}
        </div>

        {report && !loading && (
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={generateReport}>
              สร้างใหม่
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                พิมพ์
              </Button>
              <Button size="sm" onClick={handleCopy} className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}