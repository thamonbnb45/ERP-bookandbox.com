"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Users, BookOpen, UserCheck, Search, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import employeesRaw from '../../../employees_data.json';

// Mock Skills Data mapped to employees
const skillColumns = [
  { id: 'prepress', name: 'งานเตรียมพิมพ์ (Pre-press)' },
  { id: 'offset', name: 'คุมเครื่อง Offset' },
  { id: 'digital', name: 'คุมเครื่อง Digital' },
  { id: 'diecut', name: 'เครื่องปั๊ม (Die-cut)' },
  { id: 'folding', name: 'เครื่องพับ/เข้าเล่ม' },
];

export default function SkillsMatrixPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const employees = employeesRaw as any[];

  // Generate mock skills for employees in production dept
  const productionStaff = employees
    .filter(e => e.status !== "ลาออก" && ["ผลิต", "คลังสินค้า"].includes(e.department))
    .map((emp, i) => {
      // Predict primary skill based on position name roughly, and add some random cross-skills
      const primarySkillId = emp.position.includes("พิมพ์") ? 'offset' 
                           : emp.position.includes("ปั๊ม") ? 'diecut'
                           : emp.position.includes("เข้าเล่ม") ? 'folding'
                           : 'prepress';
      
      const skills: any = {};
      skillColumns.forEach(col => {
        if (col.id === primarySkillId) {
          skills[col.id] = 3; // Expert
        } else {
          // Randomly assign 0 (None), 1 (Beginner), 2 (Intermediate)
          const rand = Math.random();
          skills[col.id] = rand > 0.8 ? 2 : rand > 0.6 ? 1 : 0;
        }
      });

      return {
        ...emp,
        skills
      };
    })
    .filter(e => e.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || e.position.toLowerCase().includes(searchTerm.toLowerCase()));

  // Calculate Single Point of Failure (SPOF)
  const skillCounts: any = {};
  skillColumns.forEach(col => {
    const experts = productionStaff.filter(e => e.skills[col.id] >= 2).length;
    skillCounts[col.id] = experts;
  });

  const spofAlerts = skillColumns.filter(col => skillCounts[col.id] <= 2);

  const getSkillColor = (level: number) => {
    if (level === 3) return "bg-emerald-500 text-white"; // Expert
    if (level === 2) return "bg-blue-400 text-white"; // Capable
    if (level === 1) return "bg-amber-300 text-amber-900"; // Beginner
    return "bg-slate-100 text-slate-300"; // None
  };

  const getSkillLabel = (level: number) => {
    if (level === 3) return "ผู้เชี่ยวชาญ";
    if (level === 2) return "ทำได้อิสระ";
    if (level === 1) return "กำลังฝึกหัด";
    return "-";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans">
      
      {/* Header & Nav */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F4E79] tracking-tight">BookAndBox Hub <span className="text-[#FFC000]">✦</span></h1>
            <p className="text-slate-500 mt-1 text-sm">Cross-Training & Skill Matrix</p>
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
        
        <div className="flex gap-4 items-center ml-4">
          <Avatar>
            <AvatarFallback className="bg-[#1F4E79] text-white">B&B</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-sm border-l-4 border-l-[#2E75B6]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">พนักงานฝ่ายผลิต</CardTitle>
            <Users className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{productionStaff.length} <span className="text-sm font-normal text-slate-500">คน</span></div>
            <p className="text-xs text-slate-500 mt-1">อัปเดตทักษะล่าสุด: วันนี้</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">ดัชนีทดแทนงาน (Cross-Training)</CardTitle>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">68%</div>
            <p className="text-xs text-emerald-600 mt-1">พนักงาน 1 คนทำได้มากกว่า 1 หน้าที่</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-l-4 ${spofAlerts.length > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">ความเสี่ยงทักษะขาดแคลน (SPOF)</CardTitle>
            <ShieldAlert className={`w-4 h-4 ${spofAlerts.length > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${spofAlerts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {spofAlerts.length} <span className="text-sm font-normal">จุดเสี่ยง</span>
            </div>
            {spofAlerts.length > 0 
              ? <p className="text-xs text-red-500 mt-1">ต้องการอบรมด่วน: {spofAlerts.map(s => s.name).join(', ')}</p>
              : <p className="text-xs text-emerald-500 mt-1">ปลอดภัย ไม่มีทักษะใดขาดแคลน</p>
            }
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg text-[#1F4E79]">ตารางทักษะพนักงาน (Skill Matrix Heatmap)</CardTitle>
            <CardDescription>แสดงระดับความสามารถในการคุมเครื่องจักรเพื่อการวางแผนกำลังคนสำรอง</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ ตำแหน่ง..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 transition-shadow"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          <div className="flex gap-4 mb-4 text-xs font-medium">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> ผู้เชี่ยวชาญ (สอนผู้อื่นได้)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> ทำได้อิสระ (รันงานจริงได้)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-300 rounded-sm"></div> กำลังฝึกหัด (ต้องการพี่เลี้ยง)</div>
          </div>

          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="text-left p-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 rounded-tl-lg">พนักงาน</th>
                {skillColumns.map(col => (
                  <th key={col.id} className="text-center p-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    {col.name}
                    {skillCounts[col.id] <= 2 && (
                      <span className="block text-[10px] text-red-500 mt-1"><AlertTriangle className="w-3 h-3 inline mr-1"/> เสี่ยงขาดแคลน</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productionStaff.map((emp, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 border border-slate-200">
                        <AvatarFallback className="bg-white text-slate-600 text-xs">{emp.nickname?.substring(0,2) || 'BB'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{emp.firstName} ({emp.nickname})</p>
                        <p className="text-[10px] text-slate-500">{emp.position}</p>
                      </div>
                    </div>
                  </td>
                  {skillColumns.map(col => (
                    <td key={col.id} className="p-3 text-center">
                      <div className={`mx-auto w-8 h-8 rounded flex items-center justify-center text-xs font-bold shadow-sm ${getSkillColor(emp.skills[col.id])}`} title={getSkillLabel(emp.skills[col.id])}>
                        {emp.skills[col.id] > 0 ? emp.skills[col.id] : ''}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
