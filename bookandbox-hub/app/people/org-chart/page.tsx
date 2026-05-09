"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Network, Search, ChevronRight, ChevronDown } from 'lucide-react';
import employeesRaw from '../../../employees_data_with_manager.json';
import Link from 'next/link';

// Simple tree node component
const OrgNode = ({ employee, childrenNodes, depth = 0, isLast = true }: { employee: any, childrenNodes: any[], depth?: number, isLast?: boolean }) => {
  const [expanded, setExpanded] = useState(true);
  
  const hasChildren = childrenNodes && childrenNodes.length > 0;
  
  return (
    <div className={`flex flex-col relative ${depth > 0 ? 'ml-12' : ''}`}>
      {/* Connecting Lines */}
      {depth > 0 && (
        <>
          <div className="absolute -left-6 top-8 w-6 h-[2px] bg-slate-300"></div>
          <div className={`absolute -left-6 top-0 w-[2px] bg-slate-300 ${isLast ? 'h-8' : 'h-full'}`}></div>
        </>
      )}

      {/* Node Card */}
      <div className="relative z-10 py-2">
        <Card className={`w-80 shadow-sm border hover:border-[#2E75B6] transition-colors ${depth === 0 ? 'border-[#1F4E79] shadow-md border-l-4' : 'border-slate-200'} cursor-pointer`} onClick={() => setExpanded(!expanded)}>
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className={`w-12 h-12 border-2 ${depth === 0 ? 'border-[#FFC000]' : 'border-slate-100'}`}>
              <AvatarFallback className={`${depth === 0 ? 'bg-[#1F4E79] text-white' : 'bg-slate-100 text-slate-700'} font-bold`}>
                {employee.nickname?.substring(0,2) || employee.name?.substring(0,2) || 'BB'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                {employee.nickname || employee.name}
                {hasChildren && (
                  <span className="text-slate-400">
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[150px] mt-0.5">{employee.position}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-slate-50">{employee.department}</Badge>
                <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${employee.jobGrade?.startsWith('G') || employee.jobGrade?.startsWith('จ') ? 'bg-blue-50 text-blue-700' : ''}`}>{employee.jobGrade}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Children Container */}
      {hasChildren && expanded && (
        <div className="flex flex-col relative mt-0">
          {childrenNodes.map((childNode: any, index: number) => (
            <OrgNode 
              key={childNode.employee.id} 
              employee={childNode.employee} 
              childrenNodes={childNode.children} 
              depth={depth + 1} 
              isLast={index === childrenNodes.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function OrgChartPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const data = employeesRaw as any[];

  // Build Tree Structure
  const buildTree = () => {
    const map = new Map();
    const roots: any[] = [];

    // Initialize map
    data.forEach(emp => {
      map.set(emp.id, { employee: emp, children: [] });
    });

    // Populate children
    data.forEach(emp => {
      if (emp.manager_id && map.has(emp.manager_id)) {
        map.get(emp.manager_id).children.push(map.get(emp.id));
      } else {
        roots.push(map.get(emp.id));
      }
    });

    return roots;
  };

  const orgTree = buildTree();

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
            <Link href="/people/skills" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ทักษะพนักงาน (Skills)</Link>
            <Link href="/people/org-chart" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F4E79] text-white shadow-sm">แผนผังองค์กร (Org Chart)</Link>
          </nav>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Network className="w-6 h-6 text-[#2E75B6]"/> 
            Live Organization Chart
          </h2>
          <p className="text-slate-500 mt-1">โครงสร้างสายบังคับบัญชา อัปเดตอัตโนมัติจากฐานข้อมูล</p>
        </div>
        
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 overflow-auto min-h-[600px]">
        {orgTree.map(rootNode => (
          <OrgNode key={rootNode.employee.id} employee={rootNode.employee} childrenNodes={rootNode.children} />
        ))}
      </div>
    </div>
  );
}
