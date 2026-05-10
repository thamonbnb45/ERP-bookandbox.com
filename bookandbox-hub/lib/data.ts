import { supabase } from './supabase';

// Fetch real-time stats from Supabase (existing live tables)
export async function getDashboardStats() {
  const [jobRes, leadRes, customerRes] = await Promise.all([
    supabase.from('job_order').select('id, total_price, status, created_at'),
    supabase.from('lead_contact').select('id, sales_status, created_at').not('line_user_id', 'like', 'U_SEED_%'),
    supabase.from('customer').select('id'),
  ]);

  const jobs = jobRes.data || [];
  const leads = leadRes.data || [];
  const customers = customerRes.data || [];

  const totalRevenue = jobs.reduce((sum: number, j: any) => sum + (j.total_price || 0), 0);
  const completedJobs = jobs.filter((j: any) => j.status === 'completed').length;
  const pendingJobs = jobs.filter((j: any) => j.status !== 'completed').length;

  return {
    totalRevenue,
    totalJobs: jobs.length,
    completedJobs,
    pendingJobs,
    totalLeads: leads.length,
    totalCustomers: customers.length,
  };
}
