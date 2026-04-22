import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, Calendar, CheckCircle2, ImageIcon, ChevronRight, TrendingUp, AlertCircle, Layers } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from '../components/scheduling/SchedulingUtils';
import moment from 'moment';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const STATUS_STEPS = ['pending', 'prepress', 'printing', 'postpress', 'completed', 'delivered'];
const STATUS_TH = {
  pending: 'เปิด JOG เข้าบัญชี',
  prepress: 'จับคู่วางแผนผลิต',
  printing: 'กำลังพิมพ์',
  postpress: 'Postpress',
  completed: 'รอผลิต',
  delivered: 'ส่งมอบแล้ว'
};

const STATUS_BG = {
  pending: 'bg-gray-50 border-gray-200',
  prepress: 'bg-yellow-50 border-yellow-200',
  printing: 'bg-blue-50 border-blue-200',
  postpress: 'bg-purple-50 border-purple-200',
  completed: 'bg-green-50 border-green-200',
  delivered: 'bg-emerald-50 border-emerald-200',
};

const STATUS_HEADER = {
  pending: 'bg-gray-100 text-gray-700',
  prepress: 'bg-yellow-100 text-yellow-800',
  printing: 'bg-blue-100 text-blue-800',
  postpress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-800',
};

export default function ProductionDashboard() {
  const navigate = useNavigate();
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
    ];
    return () => unsubs.forEach(u => u());
  }, [queryClient]);

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.PrintJob.list('-created_date', 200)
  });

  const { data: queueEntries = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: () => base44.entities.QueueEntry.list('-created_date', 500)
  });

  const { data: combineGroups = [] } = useQuery({
    queryKey: ['combineGroups'],
    queryFn: () => base44.entities.CombineGroup.filter({ status: ['draft', 'locked', 'released'] })
  });

  const { data: combineItems = [] } = useQuery({
    queryKey: ['combineItems'],
    queryFn: () => base44.entities.CombineItem.list('-created_date', 500)
  });

  // Map job_id -> group info
  const jobGroupMap = useMemo(() => {
    const map = {};
    combineItems.forEach(item => {
      const group = combineGroups.find(g => g.id === item.group_id);
      if (group) map[item.job_id] = group;
    });
    return map;
  }, [combineItems, combineGroups]);

  const handleDragEnd = async (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;

    if (draggableId.startsWith('group::')) {
      // Move all jobs in group
      const groupCode = draggableId.replace('group::', '');
      const groupJobIds = combineItems
        .filter(item => {
          const grp = combineGroups.find(g => g.id === item.group_id);
          return grp?.group_code === groupCode;
        })
        .map(item => item.job_id);

      const jobsToMove = jobs.filter(j => groupJobIds.includes(j.id) && j.status !== newStatus);
      if (jobsToMove.length === 0) return;

      // Optimistic update
      queryClient.setQueryData(['jobs'], prev =>
        prev.map(j => groupJobIds.includes(j.id) ? { ...j, status: newStatus } : j)
      );
      await Promise.all(jobsToMove.map(j => base44.entities.PrintJob.update(j.id, { status: newStatus })));
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } else {
      // Move single job
      const jobId = draggableId.replace('job::', '');
      const job = jobs.find(j => j.id === jobId);
      if (!job || job.status === newStatus) return;
      queryClient.setQueryData(['jobs'], prev =>
        prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j)
      );
      await base44.entities.PrintJob.update(jobId, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  };

  const today = moment().startOf('day');

  // Delayed jobs: due_date < today and not delivered/completed
  const delayedJobs = useMemo(() =>
    jobs.filter(j =>
      j.due_date &&
      moment(j.due_date).isBefore(today) &&
      !['completed', 'delivered'].includes(j.status)
    ), [jobs, today]);

  // Jobs completed today
  const completedToday = useMemo(() =>
    jobs.filter(j =>
      ['completed', 'delivered'].includes(j.status) &&
      moment(j.updated_date).isSame(today, 'day')
    ), [jobs, today]);

  // Daily production summary (last 7 days)
  const dailySummary = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const day = moment().subtract(i, 'days');
      const done = jobs.filter(j =>
        ['completed', 'delivered'].includes(j.status) &&
        moment(j.updated_date).isSame(day, 'day')
      );
      days.push({ label: day.format('DD/MM'), count: done.length, sheets: done.reduce((s, j) => s + (j.sheets || 0), 0) });
    }
    return days;
  }, [jobs]);

  const maxCount = Math.max(...dailySummary.map(d => d.count), 1);

  // Group jobs by status (exclude delivered for board view)
  const columns = STATUS_STEPS.slice(0, 6);

  const jobsByStatus = useMemo(() => {
    const map = {};
    columns.forEach(s => { map[s] = jobs.filter(j => j.status === s); });
    return map;
  }, [jobs]);

  const getJobQueueEntries = (jobId) => queueEntries.filter(q => q.job_id === jobId);

  // Build column items: group combined jobs together, standalone jobs stay as-is
  const buildColumnItems = (colJobs) => {
    const result = [];
    const usedGroupCodes = new Set();

    colJobs.forEach(job => {
      const group = jobGroupMap[job.id];
      if (group) {
        if (!usedGroupCodes.has(group.group_code)) {
          usedGroupCodes.add(group.group_code);
          const groupJobs = colJobs.filter(j => jobGroupMap[j.id]?.group_code === group.group_code);
          result.push({ type: 'group', group, jobs: groupJobs });
        }
      } else {
        result.push({ type: 'job', job });
      }
    });
    return result;
  };

  if (loadingJobs) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="w-64 h-96 rounded-2xl shrink-0" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Production Board</h1>
          <p className="text-sm text-gray-400 mt-0.5">ภาพรวมงานทั้งหมด • {jobs.length} JOG</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <StatChip icon={CheckCircle2} label="เสร็จวันนี้" value={completedToday.length} color="text-green-600 bg-green-50" />
          <StatChip icon={AlertTriangle} label="ล่าช้า" value={delayedJobs.length} color={delayedJobs.length > 0 ? "text-red-600 bg-red-50" : "text-gray-500 bg-gray-50"} />
          <StatChip icon={Clock} label="ทั้งหมด" value={jobs.filter(j => !['delivered'].includes(j.status)).length} color="text-blue-600 bg-blue-50" />
        </div>
      </div>

      {/* Delay Alert */}
      {delayedJobs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-700">งานที่ล่าช้า {delayedJobs.length} รายการ</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {delayedJobs.map(job => {
              const daysLate = today.diff(moment(job.due_date), 'days');
              return (
                <button
                  key={job.id}
                  onClick={() => navigate(`${createPageUrl('JobDetail')}?id=${job.id}`)}
                  className="flex items-center gap-2 bg-white border border-red-200 rounded-xl px-3 py-2 hover:bg-red-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{job.job_number?.replace(/^JOB-?/i, 'JOG-')}</p>
                    <p className="text-xs text-red-500">ล่าช้า {daysLate} วัน • {job.product_type}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">สรุปผลผลิต 7 วัน</h2>
        </div>
        <div className="flex items-end gap-2 h-20">
          {dailySummary.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-gray-600">{day.count > 0 ? day.count : ''}</span>
              <div
                className="w-full rounded-t-lg bg-blue-400 transition-all min-h-[4px]"
                style={{ height: `${Math.max((day.count / maxCount) * 64, day.count > 0 ? 4 : 4)}px` }}
              />
              <span className="text-xs text-gray-400">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {columns.map(status => {
              const colJobs = jobsByStatus[status] || [];
              return (
                <div key={status} className="w-64 shrink-0">
                  {/* Column Header */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${STATUS_HEADER[status]}`}>
                    <span className="font-semibold text-sm">{STATUS_TH[status]}</span>
                    <span className="text-xs font-bold opacity-70">{colJobs.length}</span>
                  </div>
                  {/* Cards */}
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[4rem] max-h-[calc(100vh-22rem)] overflow-y-auto rounded-xl transition-colors pr-1 ${snapshot.isDraggingOver ? 'bg-blue-50/60' : ''}`}
                      >
                        {buildColumnItems(colJobs).map((item, index) => {
                          if (item.type === 'group') {
                            const groupDraggableId = `group::${item.group.group_code}`;
                            return (
                              <Draggable key={groupDraggableId} draggableId={groupDraggableId} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={provided.draggableProps.style}
                                    className={`rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-2 space-y-2 ${snapshot.isDragging ? 'opacity-80 rotate-1 scale-105' : ''}`}
                                  >
                                    {/* Group header — drag handle for the whole group */}
                                    <div {...provided.dragHandleProps} className="flex items-center gap-1.5 px-1 cursor-grab active:cursor-grabbing">
                                      <Layers className="w-3 h-3 text-indigo-500" />
                                      <span className="text-xs font-bold text-indigo-700">{item.group.group_code}</span>
                                      <span className="text-xs text-indigo-400">• {item.jobs.length} งาน</span>
                                    </div>
                                    {/* Individual jobs inside group — each also draggable on its own */}
                                    <Droppable droppableId={`inner::${item.group.group_code}`} isDropDisabled={true}>
                                      {(innerProvided) => (
                                        <div ref={innerProvided.innerRef} {...innerProvided.droppableProps} className="space-y-2">
                                          {item.jobs.map((job, jIdx) => (
                                            <Draggable key={`job::${job.id}`} draggableId={`job::${job.id}`} index={jIdx}>
                                              {(jp, js) => (
                                                <div
                                                  ref={jp.innerRef}
                                                  {...jp.draggableProps}
                                                  {...jp.dragHandleProps}
                                                  style={jp.draggableProps.style}
                                                  className={js.isDragging ? 'opacity-80 rotate-1 scale-105' : ''}
                                                >
                                                  <JobKanbanCard
                                                    job={job}
                                                    queueEntries={getJobQueueEntries(job.id)}
                                                    onClick={() => navigate(`${createPageUrl('JobDetail')}?id=${job.id}`)}
                                                    isDelayed={delayedJobs.some(d => d.id === job.id)}
                                                  />
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                          {innerProvided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </div>
                                )}
                              </Draggable>
                            );
                          }
                          return (
                            <Draggable key={`job::${item.job.id}`} draggableId={`job::${item.job.id}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={provided.draggableProps.style}
                                  className={snapshot.isDragging ? 'opacity-80 rotate-1 scale-105' : ''}
                                >
                                  <JobKanbanCard
                                    job={item.job}
                                    queueEntries={getJobQueueEntries(item.job.id)}
                                    onClick={() => navigate(`${createPageUrl('JobDetail')}?id=${item.job.id}`)}
                                    isDelayed={delayedJobs.some(d => d.id === item.job.id)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {colJobs.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-16 rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-300">ไม่มีงาน</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

function JobKanbanCard({ job, queueEntries, onClick, isDelayed }) {
  const hasImages = job.images && job.images.length > 0;
  const completedSteps = queueEntries.filter(q => q.status === 'completed').length;
  const totalSteps = queueEntries.length;
  const daysLeft = job.due_date ? moment(job.due_date).diff(moment().startOf('day'), 'days') : null;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${
        isDelayed ? 'border-red-200' : 'border-gray-100'
      }`}
    >
      {/* Image preview */}
      {hasImages && (
        <div className="relative h-32 bg-gray-100 overflow-hidden">
          <img src={job.images[0]} alt="" className="w-full h-full object-cover" />
          {job.images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs rounded-full px-2 py-0.5 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              +{job.images.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Title */}
        <div>
          <p className="font-semibold text-sm text-gray-900 leading-tight">
            {job.product_type}
          </p>
          <p className="text-xs text-gray-400">{job.job_number?.replace(/^JOB-?/i, 'JOG-')}</p>
        </div>

        {/* Due date */}
        <div className={`flex items-center gap-1.5 text-xs ${
          isDelayed ? 'text-red-500 font-semibold' :
          daysLeft !== null && daysLeft <= 1 ? 'text-orange-500' : 'text-gray-400'
        }`}>
          <Calendar className="w-3 h-3" />
          {job.due_date ? (
            isDelayed
              ? `❗ ${moment(job.due_date).format('DD MMM')}`
              : `${moment(job.due_date).format('DD MMM')} ${daysLeft === 0 ? '(วันนี้!)' : daysLeft === 1 ? '(พรุ่งนี้)' : ''}`
          ) : '-'}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <Badge className={`${PRIORITY_COLORS[job.priority]} text-xs px-2 py-0`}>{job.priority}</Badge>
          {totalSteps > 0 && (
            <span className="text-xs text-gray-400">{completedSteps}/{totalSteps} ขั้นตอน</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}