"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';
import { Users, AlertTriangle, TrendingUp, Clock, Calendar, CheckCircle2, Factory } from 'lucide-react';
import Link from 'next/link';
import employeesRaw from '../../../employees_data.json';

// Mock Data for Workload & Capacity (Weekly)
const workloadData = [
  {
    department: 'เตรียมพิมพ์',
    headcount: 4,
    capacityHours: 160, // 4 * 40
    loadHours: 120,
  },
  {
    department: 'เครื่องพิมพ์ Offset',
    headcount: 12,
    capacityHours: 480,
    loadHours: 550, // Overload
  },
  {
    department: 'หลังพิมพ์ (Die-cut/ปั๊ม)',
    headcount: 15,
    capacityHours: 600,
    loadHours: 640, // Overload
  },
  {
    department: 'แพ็กกิ้ง',
    headcount: 8,
    capacityHours: 320,
    loadHours: 250,
  }
];

export default function WorkloadDashboard() {
  const [timeframe, setTimeframe] = useState("week"); // week, month
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => setMounted(true), []);
  
  // Calculate stats based on timeframe mock (If month, multiply by 4 for demo purposes)
  const multiplier = timeframe === "month" ? 4 : 1;
  
  const chartData = workloadData.map(d => ({
    ...d,
    capacityHours: d.capacityHours * multiplier,
    loadHours: d.loadHours * multiplier,
    utilization: Math.round(((d.loadHours * multiplier) / (d.capacityHours * multiplier)) * 100)
  }));

  const totalCapacity = chartData.reduce((acc, curr) => acc + curr.capacityHours, 0);
  const totalLoad = chartData.reduce((acc, curr) => acc + curr.loadHours, 0);
  const utilization = Math.round((totalLoad / totalCapacity) * 100);
  
  const overloadedDepts = chartData.filter(d => d.loadHours > d.capacityHours);
  const requiredOT = overloadedDepts.reduce((acc, curr) => acc + (curr.loadHours - curr.capacityHours), 0);

  // Custom Tooltip for Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const load = payload.find((p: any) => p.dataKey === 'loadHours')?.value || 0;
      const capacity = payload.find((p: any) => p.dataKey === 'capacityHours')?.value || 0;
      const isOverload = load > capacity;
      
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 min-w-[200px]">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-500">ชั่วโมงที่ต้องทำ (Load):</span>
            <span className="font-bold text-slate-800">{load} ชม.</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">ชั่วโมงที่มี (Capacity):</span>
            <span className="font-bold text-slate-800">{capacity} ชม.</span>
          </div>
          <div className={`mt-2 pt-2 border-t border-slate-100 text-sm font-bold ${isOverload ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOverload ? `⚠️ Overload: +${load - capacity} ชม.` : `✓ คงเหลือ: ${capacity - load} ชม.`}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans">
      
      {/* Header & Nav */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F4E79] tracking-tight">BookAndBox Hub <span className="text-[#FFC000]">✦</span></h1>
            <p className="text-slate-500 mt-1 text-sm">Strategic Workload Planner</p>
          </div>
          <nav className="flex gap-2">
            <Link href="/" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ภาพรวมองค์กร (Cockpit)</Link>
            <Link href="/people/manpower" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ภาพรวมบุคคล</Link>
            <Link href="/production/workload" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F4E79] text-white shadow-sm">ปริมาณงาน (Workload)</Link>
            <Link href="/production/live-tracking" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ติดตามการผลิต (Live)</Link>
            <Link href="/people/skills" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ทักษะพนักงาน (Skills)</Link>
            <Link href="/people/org-chart" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">แผนผังองค์กร (Org Chart)</Link>
          </nav>
        </div>
        
        <div className="flex gap-4 items-center ml-4">
          <select 
            value={timeframe} 
            onChange={e => setTimeframe(e.target.value)}
            className="border-slate-200 border rounded-lg px-4 py-2 bg-white text-sm font-medium text-slate-700 shadow-sm"
          >
            <option value="week">สัปดาห์นี้ (This Week)</option>
            <option value="month">เดือนนี้ (This Month)</option>
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
            <CardTitle className="text-sm font-medium text-slate-500">โหลดงานรวม (Total Load)</CardTitle>
            <Factory className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{totalLoad.toLocaleString()} <span className="text-sm font-normal text-slate-500">ชม.</span></div>
            <p className="text-xs text-slate-500 mt-1">ออเดอร์ใน Pipeline</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">กำลังคนที่มี (Total Capacity)</CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{totalCapacity.toLocaleString()} <span className="text-sm font-normal text-emerald-500">ชม.</span></div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center">จากพนักงาน 39 คน</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-l-4 ${utilization > 100 ? 'border-l-red-500' : utilization > 80 ? 'border-l-[#FFC000]' : 'border-l-emerald-500'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">อัตราการใช้งาน (Utilization)</CardTitle>
            <TrendingUp className={`w-4 h-4 ${utilization > 100 ? 'text-red-500' : utilization > 80 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${utilization > 100 ? 'text-red-600' : utilization > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {utilization}%
            </div>
            <p className="text-xs text-slate-500 mt-1">เป้าหมาย: 80-90%</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-l-4 ${requiredOT > 0 ? 'border-l-red-500' : 'border-l-slate-200'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">ล่วงเวลาที่ต้องการ (Required OT)</CardTitle>
            <Clock className={`w-4 h-4 ${requiredOT > 0 ? 'text-red-400' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${requiredOT > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {requiredOT.toLocaleString()} <span className={`text-sm font-normal ${requiredOT > 0 ? 'text-red-400' : 'text-slate-500'}`}>ชม.</span>
            </div>
            {requiredOT > 0 
              ? <p className="text-xs text-red-500 mt-1 font-medium">⚠️ อนุมัติ OT ด่วน</p>
              : <p className="text-xs text-slate-500 mt-1">✓ พนักงานเพียงพอ</p>
            }
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-[#1F4E79]">Load vs Capacity (ปริมาณงาน vs กำลังคน)</CardTitle>
                  <CardDescription>วิเคราะห์คอขวดแยกตามแผนกผลิต</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-96 pt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="department" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="capacityHours" name="กำลังคนที่มี (Capacity)" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="loadHours" name="งานที่ต้องทำ (Load)" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.loadHours > entry.capacityHours ? '#ef4444' : '#2E75B6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Key Actions */}
        <div className="space-y-8">
          <Card className="shadow-sm border-t-4 border-t-red-500">
            <CardHeader>
              <CardTitle className="text-lg text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> ข้อเสนอแนะเชิงกลยุทธ์ (HR Strategy)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overloadedDepts.length > 0 ? (
                  overloadedDepts.map(dept => {
                    const otHours = dept.loadHours - dept.capacityHours;
                    const otCost = otHours * 85; // Mock 85 THB/hour OT rate
                    const newHireCost = 15000 / (timeframe === "month" ? 1 : 4); // Appx monthly salary cost prorated
                    const shouldHire = otCost > newHireCost;
                    
                    return (
                      <div key={dept.department} className={`p-4 rounded-xl border ${shouldHire ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                        <div className="flex gap-3">
                          <div className="mt-1">
                            {shouldHire ? <AlertTriangle className="w-4 h-4 text-red-500"/> : <Clock className="w-4 h-4 text-amber-500"/>}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${shouldHire ? 'text-red-900' : 'text-amber-900'}`}>
                              คอขวด: {dept.department}
                            </p>
                            <p className={`text-xs mt-1 ${shouldHire ? 'text-red-700' : 'text-amber-700'}`}>
                              ขาดกำลังผลิต {otHours} ชม.
                            </p>
                            
                            <div className="mt-3 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">ต้นทุนกรณีให้ทำ OT:</span>
                                <span className="font-semibold">฿{otCost.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">ต้นทุนกรณีจ้างใหม่ 1 คน:</span>
                                <span className="font-semibold">฿{Math.round(newHireCost).toLocaleString()}</span>
                              </div>
                            </div>
                            
                            <button className={`mt-3 w-full py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-colors ${shouldHire ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                              {shouldHire ? 'อนุมัติงบจ้างพนักงานใหม่' : 'อนุมัติงบ OT พิเศษ'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-900">กำลังคนสมดุล</p>
                    <p className="text-xs text-emerald-700 mt-1">สามารถรับออเดอร์เพิ่มได้อีก</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
