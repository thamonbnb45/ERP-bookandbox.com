"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target, Users, Factory, DollarSign, Flag } from 'lucide-react';
import strategyData from '../strategy_data.json';
import Link from 'next/link';

export default function StrategyCockpitPage() {
  const { kpis, okrs, problems } = strategyData;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans">
      
      {/* Header & Nav */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F4E79] tracking-tight">BookAndBox Hub <span className="text-[#FFC000]">✦</span></h1>
          </div>
          <nav className="flex gap-2">
            <Link href="/" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F4E79] text-white shadow-sm">ภาพรวมองค์กร (Cockpit)</Link>
            <Link href="/people/manpower" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ภาพรวมบุคคล</Link>
            <Link href="/production/workload" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ปริมาณงาน (Workload)</Link>
            <Link href="/production/live-tracking" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ติดตามการผลิต (Live)</Link>
            <Link href="/people/skills" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ทักษะพนักงาน (Skills)</Link>
            <Link href="/people/org-chart" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">แผนผังองค์กร (Org Chart)</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">ภูมิพัฒน์ (CEO)</p>
            <p className="text-xs text-emerald-600 flex items-center justify-end gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> System Online</p>
          </div>
          <Avatar className="w-10 h-10 border-2 border-slate-200">
            <AvatarFallback className="bg-[#1F4E79] text-white">CEO</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Target className="w-8 h-8 text-[#2E75B6]"/> 
          Strategy Cockpit (Daily Vitals)
        </h2>
        <p className="text-slate-500 mt-2 text-base">สรุปสถานการณ์แบบ Real-time เพื่อการตัดสินใจของผู้บริหาร</p>
      </div>

      {/* Vitals KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Sales KPI */}
        <Card className="shadow-sm border-t-4 border-t-[#2E75B6] overflow-hidden group">
          <CardHeader className="pb-2 flex flex-row items-center justify-between bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-[#2E75B6]"/> ยอดขาย (Sales)
            </CardTitle>
            <Badge className={kpis.sales.status === 'on_track' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}>
              {kpis.sales.status === 'on_track' ? 'On Track' : 'Below Target'}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4 relative">
            <div className="text-3xl font-black text-slate-800">{formatCurrency(kpis.sales.actual)}</div>
            <div className="flex justify-between items-end mt-2">
              <p className="text-xs text-slate-500">เป้าหมาย: {formatCurrency(kpis.sales.target)}</p>
              <p className="text-sm font-bold text-emerald-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1"/> {kpis.sales.growth}%
              </p>
            </div>
            <div className="h-16 mt-4 -mx-6 -mb-6 opacity-60 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.sales.trendData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E75B6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2E75B6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip formatter={(value: any) => new Intl.NumberFormat('th-TH').format(value)} />
                  <Area type="monotone" dataKey="sales" stroke="#2E75B6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Production KPI */}
        <Card className="shadow-sm border-t-4 border-t-[#FFC000] group">
          <CardHeader className="pb-2 flex flex-row items-center justify-between bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider">
              <Factory className="w-4 h-4 text-amber-500"/> การผลิต (Production)
            </CardTitle>
            <Badge className={kpis.production.status === 'good' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
              {kpis.production.status === 'good' ? 'Optimal' : 'Needs Attention'}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">OEE (ประสิทธิภาพ)</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{kpis.production.oee}%</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${kpis.production.oee}%` }}></div>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">ของเสีย (Defect)</p>
                <div className="text-2xl font-black text-red-600 mt-1">{kpis.production.defectRate}%</div>
                <p className="text-[10px] text-slate-400 mt-1">เป้าหมาย &lt; {kpis.production.defectTarget}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HR KPI */}
        <Card className="shadow-sm border-t-4 border-t-emerald-500 group">
          <CardHeader className="pb-2 flex flex-row items-center justify-between bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-600"/> กำลังคน (People)
            </CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Stable</Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Compa-Ratio</p>
                <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.people.compaRatio}%</div>
                <p className="text-[10px] text-slate-400 mt-1">ดัชนีความคุ้มค่า</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">อัตราขาด/ลา</p>
                <div className="text-2xl font-black text-slate-800 mt-1">{kpis.people.absenteeism}%</div>
                <p className="text-[10px] text-slate-400 mt-1">ต่ำกว่าเกณฑ์ 3%</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Objectives & Key Results (OKRs) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1F4E79] flex items-center gap-2"><Flag className="w-5 h-5"/> เป้าหมายเชิงกลยุทธ์ (OKRs Progress)</CardTitle>
            <CardDescription>ความคืบหน้าของโครงการสำคัญประจำปี</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {okrs.map((okr: any) => (
                <div key={okr.id}>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{okr.objective}</p>
                      <p className="text-xs text-slate-500 mt-0.5">รับผิดชอบโดย: {okr.owner}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#2E75B6]">{okr.progress}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${okr.status === 'at_risk' ? 'bg-red-500' : 'bg-[#2E75B6]'}`} 
                      style={{ width: `${okr.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Problems & CAPA */}
        <Card className="shadow-sm border border-red-100">
          <CardHeader className="bg-red-50/30 border-b border-red-50">
            <CardTitle className="text-lg text-red-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> แจ้งเตือนปัญหา (Action Required)</CardTitle>
            <CardDescription>ปัญหาที่กระทบต่อคุณภาพ (CAPA) หรือคอขวดที่ต้องตัดสินใจ</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {problems.map((prob: any) => (
                <div key={prob.id} className="p-4 rounded-xl border bg-white shadow-sm flex gap-4 items-start relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${prob.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <div className={`p-2 rounded-lg mt-0.5 ${prob.severity === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {prob.severity === 'high' ? <AlertTriangle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm">{prob.title}</h4>
                      <Badge variant="outline" className="text-[10px]">{prob.id}</Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Factory className="w-3 h-3"/> {prob.department}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {prob.assignedTo}</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
                    ติดตาม
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
