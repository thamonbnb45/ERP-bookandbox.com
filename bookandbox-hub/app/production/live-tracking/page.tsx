"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, Clock, PlayCircle, AlertOctagon, Settings2, Server, ServerCrash, Factory, Layers, CalendarClock } from 'lucide-react';
import liveData from '../../../production_live_data.json';
import Link from 'next/link';

export default function ProductionLiveTrackingPage() {
  const { machines } = liveData;

  const [filterType, setFilterType] = useState('All');

  const types = ['All', ...Array.from(new Set(machines.map(m => m.type)))];

  const filteredMachines = filterType === 'All' ? machines : machines.filter(m => m.type === filterType);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'running': return 'bg-emerald-500';
      case 'setup': return 'bg-amber-400';
      case 'downtime': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'running': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200"><PlayCircle className="w-3 h-3 mr-1"/> กำลังเดินเครื่อง</Badge>;
      case 'setup': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200"><Settings2 className="w-3 h-3 mr-1"/> ตั้งเครื่อง/ล้างสี</Badge>;
      case 'downtime': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200"><AlertOctagon className="w-3 h-3 mr-1"/> เครื่องหยุด/รอของ</Badge>;
      default: return null;
    }
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
            <Link href="/production/live-tracking" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1F4E79] text-white shadow-sm">ติดตามการผลิต (Live)</Link>
            <Link href="/people/skills" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">ทักษะพนักงาน (Skills)</Link>
            <Link href="/people/org-chart" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">แผนผังองค์กร (Org Chart)</Link>
          </nav>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#2E75B6]"/> 
            Production Live Tracking
          </h2>
          <p className="text-slate-500 mt-2 text-base">กระดานติดตามสถานะเครื่องจักรและคิวงานแบบ Real-time</p>
        </div>
        
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {types.map(t => (
            <button 
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === t ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {t === 'All' ? 'ทุกเครื่องจักร' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="bg-[#1F4E79] text-white border-none shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">เครื่องจักรทั้งหมด</p>
              <h3 className="text-3xl font-black mt-1">{machines.length}</h3>
            </div>
            <Server className="w-10 h-10 text-blue-400 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-emerald-600 text-white border-none shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">กำลังเดินเครื่อง</p>
              <h3 className="text-3xl font-black mt-1">{machines.filter(m => m.status === 'running').length}</h3>
            </div>
            <PlayCircle className="w-10 h-10 text-emerald-400 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-amber-500 text-white border-none shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-amber-200 text-xs font-bold uppercase tracking-wider">ตั้งเครื่อง / ล้างสี</p>
              <h3 className="text-3xl font-black mt-1">{machines.filter(m => m.status === 'setup').length}</h3>
            </div>
            <Settings2 className="w-10 h-10 text-amber-300 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-red-500 text-white border-none shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-red-200 text-xs font-bold uppercase tracking-wider">เครื่องจอด / รอของ</p>
              <h3 className="text-3xl font-black mt-1">{machines.filter(m => m.status === 'downtime').length}</h3>
            </div>
            <ServerCrash className="w-10 h-10 text-red-300 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* Machine Board */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredMachines.map(machine => (
          <Card key={machine.id} className="shadow-sm border-slate-200 overflow-hidden group">
            {/* Header */}
            <div className={`h-2 w-full ${getStatusColor(machine.status)}`}></div>
            <CardHeader className="bg-white pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] text-slate-500">{machine.id}</Badge>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{machine.type}</span>
                </div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Factory className="w-5 h-5 text-slate-400"/> {machine.name}
                </CardTitle>
              </div>
              {getStatusBadge(machine.status)}
            </CardHeader>

            <CardContent className="p-0 bg-slate-50/50 flex flex-col md:flex-row">
              
              {/* Current Job (Left Panel) */}
              <div className="p-5 flex-1 border-b md:border-b-0 md:border-r border-slate-100 bg-white relative">
                {machine.status === 'downtime' ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6">
                    <ServerCrash className="w-12 h-12 text-red-200 mb-3" />
                    <h4 className="font-bold text-slate-700">เครื่องจักรหยุดทำงาน</h4>
                    <p className="text-sm text-red-600 font-semibold mt-1 bg-red-50 px-3 py-1 rounded-full">สาเหตุ: {machine.downtimeReason}</p>
                  </div>
                ) : machine.currentJob ? (
                  <>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">ปัจจุบัน (Current Job)</h4>
                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-black text-slate-800 text-lg leading-tight">{machine.currentJob.productName}</h3>
                          <p className="text-sm text-[#2E75B6] font-medium mt-1">{machine.currentJob.customer}</p>
                        </div>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">{machine.currentJob.jobNo}</Badge>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>ความคืบหน้า</span>
                        <span className={machine.status === 'running' ? 'text-emerald-600' : 'text-amber-600'}>
                          {machine.currentJob.progress}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${machine.status === 'running' ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                          style={{ width: `${machine.currentJob.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 mt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 border">
                          <AvatarFallback className="text-[9px] font-bold bg-blue-50 text-blue-700">{machine.currentJob.operator.substring(0,1)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-600">{machine.currentJob.operator}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Clock className="w-3.5 h-3.5"/> คาดว่าเสร็จ: <span className="text-slate-800">{machine.currentJob.expectedEnd}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6 text-slate-400">
                    <Factory className="w-10 h-10 opacity-20 mb-2" />
                    <p className="text-sm">ไม่มีงานกำลังผลิต</p>
                  </div>
                )}
              </div>

              {/* Queue (Right Panel) */}
              <div className="p-4 w-full md:w-64 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>คิวต่อไป (Up Next)</span>
                  <Badge variant="outline" className="text-[10px]">{machine.queue.length}</Badge>
                </h4>
                
                {machine.queue.length > 0 ? (
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
                    {machine.queue.map((qJob: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group/job">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 group-hover/job:bg-[#2E75B6] transition-colors"></div>
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-slate-800 truncate pr-2">{qJob.productName}</p>
                          <span className="text-[9px] text-slate-400 mt-0.5">{qJob.jobNo}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{qJob.customer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-4">
                    <Layers className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">เครื่องว่าง ไม่มีคิวงานรอ</p>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        ))}
      </div>
      
    </div>
  );
}
