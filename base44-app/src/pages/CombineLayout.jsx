import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, AlertTriangle, CheckCircle2, RefreshCw, Printer, X, ChevronRight } from 'lucide-react';
import CombineFilterBar from '../components/combine/CombineFilterBar';
import CombineJobTable from '../components/combine/CombineJobTable';
import LayoutWorkspace from '../components/combine/LayoutWorkspace';
import GroupDetailPanel from '../components/combine/GroupDetailPanel';
import { checkCompatibility, isJobEligible, COMBINE_STATUS } from '@/utils/combineUtils';
import moment from 'moment';

const DEFAULT_FILTERS = {
  jobNumber: '', customer: '', paperType: 'all', gsm: 'all',
  paperSize: 'all', machineId: 'all', priority: 'all',
  readyOnly: false, hideGrouped: true,
};

function SummaryCard({ label, value, sub, color = 'gray' }) {
  const colors = {
    gray: 'bg-white border-gray-100',
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100',
    emerald: 'bg-emerald-50 border-emerald-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function CombineLayout() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null); // { group, items }
  const [editGroup, setEditGroup] = useState(null); // { group, items } for edit mode
  const [compatWarnings, setCompatWarnings] = useState([]);

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.PrintJob.list('-created_date', 200),
  });
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
  });
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['combine-groups'],
    queryFn: () => base44.entities.CombineGroup.list('-created_date', 100),
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ['combine-items'],
    queryFn: () => base44.entities.CombineItem.list('-created_date', 500),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['jobs'] });
    qc.invalidateQueries({ queryKey: ['combine-groups'] });
    qc.invalidateQueries({ queryKey: ['combine-items'] });
  };

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const { jobNumber, customer, paperType, gsm, paperSize, machineId, priority, readyOnly, hideGrouped } = filters;
      if (jobNumber && !job.job_number?.toLowerCase().includes(jobNumber.toLowerCase())) return false;
      if (customer && !job.customer_name?.toLowerCase().includes(customer.toLowerCase())) return false;
      if (paperType !== 'all' && job.paper !== paperType) return false;
      if (gsm !== 'all' && String(job.gsm) !== gsm) return false;
      if (paperSize !== 'all' && job.paper_size !== paperSize) return false;
      if (machineId !== 'all' && job.printing_machine_id !== machineId) return false;
      if (priority !== 'all' && job.priority !== priority) return false;
      if (readyOnly && !isJobEligible(job)) return false;
      if (hideGrouped && job.combine_group_id) return false;
      return true;
    });
  }, [jobs, filters]);

  // Check compatibility when selection changes
  const handleToggle = (id) => {
    const newSelected = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
    setSelected(newSelected);

    if (newSelected.length >= 2) {
      const selJobs = jobs.filter(j => newSelected.includes(j.id));
      const warnings = [];
      for (let i = 1; i < selJobs.length; i++) {
        const { issues, warnings: w } = checkCompatibility(selJobs[0], selJobs[i]);
        issues.forEach(msg => warnings.push({ type: 'error', msg }));
        w.forEach(msg => warnings.push({ type: 'warn', msg }));
      }
      setCompatWarnings(warnings);
    } else {
      setCompatWarnings([]);
    }
  };

  const handleSelectAll = (checked) => {
    setSelected(checked ? filteredJobs.filter(j => isJobEligible(j)).map(j => j.id) : []);
    setCompatWarnings([]);
  };

  const selectedJobs = jobs.filter(j => selected.includes(j.id));
  const canCreate = selected.length >= 1 && !compatWarnings.some(w => w.type === 'error');

  // Stats
  const eligibleCount = jobs.filter(j => isJobEligible(j) && !j.combine_group_id).length;
  const activeGroups = groups.filter(g => g.status === 'draft' || g.status === 'locked').length;
  const urgentWaiting = jobs.filter(j => isJobEligible(j) && !j.combine_group_id && (j.priority === 'urgent' || j.priority === 'rush')).length;

  const openGroupDetail = (group) => {
    const items = allItems.filter(it => it.group_id === group.id);
    setActiveGroup({ group, items });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Main area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${activeGroup ? 'mr-0' : ''}`}>
        {/* Page header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-gray-500" />
                งานเลย์รวม
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Combine Layout Planning — นำงานหลาย Job มารวมบนใบพิมพ์เดียวกัน</p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} className="h-8 text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />รีเฟรช
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <SummaryCard label="งานพร้อมเลย์รวม" value={eligibleCount} sub="รอรวมกลุ่ม" color="emerald" />
            <SummaryCard label="กลุ่มที่สร้างแล้ว" value={activeGroups} sub="draft + locked" color="blue" />
            <SummaryCard label="งาน Urgent รอรวม" value={urgentWaiting} sub="ต้องเร่งดำเนินการ" color={urgentWaiting > 0 ? 'amber' : 'gray'} />
            <SummaryCard label="กลุ่มทั้งหมด" value={groups.length} sub={`released: ${groups.filter(g=>g.status==='released').length}`} />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Filter */}
          <CombineFilterBar
            filters={filters}
            onChange={setFilters}
            machines={machines.filter(m => m.type === 'printing')}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />

          {/* Compat warnings */}
          {compatWarnings.length > 0 && (
            <div className="space-y-1">
              {compatWarnings.map((w, i) => (
                <div key={i} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${w.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{w.msg}
                </div>
              ))}
            </div>
          )}

          {/* Selection toolbar */}
          {selected.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-blue-800">เลือกแล้ว {selected.length} งาน</span>
              <Button
                size="sm"
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!canCreate}
                onClick={() => setShowCreate(true)}
              >
                <Layers className="w-3.5 h-3.5 mr-1" />สร้างกลุ่มเลย์รวม
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => { setSelected([]); setCompatWarnings([]); }}>
                <X className="w-3 h-3 mr-1" />ล้างที่เลือก
              </Button>
              {!canCreate && compatWarnings.some(w => w.type === 'error') && (
                <span className="text-xs text-red-600">มีข้อผิดพลาดที่ต้องแก้ไขก่อน</span>
              )}
            </div>
          )}

          {/* Jobs table */}
          <CombineJobTable
            jobs={filteredJobs}
            selected={selected}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            machines={machines}
          />

          {/* Groups list */}
          <div>
            {(() => {
              const visibleGroups = groups.filter(g => g.status !== 'cancelled');
              return (
                <>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">กลุ่มเลย์รวมทั้งหมด ({visibleGroups.length})</h2>
                  {loadingGroups ? (
                    <div className="text-xs text-gray-400 py-4">กำลังโหลด...</div>
                  ) : visibleGroups.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-400 text-sm">
                ยังไม่มีกลุ่มเลย์รวม
              </div>
                  ) : (
                    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {['รหัสกลุ่ม','ชื่อกลุ่ม','กระดาษ','แกรม','ขนาด','เครื่อง','วันผลิต','ใบพิมพ์','สถานะ',''].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {visibleGroups.map(g => {
                            const status = COMBINE_STATUS[g.status] || COMBINE_STATUS.draft;
                            const machine = machines.find(m => m.id === g.machine_id);
                            const itemCount = allItems.filter(it => it.group_id === g.id).length;
                            return (
                              <tr
                                key={g.id}
                                className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                                onClick={() => openGroupDetail(g)}
                              >
                                <td className="px-3 py-2.5 font-mono font-semibold text-blue-700">{g.group_code}</td>
                                <td className="px-3 py-2.5 text-gray-700">{g.group_name || '-'}</td>
                                <td className="px-3 py-2.5 text-gray-600">{g.paper_type}</td>
                                <td className="px-3 py-2.5 tabular-nums">{g.gsm}</td>
                                <td className="px-3 py-2.5 text-gray-600">{g.paper_size}</td>
                                <td className="px-3 py-2.5 text-gray-600">{machine?.name || '-'}</td>
                                <td className="px-3 py-2.5 tabular-nums">
                                  {g.planned_date ? moment(g.planned_date).format('DD/MM/YY') : '-'}
                                </td>
                                <td className="px-3 py-2.5 tabular-nums">
                                  {(g.total_sheet_count || 0).toLocaleString()} ใบ
                                  <span className="text-gray-400 ml-1">({itemCount} job)</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                                </td>
                                <td className="px-3 py-2.5">
                                  <ChevronRight className="w-4 h-4 text-gray-300" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Side panel: Group detail */}
      {activeGroup && (
        <div className="w-[600px] flex-shrink-0 border-l border-gray-100 bg-white overflow-hidden flex flex-col">
          <GroupDetailPanel
            group={activeGroup.group}
            items={activeGroup.items}
            machines={machines}
            onClose={() => setActiveGroup(null)}
            onRefresh={async () => {
              await refresh();
              // Re-fetch fresh items after refresh
              const freshItems = await base44.entities.CombineItem.filter({ group_id: activeGroup.group.id });
              const freshGroup = await base44.entities.CombineGroup.filter({ id: activeGroup.group.id });
              setActiveGroup(prev => prev ? { 
                ...prev, 
                items: freshItems,
                group: freshGroup[0] || prev.group 
              } : null);
            }}
            onEdit={(group, items) => {
              setEditGroup({ group, items });
              setActiveGroup(null);
            }}
          />
        </div>
      )}

      {/* Layout workspace — create */}
      {showCreate && (
        <LayoutWorkspace
          selectedJobs={selectedJobs}
          machines={machines}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setSelected([]);
            setCompatWarnings([]);
            refresh();
          }}
        />
      )}

      {/* Layout workspace — edit */}
      {editGroup && (
        <LayoutWorkspace
          selectedJobs={[]}
          machines={machines}
          existingGroup={editGroup.group}
          existingItems={editGroup.items}
          onClose={() => setEditGroup(null)}
          onCreated={() => {
            setEditGroup(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}