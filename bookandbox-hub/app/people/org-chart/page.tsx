"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Network, Search } from 'lucide-react';
import employeesRaw from '../../../employees_data.json';
import Link from 'next/link';

// Helper to determine Level
const getLevelCategory = (emp: any) => {
  const level = emp.personalLevel || '';
  const pos = (emp.position || '').toLowerCase();
  
  if (level.includes('จ') || pos.includes('ผู้จัดการ') || pos.includes('gm') || pos.includes('director')) return 'J'; // จ.
  if (level.includes('บ') || pos.includes('หน.') || pos.includes('หัวหน้า')) return 'B'; // บ.
  return 'P'; // ป.
};

const EmployeeCard = ({ employee }: { employee: any }) => (
  <Card className="w-56 shadow-sm border border-slate-200 hover:border-[#2E75B6] transition-colors relative z-10 bg-white">
    <CardContent className="p-3 flex items-center gap-3">
      <Avatar className={`w-10 h-10 border-2 ${getLevelCategory(employee) === 'J' ? 'border-[#FFC000]' : 'border-slate-100'}`}>
        <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
          {employee.nickname?.substring(0,2) || employee.name?.substring(0,2) || 'BB'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 text-sm truncate">{employee.nickname || employee.name}</h3>
        <p className="text-[10px] text-slate-500 truncate">{employee.position}</p>
        <div className="flex gap-1 mt-1">
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-50">{employee.department}</Badge>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{employee.personalLevel || employee.jobGrade}</Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function OrgChartPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  
  // Exclude empty rows or headers
  const data = (employeesRaw as any[]).filter(e => e.id && e.nickname && e.nickname !== 'ชื่อเล่น');

  // Get unique departments
  const departments = [...new Set(data.map(d => d.department))].filter(d => d && d !== 'ผู้บริหาร');

  // Filter data based on search and dept
  const filteredData = data.filter(emp => {
    const matchSearch = (emp.nickname || '').includes(searchTerm) || (emp.name || '').includes(searchTerm);
    const matchDept = filterDept === "all" || emp.department === filterDept;
    // Don't filter out CEO when searching/filtering if we want them at top, but for now just filter.
    return matchSearch && matchDept;
  });

  // Group by Levels
  const levelJ = filteredData.filter(e => getLevelCategory(e) === 'J' && e.department !== 'ผู้บริหาร');
  const levelB = filteredData.filter(e => getLevelCategory(e) === 'B' && e.department !== 'ผู้บริหาร');
  const levelP = filteredData.filter(e => getLevelCategory(e) === 'P' && e.department !== 'ผู้บริหาร');

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
            <Link href="/people/skills" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ทักษะพนักงาน (Skills)</Link>
            <Link href="/people/org-chart" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F4E79] text-white shadow-sm">แผนผังองค์กร (Org Chart)</Link>
          </nav>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Network className="w-6 h-6 text-[#2E75B6]"/> 
            Live Organization Chart (Top-Down)
          </h2>
          <p className="text-slate-500 mt-1">โครงสร้างบนลงล่าง แยกตามระดับบริหาร (จ), หัวหน้างาน (บ), ปฏิบัติการ (ป)</p>
        </div>
        
        <div className="flex gap-3">
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="border-slate-200 border rounded-lg px-4 py-2 bg-white text-sm font-medium text-slate-700 shadow-sm outline-none"
          >
            <option value="all">ผังองค์กรทั้งหมด (Combined)</option>
            {departments.map(d => <option key={d} value={d}>แยกแผนก: {d}</option>)}
          </select>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:border-[#2E75B6]"
            />
          </div>
        </div>
      </div>

      {/* Top-Down Org Chart Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 overflow-auto min-h-[600px] flex flex-col items-center">
        
        {/* CEO Level */}
        {(filterDept === 'all' || searchTerm === '') && (
          <div className="flex flex-col items-center relative">
            <Card className="w-64 shadow-md border-2 border-[#1F4E79] bg-white relative z-10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Avatar className="w-16 h-16 border-2 border-[#FFC000] mb-2">
                  <AvatarFallback className="bg-[#1F4E79] text-white font-bold">CEO</AvatarFallback>
                </Avatar>
                <h3 className="font-black text-slate-800">ภูมิพัฒน์</h3>
                <p className="text-xs text-slate-500 mt-1">Chief Executive Officer</p>
                <Badge className="mt-2 bg-[#1F4E79]">ผู้บริหาร (Top)</Badge>
              </CardContent>
            </Card>
            
            {/* Vertical Line down from CEO */}
            {(levelJ.length > 0 || levelB.length > 0 || levelP.length > 0) && (
              <div className="w-[2px] h-8 bg-slate-300"></div>
            )}
          </div>
        )}

        {/* Level จ. (Manager / Executive) */}
        {levelJ.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <Badge variant="outline" className="mb-2 bg-amber-50 text-amber-700 border-amber-200">ระดับ จ. (ผู้จัดการ)</Badge>
            {/* Horizontal connection line */}
            {levelJ.length > 1 && <div className="h-[2px] bg-slate-300" style={{ width: `${(levelJ.length - 1) * 240}px` }}></div>}
            <div className="flex justify-center gap-4 relative pt-4">
              {levelJ.map((emp, i) => (
                <div key={emp.id} className="flex flex-col items-center relative">
                  {levelJ.length > 1 && <div className="absolute top-0 w-[2px] h-4 bg-slate-300 -mt-4"></div>}
                  <EmployeeCard employee={emp} />
                  <div className="w-[2px] h-8 bg-slate-200"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level บ. (Supervisor) */}
        {levelB.length > 0 && (
          <div className="flex flex-col items-center w-full mt-4">
            <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">ระดับ บ. (หัวหน้างาน)</Badge>
            <div className="flex flex-wrap justify-center gap-4 relative max-w-5xl">
              {levelB.map(emp => (
                <div key={emp.id} className="flex flex-col items-center relative">
                  <EmployeeCard employee={emp} />
                  <div className="w-[2px] h-6 bg-slate-100"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level ป. (Operational) */}
        {levelP.length > 0 && (
          <div className="flex flex-col items-center w-full mt-6">
            <Badge variant="outline" className="mb-4 bg-slate-100 text-slate-600 border-slate-200">ระดับ ป. (ปฏิบัติการ)</Badge>
            <div className="flex flex-wrap justify-center gap-3 max-w-6xl">
              {levelP.map(emp => (
                <EmployeeCard key={emp.id} employee={emp} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
