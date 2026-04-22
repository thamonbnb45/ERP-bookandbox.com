import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StatsCard from '../components/scheduling/StatsCard';
import CapacityMeter from '../components/scheduling/CapacityMeter';
import BottleneckAlert from '../components/scheduling/BottleneckAlert';
import JobScheduleTable from '../components/scheduling/JobScheduleTable';
import DailyReportModal from '../components/scheduling/DailyReportModal';
import { findBottlenecks } from '../components/scheduling/SchedulingUtils';
import { Printer, Layers, Clock, AlertTriangle, CalendarDays, Gauge, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import LowStockAlert from '../components/inventory/LowStockAlert';

export default function Dashboard() {
  const queryClient = useQueryClient();

  // Real-time subscriptions
  useEffect(() => {
    const unsubs = [
      base44.entities.PrintJob.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }),
      base44.entities.QueueEntry.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['queue'] });
      }),
      base44.entities.Material.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['materials'] });
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [queryClient]);

  const { data: machines = [], isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list()
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.PrintJob.list('-created_date', 50)
  });

  const { data: queueEntries = [], isLoading: loadingQueue } = useQuery({
    queryKey: ['queue'],
    queryFn: () => base44.entities.QueueEntry.list('-created_date', 200)
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list()
  });

  const lowStockItems = materials.filter((m) => m.current_stock <= m.minimum_stock);

  const isLoading = loadingMachines || loadingJobs || loadingQueue;

  const [showReport, setShowReport] = useState(false);
  const activeJobs = jobs.filter((j) => !['completed', 'delivered'].includes(j.status));
  const pendingQueue = queueEntries.filter((q) => q.status !== 'completed');
  const totalQueueHours = pendingQueue.reduce((sum, e) => sum + (e.estimated_hours || 0), 0);
  const bottlenecks = findBottlenecks(machines, queueEntries);
  const criticalCount = bottlenecks.filter((b) => b.isBottleneck).length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>);

  }

  return (
    <div className="bg-gray-50 mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <DailyReportModal open={showReport} onClose={() => setShowReport(false)} jobs={jobs} queueEntries={queueEntries} />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Production Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">ภาพรวมสายการผลิต Offset Printing</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowReport(true)} className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 h-8 gap-2 text-xs font-medium shrink-0 shadow-sm">
          <FileText className="w-4 h-4" />
          สรุปการประชุม
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="งานทั้งหมด" value={jobs.length} subtitle={`${activeJobs.length} งานกำลังผลิต`} icon={Layers} color="blue" />
        <StatsCard title="เครื่องจักร" value={machines.filter((m) => m.status === 'active').length} subtitle={`${machines.length} เครื่องทั้งหมด`} icon={Printer} color="emerald" />
        <StatsCard title="คิวรอ" value={pendingQueue.length} subtitle={`${totalQueueHours.toFixed(1)} ชม. รวม`} icon={Clock} color="amber" />
        <StatsCard title="Bottleneck" value={criticalCount} subtitle={criticalCount > 0 ? 'ต้องดำเนินการ!' : 'ระบบปกติ'} icon={AlertTriangle} color={criticalCount > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && <LowStockAlert items={lowStockItems} />}

      {/* Bottleneck Alert */}
      <BottleneckAlert bottlenecks={bottlenecks} />

      {/* Machine Capacity */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Machine Capacity</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {machines.map((machine) =>
          <CapacityMeter key={machine.id} machine={machine} queueEntries={queueEntries} />
          )}
        </div>
      </div>

      {/* Production Schedule */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Production Schedule</h2>
        </div>
        <JobScheduleTable jobs={jobs} queueEntries={queueEntries} />
      </div>
    </div>);

}