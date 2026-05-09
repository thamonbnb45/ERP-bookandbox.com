"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, AlertTriangle, CheckCircle2, Navigation } from 'lucide-react';
import workloadRaw from '../../../workload_data.json';
import Link from 'next/link';

export default function WorkloadHeatmapPage() {
  const [filterStation, setFilterStation] = useState("all");
  const data = workloadRaw as any[];

  const stations = [...new Set(data.map(d => d.station))];
  const filteredData = filterStation === "all" ? data : data.filter(d => d.station === filterStation);

  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

  // Helper to determine cell color based on workload %
  const getCellColor = (val: number) => {
    if (val === 0) return "bg-white border-slate-200 text-slate-400";
    if (val < 50) return "bg-emerald-50 border-emerald-100 text-emerald-700";
    if (val <= 80) return "bg-emerald-200 border-emerald-300 text-emerald-800";
    if (val <= 100) return "bg-amber-200 border-amber-300 text-amber-800";
    if (val <= 120) return "bg-orange-300 border-orange-400 text-orange-900";
    return "bg-red-500 border-red-600 text-white font-bold animate-pulse";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans">
      
      {/* Header & Nav */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F4E79] tracking-tight">BookAndBox Hub</h1>
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
        
        <div className="flex gap-4 items-center">
          <select 
            value={filterStation} 
            onChange={e => setFilterStation(e.target.value)}
            className="border-slate-200 border rounded-lg px-4 py-2 bg-white text-sm font-medium text-slate-700 shadow-sm"
          >
            <option value="all">ทุกแผนก (All Stations)</option>
            {stations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#2E75B6]"/> 
            Workload Heatmap (รายสัปดาห์)
          </h2>
          <p className="text-slate-500 mt-1">ติดตามปริมาณงานที่จ่ายให้พนักงานรายบุคคล เพื่อป้องกันคอขวด</p>
        </div>
        
        {/* Legend */}
        <div className="flex gap-3 text-xs font-medium text-slate-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-white border border-slate-200"></div> ว่าง (0%)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300"></div> ปกติ (&lt;80%)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-200 border border-amber-300"></div> เต็ม (80-100%)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500 border border-red-600"></div> Overload (&gt;120%)</div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#1F4E79] text-white">
                <th className="p-4 font-semibold w-64 text-sm sticky left-0 bg-[#1F4E79] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">พนักงาน (ฝ่ายผลิต)</th>
                {days.map(d => (
                  <th key={d} className="p-4 font-semibold text-center w-28 text-sm border-l border-white/20">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {stations.filter(s => filterStation === 'all' || s === filterStation).map(station => (
                <React.Fragment key={station}>
                  {/* Station Header */}
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td colSpan={7} className="p-2 px-4 font-bold text-sm text-slate-700 bg-slate-100 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      📍 {station}
                    </td>
                  </tr>
                  
                  {filteredData.filter(d => d.station === station).map((emp, i) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-slate-200">
                            <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-bold">{emp.name?.substring(0,2) || 'BB'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{emp.position}</p>
                          </div>
                        </div>
                      </td>
                      
                      {days.map(day => {
                        const val = emp.workload[day];
                        const colorClass = getCellColor(val);
                        return (
                          <td key={day} className="p-1 border-l border-slate-100">
                            <div className={`h-12 w-full rounded-md border flex items-center justify-center transition-all cursor-pointer hover:scale-[1.02] ${colorClass}`}>
                              {val > 0 ? (
                                <span className="text-sm">{val}%</span>
                              ) : (
                                <span className="text-xs opacity-50">-</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="shadow-sm border-l-4 border-l-red-500 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4"/> ตรวจพบ Overload (คอขวด)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">มีพนักงานแผนก <b>Finishing (หลังพิมพ์)</b> โหลดงานเกิน 120% ในวันพฤหัสบดี-ศุกร์ แนะนำให้กระจายงานให้พนักงาน Part-time หรือทำ OT ล่วงหน้า</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4"/> ทรัพยากรคงเหลือ (Available)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-600">แผนก <b>Cutting (ตัด)</b> มีพนักงานว่างงาน (0%) ในวันเสาร์ สามารถจัดตารางทำ Preventive Maintenance (PM) เครื่องจักรได้</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
