"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Target, Users, Factory, DollarSign, Flag, Package, MessageSquare, Database, CheckCircle2, Clock, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import strategyData from '../strategy_data.json';
import { getDashboardStats } from '@/lib/data';
import Link from 'next/link';

// --- Sub-components ---

function ProjectCard({ project }: { project: any }) {
  const [open, setOpen] = React.useState(false);
  const doneCount = project.subtasks.filter((s: any) => s.done).length;
  const totalCount = project.subtasks.length;
  const statusColors: any = {
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ เสร็จแล้ว' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: '⚙️ กำลังทำ' },
    planned: { bg: 'bg-slate-100', text: 'text-slate-600', label: '📋 วางแผน' },
  };
  const sc = statusColors[project.status] || statusColors.planned;

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50 transition">
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0"/> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0"/>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-800 truncate">{project.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-slate-500">👤 {project.owner}</span>
            <span className="text-xs text-slate-400">{doneCount}/{totalCount} งานย่อย</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-lg font-black ${project.progress === 100 ? 'text-emerald-600' : project.progress >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
            {project.progress}%
          </span>
          <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className={`h-full rounded-full ${project.progress === 100 ? 'bg-emerald-500' : project.progress >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${project.progress}%` }}/>
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t px-4 py-3 bg-slate-50/50 space-y-1.5">
          {project.subtasks.map((st: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {st.done
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/>
                : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0"/>}
              <span className={st.done ? 'text-slate-500 line-through' : 'text-slate-700'}>{st.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function StrategyCockpitPage() {
  const { kpis, okrs, problems, projects } = strategyData as any;
  const [liveStats, setLiveStats] = React.useState<any>(null);
  const [dbStatus, setDbStatus] = React.useState<'loading' | 'connected' | 'error'>('loading');

  React.useEffect(() => {
    getDashboardStats()
      .then((stats) => { setLiveStats(stats); setDbStatus('connected'); })
      .catch(() => setDbStatus('error'));
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);

  const allProjects = projects.departments.flatMap((d: any) => d.projects);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F4E79] tracking-tight">BookAndBox Hub <span className="text-[#FFC000]">✦</span></h1>
          </div>
          <nav className="flex gap-1 flex-wrap">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1F4E79] text-white">CEO Cockpit</Link>
            <Link href="/people/manpower" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100">บุคคล</Link>
            <Link href="/production" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100">ระบบผลิต</Link>
            <Link href="/people/skills" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100">ทักษะ</Link>
            <Link href="/people/org-chart" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100">ผังองค์กร</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">ภูมิพัฒน์ (CEO)</p>
            <p className="text-xs text-emerald-600 flex items-center justify-end gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {dbStatus === 'connected' ? 'Supabase Connected ✓' : dbStatus === 'loading' ? 'Connecting...' : 'Offline Mode'}
            </p>
          </div>
          <Avatar className="w-10 h-10 border-2 border-slate-200">
            <AvatarFallback className="bg-[#1F4E79] text-white">CEO</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Section 1: Strategy Cockpit Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Target className="w-7 h-7 text-[#2E75B6]"/>
          Strategy Cockpit — ภาพรวมโครงการพัฒนาทั้งหมด
        </h2>
        <p className="text-slate-500 mt-1 text-sm">สรุปโครงการ, KPI, ปัญหา และข้อมูล Real-time เพื่อการตัดสินใจของผู้บริหาร</p>
      </div>

      {/* Section 2: Project Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        <Card className="shadow-sm border-l-4 border-l-[#1F4E79]">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-black text-[#1F4E79]">{projects.summary.total_projects}</p>
            <p className="text-xs text-slate-500 mt-1">โครงการทั้งหมด</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-violet-500">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-black text-violet-600">{projects.summary.total_departments}</p>
            <p className="text-xs text-slate-500 mt-1">แผนกที่เกี่ยวข้อง</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-black text-blue-600">{projects.summary.total_subtasks}</p>
            <p className="text-xs text-slate-500 mt-1">งานย่อยทั้งหมด</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-black text-emerald-600">{projects.summary.completed}</p>
            <p className="text-xs text-slate-500 mt-1">เสร็จสมบูรณ์</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-black text-amber-600">{projects.summary.in_progress}</p>
            <p className="text-xs text-slate-500 mt-1">กำลังดำเนินการ</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-slate-400">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-black text-slate-600">{projects.summary.overall_progress}%</p>
            <p className="text-xs text-slate-500 mt-1">ความคืบหน้ารวม</p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#1F4E79] h-full rounded-full" style={{width:`${projects.summary.overall_progress}%`}}/>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Projects by Department */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Flag className="w-5 h-5 text-[#2E75B6]"/> โครงการพัฒนาแยกตามแผนก
        </h3>
        <div className="space-y-6">
          {projects.departments.map((dept: any) => {
            const deptDone = dept.projects.filter((p: any) => p.status === 'completed').length;
            const deptTotal = dept.projects.length;
            const deptAvgProgress = Math.round(dept.projects.reduce((s: number, p: any) => s + p.progress, 0) / deptTotal);
            return (
              <div key={dept.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b" style={{ borderLeftWidth: 5, borderLeftColor: dept.color }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{dept.icon}</span>
                    <div>
                      <h4 className="font-bold text-slate-800">{dept.name}</h4>
                      <p className="text-xs text-slate-500">{deptDone}/{deptTotal} โครงการเสร็จ | เฉลี่ย {deptAvgProgress}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${deptAvgProgress}%`, backgroundColor: dept.color }}/>
                    </div>
                    <span className="text-sm font-black" style={{ color: dept.color }}>{deptAvgProgress}%</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {dept.projects.map((proj: any) => (
                    <ProjectCard key={proj.id} project={proj}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Live DB Stats */}
      {liveStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-50/50 to-white">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">ยอดขายรวม (DB)</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(liveStats.totalRevenue)}</p>
              <p className="text-[10px] text-violet-500 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Live จาก Supabase
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-white">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Job Orders</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{liveStats.totalJobs} <span className="text-sm font-normal text-slate-500">งาน</span></p>
              <p className="text-[10px] text-slate-500 mt-2">✅ เสร็จ {liveStats.completedJobs} | ⏳ ค้าง {liveStats.pendingJobs}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-white">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Leads</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{liveStats.totalLeads} <span className="text-sm font-normal text-slate-500">ราย</span></p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-white">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">ลูกค้า</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{liveStats.totalCustomers} <span className="text-sm font-normal text-slate-500">ราย</span></p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 5: KPI + OKRs + Problems (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-sm border-t-4 border-t-[#2E75B6]">
          <CardHeader className="pb-2 bg-slate-50/50"><CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider"><DollarSign className="w-4 h-4 text-[#2E75B6]"/> ยอดขาย</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-black text-slate-800">{formatCurrency(kpis.sales.actual)}</div>
            <p className="text-xs text-slate-500 mt-1">เป้าหมาย: {formatCurrency(kpis.sales.target)}</p>
            <div className="h-12 mt-3 -mx-6 -mb-6 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.sales.trendData}>
                  <defs><linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2E75B6" stopOpacity={0.3}/><stop offset="95%" stopColor="#2E75B6" stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="sales" stroke="#2E75B6" strokeWidth={2} fill="url(#cs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-t-4 border-t-[#FFC000]">
          <CardHeader className="pb-2 bg-slate-50/50"><CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider"><Factory className="w-4 h-4 text-amber-500"/> การผลิต</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">OEE</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{kpis.production.oee}%</div>
              </div>
              <div>
                <p className="text-xs text-slate-500">ของเสีย</p>
                <div className="text-2xl font-black text-red-600 mt-1">{kpis.production.defectRate}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-t-4 border-t-emerald-500">
          <CardHeader className="pb-2 bg-slate-50/50"><CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider"><Users className="w-4 h-4 text-emerald-600"/> กำลังคน</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Compa-Ratio</p>
                <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.people.compaRatio}%</div>
              </div>
              <div>
                <p className="text-xs text-slate-500">อัตราขาด/ลา</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{kpis.people.absenteeism}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* OKRs */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1F4E79] flex items-center gap-2"><Flag className="w-5 h-5"/> OKRs Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {okrs.map((okr: any) => (
                <div key={okr.id}>
                  <div className="flex justify-between items-end mb-1.5">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{okr.objective}</p>
                      <p className="text-xs text-slate-500">👤 {okr.owner}</p>
                    </div>
                    <span className="text-sm font-bold text-[#2E75B6]">{okr.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${okr.status === 'at_risk' ? 'bg-red-500' : 'bg-[#2E75B6]'}`} style={{ width: `${okr.progress}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Problems */}
        <Card className="shadow-sm border border-red-100">
          <CardHeader className="bg-red-50/30 border-b border-red-50">
            <CardTitle className="text-lg text-red-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> แจ้งเตือนปัญหา</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {problems.map((prob: any) => (
                <div key={prob.id} className="p-3 rounded-xl border bg-white shadow-sm flex gap-3 items-start relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${prob.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}/>
                  <div className={`p-1.5 rounded-lg ${prob.severity === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    <AlertTriangle className="w-4 h-4"/>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">{prob.title}</h4>
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                      <span>{prob.department}</span>
                      <span>👤 {prob.assignedTo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
