import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QueueTimeline from '../components/scheduling/QueueTimeline';
import { Skeleton } from '@/components/ui/skeleton';
import { ListOrdered } from 'lucide-react';

export default function MachineQueue() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubs = [
      base44.entities.QueueEntry.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['queue'] });
      }),
      base44.entities.Machine.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['machines'] });
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [queryClient]);

  const { data: machines = [], isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
  });

  const { data: queueEntries = [], isLoading: loadingQueue } = useQuery({
    queryKey: ['queue'],
    queryFn: () => base44.entities.QueueEntry.list('-created_date', 200),
  });

  const isLoading = loadingMachines || loadingQueue;

  // Sort machines: most loaded first
  const sortedMachines = [...machines].sort((a, b) => {
    const aEntries = queueEntries.filter(q => q.machine_id === a.id && q.status !== 'completed');
    const bEntries = queueEntries.filter(q => q.machine_id === b.id && q.status !== 'completed');
    return bEntries.length - aEntries.length;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">คิวเครื่องจักร</h1>
        <p className="text-sm text-gray-400 mt-1">ตารางคิวงานของแต่ละเครื่อง</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedMachines.map(machine => (
            <QueueTimeline key={machine.id} machine={machine} queueEntries={queueEntries} />
          ))}
        </div>
      )}
    </div>
  );
}