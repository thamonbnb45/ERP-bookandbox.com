import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { th } from 'date-fns/locale';
import { BarChart3, CheckCircle2, XCircle, FileCheck, Users, Loader2, Download } from 'lucide-react';
import { queryClientInstance } from '@/lib/query-client';

const PERIODS = [
  { key: 'daily', label: 'วันนี้' },
  { key: 'weekly', label: 'สัปดาห์นี้' },
  { key: 'monthly', label: 'เดือนนี้' },
  { key: 'yearly', label: 'ปีนี้' },
];

export default function Reports() {
  const { user, isAdmin } = useAuth();
  const [period, setPeriod] = useState('daily');

  // Supabase Realtime — auto-refresh เมื่อมี record ใหม่
  useEffect(() => {
    const channel = supabase
      .channel('qa_records_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'qa_records' },
        () => queryClientInstance.invalidateQueries({ queryKey: ['qa-records'] })
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // คำนวณ date range
  const getDateFrom = () => {
    const now = new Date();
    switch (period) {
      case 'daily': return startOfDay(now);
      case 'weekly': return startOfWeek(now, { weekStartsOn: 1 });
      case 'monthly': return startOfMonth(now);
      case 'yearly': return startOfYear(now);
      default: return startOfDay(now);
    }
  };

  // Query records จาก Supabase (RLS จะ filter ให้อัตโนมัติ)
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['qa-records', period],
    queryFn: async () => {
      const dateFrom = getDateFrom().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('qa_records')
        .select('*')
        .gte('check_date', dateFrom)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const totalChecks = records.length;
  const readyCount = records.filter(r => r.is_ready).length;
  const errorCount = records.filter(r => !r.is_ready).length;
  const passRate = totalChecks > 0 ? Math.round((readyCount / totalChecks) * 100) : 0;

  // Checker summary (admin only)
  const checkerSummary = isAdmin ? Object.values(
    records.reduce((acc, r) => {
      const email = r.checker_email || 'ไม่ทราบ';
      if (!acc[email]) acc[email] = { email, name: r.checker_name || email, total: 0, ready: 0, error: 0 };
      acc[email].total++;
      if (r.is_ready) acc[email].ready++; else acc[email].error++;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total) : [];

  return (
    <div className="space-y-6">
      {/* Period Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            {PERIODS.map(p => (
              <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={<FileCheck className="w-5 h-5" />} label="ตรวจทั้งหมด" value={totalChecks} color="bg-blue-500" />
        <StatsCard icon={<CheckCircle2 className="w-5 h-5" />} label="ผ่าน (Ready)" value={readyCount} color="bg-emerald-500" />
        <StatsCard icon={<XCircle className="w-5 h-5" />} label="ไม่ผ่าน" value={errorCount} color="bg-red-500" />
        <StatsCard icon={<BarChart3 className="w-5 h-5" />} label="อัตราผ่าน" value={`${passRate}%`} color="bg-purple-500" />
      </div>

      {/* Checker Summary — Admin Only */}
      {isAdmin && checkerSummary.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" />สรุปตามผู้ตรวจ</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">ผู้ตรวจ</th>
                    <th className="text-center py-2 px-3">ตรวจทั้งหมด</th>
                    <th className="text-center py-2 px-3">ผ่าน</th>
                    <th className="text-center py-2 px-3">ไม่ผ่าน</th>
                    <th className="text-center py-2 px-3">อัตราผ่าน</th>
                  </tr>
                </thead>
                <tbody>
                  {checkerSummary.map(c => (
                    <tr key={c.email} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3"><span className="font-medium">{c.name}</span><br /><span className="text-xs text-muted-foreground">{c.email}</span></td>
                      <td className="text-center py-2 px-3">{c.total}</td>
                      <td className="text-center py-2 px-3 text-emerald-600">{c.ready}</td>
                      <td className="text-center py-2 px-3 text-red-600">{c.error}</td>
                      <td className="text-center py-2 px-3">{Math.round((c.ready / c.total) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">ประวัติการตรวจ ({records.length} รายการ)</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ยังไม่มีข้อมูลในช่วงเวลานี้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">รหัสงาน</th>
                    {isAdmin && <th className="text-left py-2 px-3">ผู้ตรวจ</th>}
                    <th className="text-center py-2 px-3">สถานะ</th>
                    <th className="text-center py-2 px-3">ขนาด</th>
                    <th className="text-center py-2 px-3">ประเภท</th>
                    <th className="text-center py-2 px-3">หน้า</th>
                    <th className="text-center py-2 px-3">เวลาตรวจ</th>
                    <th className="text-center py-2 px-3">ขนาดไฟล์</th>
                    <th className="text-left py-2 px-3">วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-3 font-medium">{r.job_code}</td>
                      {isAdmin && <td className="py-2 px-3 text-muted-foreground">{r.checker_name || r.checker_email}</td>}
                      <td className="text-center py-2 px-3">
                        <Badge variant={r.is_ready ? 'success' : 'destructive'}>{r.is_ready ? 'ผ่าน' : 'ไม่ผ่าน'}</Badge>
                      </td>
                      <td className="text-center py-2 px-3 text-muted-foreground">{r.detected_size || '-'}</td>
                      <td className="text-center py-2 px-3 text-muted-foreground">{r.document_type || '-'}</td>
                      <td className="text-center py-2 px-3">{r.master_pages || 0}</td>
                      <td className="text-center py-2 px-3 text-muted-foreground">{r.check_duration_seconds != null ? (r.check_duration_seconds >= 60 ? Math.floor(r.check_duration_seconds/60) + 'น. ' + (r.check_duration_seconds%60) + 'ว.' : r.check_duration_seconds + ' วิ.') : '-'}</td>
                      <td className="text-center py-2 px-3 text-muted-foreground">{r.total_file_size_bytes ? (r.total_file_size_bytes >= 1024*1024*1024 ? (r.total_file_size_bytes/1024/1024/1024).toFixed(1) + ' GB' : (r.total_file_size_bytes/1024/1024).toFixed(1) + ' MB') : '-'}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.check_date ? format(new Date(r.check_date), 'd MMM yyyy', { locale: th }) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ icon, label, value, color }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center">
          <div className={`${color} p-4 flex items-center justify-center text-white`}>{icon}</div>
          <div className="p-4 flex-1">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
