"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import employeesRaw from '../../../employees_data.json';
import { Users, AlertTriangle, TrendingUp, Wallet, CheckCircle2, DollarSign, Target } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [filterDept, setFilterDept] = useState("all");

  const employees = employeesRaw as any[];

  // Statistics Calculation
  const stats = useMemo(() => {
    let activeEmployees = employees.filter(e => e.status !== "ลาออก" && (filterDept === "all" || e.department === filterDept));
    
    let totalPayroll = 0;
    let compaRatios: number[] = [];
    let vacancies = 0;
    
    // Some mock vacancies logic based on missing roles in production
    if (filterDept === "all" || filterDept === "ผลิต") vacancies += 3;
    if (filterDept === "all" || filterDept === "IT") vacancies += 1;

    activeEmployees.forEach(e => {
      totalPayroll += parseInt(e.totalIncome?.toString().replace(/,/g, '') || "0");
      
      const salary = parseInt(e.baseSalary?.toString().replace(/,/g, '') || "0");
      const mid = parseInt(e.gradeMid?.toString().replace(/,/g, '') || "1");
      if (salary > 0 && mid > 1) {
        compaRatios.push(salary / mid);
      }
    });

    const avgCompa = compaRatios.length > 0 
      ? (compaRatios.reduce((a,b) => a+b, 0) / compaRatios.length) * 100 
      : 0;

    // Headcount per grade
    const gradeMap: any = {};
    activeEmployees.forEach(e => {
      gradeMap[e.jobGrade] = (gradeMap[e.jobGrade] || 0) + 1;
    });
    
    const gradeData = Object.keys(gradeMap).sort().map(k => ({
      name: k,
      headcount: gradeMap[k]
    }));

    return {
      headcount: activeEmployees.length,
      payroll: totalPayroll,
      avgCompaRatio: avgCompa.toFixed(1),
      vacancies,
      gradeData,
      activeEmployees
    };
  }, [employees, filterDept]);

  // Mock Budget Data 2026
  const budgetData = [
    { month: 'ม.ค.', actual: 820000, budget: 850000, revenue: 3200000 },
    { month: 'ก.พ.', actual: 835000, budget: 850000, revenue: 3400000 },
    { month: 'มี.ค.', actual: 840000, budget: 850000, revenue: 3800000 },
    { month: 'เม.ย.', actual: 880000, budget: 870000, revenue: 3100000 }, // Over budget due to OT
    { month: 'พ.ค.', actual: 890000, budget: 870000, revenue: 3600000 },
  ];

  const laborCostPercentage = ((budgetData[4].actual / budgetData[4].revenue) * 100).toFixed(1);

  // Departments for filter
  const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

  return (
    <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans">
      
      {/* Header & Nav */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F4E79] tracking-tight">BookAndBox Hub <span className="text-[#FFC000]">✦</span></h1>
            <p className="text-slate-500 mt-1 text-sm">Strategic Manpower Budget Plan 2026</p>
          </div>
          <nav className="flex gap-2">
            <Link href="/" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ภาพรวมองค์กร (Cockpit)</Link>
            <Link href="/people/manpower" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F4E79] text-white shadow-sm">ภาพรวมบุคคล</Link>
            <Link href="/production/workload" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ปริมาณงาน (Workload)</Link>
            <Link href="/production/live-tracking" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ติดตามการผลิต (Live)</Link>
            <Link href="/people/skills" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ทักษะพนักงาน (Skills)</Link>
            <Link href="/people/org-chart" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">แผนผังองค์กร (Org Chart)</Link>
          </nav>
        </div>
        
        <div className="flex gap-4 items-center ml-4">
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="border-slate-200 border rounded-lg px-4 py-2 bg-white text-sm font-medium text-slate-700 shadow-sm"
          >
            <option value="all">ทุกแผนก (All Departments)</option>
            {departments.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
          </select>
          <Avatar>
            <AvatarFallback className="bg-[#1F4E79] text-white">B&B</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-sm border-l-4 border-l-[#2E75B6]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">รวมพนักงาน (Headcount)</CardTitle>
            <Users className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{stats.headcount} <span className="text-sm font-normal text-slate-500">คน</span></div>
            <p className="text-xs text-green-600 mt-1 flex items-center"><Target className="w-3 h-3 mr-1"/> แผนปี 2026: 45 คน</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">งบเงินเดือน (Actual Payroll)</CardTitle>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{(stats.payroll/1000).toFixed(1)}k <span className="text-sm font-normal text-emerald-500">฿/ด</span></div>
            <p className="text-xs text-red-500 mt-1 font-medium">สูงกว่างบ 20k (จาก OT)</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-[#FFC000]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">% Labor Cost (ต่อยอดขาย)</CardTitle>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{laborCostPercentage}%</div>
            <p className="text-xs text-slate-500 mt-1">เกณฑ์มาตรฐาน: &lt;25%</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">ต้องการคนเพิ่ม (Vacancies)</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.vacancies} <span className="text-sm font-normal text-red-400">ตำแหน่ง</span></div>
            <p className="text-xs text-slate-500 mt-1">งบจ้างใหม่: 45k/เดือน</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-[#1F4E79]">Payroll Budget vs Actual (งบประมาณเทียบจ่ายจริง)</CardTitle>
              <CardDescription>วิเคราะห์ต้นทุนแรงงานรวม OT เทียบกับงบที่ตั้งไว้ในปี 2026</CardDescription>
            </CardHeader>
            <CardContent className="h-72 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={budgetData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip 
                    formatter={(value: any) => `฿${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="budget" name="งบประมาณ (Budget)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="actual" name="จ่ายจริงรวม OT (Actual)" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1F4E79]">กระจายตัวพนักงานตามระดับ (Job Grade Distribution)</CardTitle>
              <CardDescription>แสดงจำนวนคนในแต่ละกระบอกเงินเดือน</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.gradeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Bar dataKey="headcount" radius={[4, 4, 0, 0]}>
                    {stats.gradeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name.startsWith('G') ? '#2E75B6' : '#FFC000'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Key Actions & List */}
        <div className="space-y-8">
          <Card className="shadow-sm border-t-4 border-t-red-500">
            <CardHeader>
              <CardTitle className="text-lg text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> แจ้งเตือนงบประมาณ (Budget Alerts)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex gap-3">
                  <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-red-500"></div></div>
                  <div>
                    <p className="text-sm font-semibold text-red-900">Over Budget: แผนกเครื่องพิมพ์</p>
                    <p className="text-xs text-red-700 mt-1">จ่าย OT เกินงบ 20,000 บาท แนะนำให้รีบจ้างพนักงานใหม่ 1 ตำแหน่งตามแผน</p>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                  <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div></div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">รอปรับตำแหน่ง (Compa-Ratio &gt; 120%)</p>
                    <p className="text-xs text-amber-700 mt-1">พนักงาน 2 ท่าน ชนเพดานกระบอกเงินเดือน</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1F4E79]">รายชื่อพนักงานล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {stats.activeEmployees.slice(0, 8).map((emp, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 border border-slate-200 shadow-sm">
                        <AvatarFallback className="bg-[#f8fafc] text-slate-600 text-xs font-bold">{emp.nickname?.substring(0,2) || 'BB'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{emp.nickname}</p>
                        <p className="text-xs text-slate-500">{emp.position}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={emp.jobGrade.startsWith('G') ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}>
                      {emp.jobGrade}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
