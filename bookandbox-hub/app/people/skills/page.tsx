"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Search, Filter, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import skillsRaw from '../../../skills_data.json';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function SkillsMatrixPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  const data = skillsRaw as any[];
  
  const departments = [...new Set(data.map(d => d.department))].filter(Boolean);
  
  // Extract all unique competencies from the first employee
  const allCompetencies = data[0]?.competencies || [];
  
  const filteredData = data.filter(emp => {
    const matchDept = filterDept === "all" || emp.department === filterDept;
    const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDept && matchSearch;
  });

  const getGapColor = (gap: number) => {
    if (gap <= 0) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (gap === 1) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200 font-bold";
  };

  const prepareRadarData = (emp: any) => {
    // Take top 8 functional + core for radar
    return emp.competencies.slice(0, 8).map((c: any) => ({
      subject: c.code,
      fullMark: 5,
      actual: c.actual,
      expectation: c.expectation
    }));
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
            <Link href="/" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ภาพรวมองค์กร (Cockpit)</Link>
            <Link href="/people/manpower" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ภาพรวมบุคคล</Link>
            <Link href="/production/workload" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ปริมาณงาน (Workload)</Link>
            <Link href="/production/live-tracking" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ติดตามการผลิต (Live)</Link>
            <Link href="/people/skills" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F4E79] text-white shadow-sm">ทักษะพนักงาน (Skills)</Link>
            <Link href="/people/org-chart" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">แผนผังองค์กร (Org Chart)</Link>
          </nav>
        </div>
      </div>

      <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#2E75B6]"/> 
            Competency Gap Analysis
          </h2>
          <p className="text-slate-500 mt-1">ตารางวิเคราะห์ช่องว่างทักษะพนักงาน เพื่อวางแผนการฝึกอบรม (Training Plan)</p>
        </div>
        
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ, ตำแหน่ง..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:border-[#2E75B6]"
            />
          </div>
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="border-slate-200 border rounded-lg px-4 py-2 bg-white text-sm font-medium text-slate-700 shadow-sm outline-none"
          >
            <option value="all">ทุกฝ่าย (All Depts)</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#1F4E79] text-white">
                <th className="p-4 font-semibold w-64 sticky left-0 bg-[#1F4E79] z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">พนักงาน</th>
                <th className="p-4 font-semibold w-24 text-center border-l border-white/20">ระดับ</th>
                {allCompetencies.map((comp: any, i: number) => (
                  <th key={i} className="p-2 py-4 font-medium text-center border-l border-white/20 min-w-[80px]" title={comp.name}>
                    <div className="text-[11px] opacity-80">{comp.code}</div>
                    <div className="truncate w-20 mx-auto text-xs">{comp.name.split(' ')[0]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredData.map((emp, i) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedEmp(emp)}>
                  <td className="p-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 border border-slate-200">
                        <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-bold">{emp.name?.substring(0,2) || 'BB'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-slate-800">{emp.name}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{emp.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center border-l border-slate-100 font-medium text-slate-600">{emp.level}</td>
                  
                  {emp.competencies.map((comp: any, j: number) => (
                    <td key={j} className="p-1 border-l border-slate-100 text-center">
                      <div className={`mx-auto w-10 h-8 flex items-center justify-center rounded border ${getGapColor(comp.gap)}`}>
                        {comp.actual}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr><td colSpan={allCompetencies.length + 2} className="p-8 text-center text-slate-500">ไม่พบข้อมูลพนักงาน</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex justify-end gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded border bg-emerald-100 border-emerald-200"></div> ผ่านเกณฑ์ / เกินเป้า</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded border bg-amber-100 border-amber-200"></div> ขาด 1 ระดับ (ควรพัฒนา)</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded border bg-red-100 border-red-200"></div> ขาด &gt; 1 ระดับ (ต้องอบรมด่วน)</div>
      </div>

      {/* Radar Chart Modal */}
      <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
        {selectedEmp && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-3">
                <Avatar className="w-10 h-10 border"><AvatarFallback>{selectedEmp.name.substring(0,2)}</AvatarFallback></Avatar>
                <div>
                  <div>{selectedEmp.name} <Badge variant="outline" className="ml-2">{selectedEmp.level}</Badge></div>
                  <div className="text-sm font-normal text-slate-500 mt-1">{selectedEmp.position} | {selectedEmp.department}</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="h-[300px] w-full bg-slate-50 rounded-xl border border-slate-100 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={prepareRadarData(selectedEmp)}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Radar name="มาตรฐาน (Expectation)" dataKey="expectation" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                    <Radar name="คะแนนจริง (Actual)" dataKey="actual" stroke="#2E75B6" fill="#3b82f6" fillOpacity={0.5} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500"/> ทักษะที่ต้องเร่งพัฒนา (Gap &gt; 0)</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {selectedEmp.competencies.filter((c:any) => c.gap > 0).map((c:any, i:number) => (
                    <div key={i} className={`p-3 rounded-lg border flex justify-between items-center ${c.gap > 1 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                      <div>
                        <div className={`text-xs font-bold ${c.gap > 1 ? 'text-red-700' : 'text-amber-700'}`}>{c.code}</div>
                        <div className="text-sm font-medium text-slate-800">{c.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">เป้า: {c.expectation}</div>
                        <div className={`text-lg font-bold ${c.gap > 1 ? 'text-red-600' : 'text-amber-600'}`}>ทำได้: {c.actual}</div>
                      </div>
                    </div>
                  ))}
                  {selectedEmp.competencies.filter((c:any) => c.gap > 0).length === 0 && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5"/> ไม่มีจุดอ่อนที่ต้องเร่งพัฒนา
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
