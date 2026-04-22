// Utility functions for production scheduling calculations

export const PROCESS_ORDER = ['printing', 'lamination', 'diecut', 'folding', 'binding', 'cutting'];

export const PROCESS_LABELS = {
  printing: 'พิมพ์',
  lamination: 'เคลือบ/ลามิเนต',
  diecut: 'ไดคัท',
  folding: 'พับ',
  binding: 'เย็บ/เข้าเล่ม',
  cutting: 'ตัด'
};

export const PROCESS_COLORS = {
  printing: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200' },
  lamination: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' },
  diecut: { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50', border: 'border-rose-200' },
  folding: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' },
  binding: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200' },
  cutting: { bg: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-50', border: 'border-cyan-200' }
};

export const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  prepress: 'bg-yellow-100 text-yellow-700',
  printing: 'bg-blue-100 text-blue-700',
  postpress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-700'
};

export const PRIORITY_COLORS = {
  normal: 'bg-gray-100 text-gray-600',
  urgent: 'bg-orange-100 text-orange-700',
  rush: 'bg-red-100 text-red-700'
};

/**
 * Calculate production time in hours
 */
export function calculateProductionHours(sheets, capacityPerHour) {
  if (!capacityPerHour || !sheets) return 0;
  return Math.ceil((sheets / capacityPerHour) * 100) / 100;
}

/**
 * Parse time string (HH:MM) to hours number
 */
export function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

/**
 * Get working hours per day for a machine
 */
export function getWorkingHoursPerDay(machine) {
  const start = parseTime(machine.working_hours_start || '08:00');
  const end = parseTime(machine.working_hours_end || '18:00');
  return end - start;
}

/**
 * Calculate scheduled start/end based on machine queue
 */
export function calculateSchedule(machine, existingQueue, productionHours, startDate) {
  const workStart = parseTime(machine.working_hours_start || '08:00');
  const workEnd = parseTime(machine.working_hours_end || '18:00');
  const workHoursPerDay = workEnd - workStart;

  // Find the latest end time from existing queue
  let nextAvailable = new Date(startDate || new Date());
  
  if (existingQueue.length > 0) {
    const latestEnd = existingQueue
      .filter(q => q.status !== 'completed')
      .reduce((latest, entry) => {
        const end = new Date(entry.scheduled_end);
        return end > latest ? end : latest;
      }, new Date(0));
    
    if (latestEnd > nextAvailable) {
      nextAvailable = latestEnd;
    }
  }

  // Ensure we start within working hours
  const startHour = nextAvailable.getHours() + nextAvailable.getMinutes() / 60;
  if (startHour < workStart) {
    nextAvailable.setHours(Math.floor(workStart), (workStart % 1) * 60, 0, 0);
  } else if (startHour >= workEnd) {
    nextAvailable.setDate(nextAvailable.getDate() + 1);
    nextAvailable.setHours(Math.floor(workStart), (workStart % 1) * 60, 0, 0);
  }

  // Skip weekends
  while (nextAvailable.getDay() === 0 || nextAvailable.getDay() === 6) {
    nextAvailable.setDate(nextAvailable.getDate() + 1);
  }

  const scheduledStart = new Date(nextAvailable);

  // Calculate end time considering working hours across days
  let remainingHours = productionHours;
  let current = new Date(scheduledStart);

  while (remainingHours > 0) {
    const currentHour = current.getHours() + current.getMinutes() / 60;
    const availableToday = workEnd - currentHour;

    if (availableToday <= 0) {
      current.setDate(current.getDate() + 1);
      while (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
      }
      current.setHours(Math.floor(workStart), (workStart % 1) * 60, 0, 0);
      continue;
    }

    if (remainingHours <= availableToday) {
      const endMinutes = currentHour * 60 + remainingHours * 60;
      current.setHours(Math.floor(endMinutes / 60), Math.round(endMinutes % 60), 0, 0);
      remainingHours = 0;
    } else {
      remainingHours -= availableToday;
      current.setDate(current.getDate() + 1);
      while (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
      }
      current.setHours(Math.floor(workStart), (workStart % 1) * 60, 0, 0);
    }
  }

  return {
    scheduled_start: scheduledStart.toISOString(),
    scheduled_end: current.toISOString()
  };
}

/**
 * Calculate capacity utilization percentage for a machine on a given date
 */
export function calculateDailyUtilization(machine, queueEntries, date) {
  const workHours = getWorkingHoursPerDay(machine);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayEntries = queueEntries.filter(q => {
    const start = new Date(q.scheduled_start);
    const end = new Date(q.scheduled_end);
    return start <= dayEnd && end >= dayStart && q.status !== 'completed';
  });

  const totalHoursUsed = dayEntries.reduce((sum, entry) => {
    const start = new Date(Math.max(new Date(entry.scheduled_start), dayStart));
    const end = new Date(Math.min(new Date(entry.scheduled_end), dayEnd));
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0);

  return Math.min((totalHoursUsed / workHours) * 100, 100);
}

/**
 * Find bottleneck machines
 */
export function findBottlenecks(machines, queueEntries) {
  const machineLoads = machines.map(machine => {
    const entries = queueEntries.filter(q => q.machine_id === machine.id && q.status !== 'completed');
    const totalHours = entries.reduce((sum, e) => sum + (e.estimated_hours || 0), 0);
    const workHoursPerDay = getWorkingHoursPerDay(machine);
    const daysLoaded = totalHours / workHoursPerDay;

    return {
      machine,
      totalHours,
      queueCount: entries.length,
      daysLoaded,
      isBottleneck: daysLoaded > 2
    };
  });

  return machineLoads.sort((a, b) => b.daysLoaded - a.daysLoaded);
}

export function formatHours(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}