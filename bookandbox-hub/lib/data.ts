// Fetch real-time stats from backend API (not Supabase directly)
export async function getDashboardStats() {
  const API_URL = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api`)
    : 'http://localhost:4001/api';

  try {
    const res = await fetch(`${API_URL}/production/dashboard`, { cache: 'no-store' });
    const data = await res.json();

    return {
      totalRevenue: data?.summary?.totalValue || 0,
      totalJobs: data?.summary?.total || 0,
      completedJobs: data?.summary?.completed || 0,
      pendingJobs: (data?.summary?.total || 0) - (data?.summary?.completed || 0),
      totalLeads: 0,
      totalCustomers: 0,
    };
  } catch {
    return { totalRevenue: 0, totalJobs: 0, completedJobs: 0, pendingJobs: 0, totalLeads: 0, totalCustomers: 0 };
  }
}
