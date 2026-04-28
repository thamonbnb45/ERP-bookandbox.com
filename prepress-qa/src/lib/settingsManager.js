import { supabase } from '@/api/supabaseClient';

// Default settings — ค่าเริ่มต้นที่ใช้เมื่อยังไม่มีใน Database
const DEFAULTS = {
  // Comparison settings
  diff_threshold: 5,
  render_scale: 2,
  shift_tolerance_mm: 0,

  // Bleed settings
  bleed_mm: 3,
  bleed_tolerance: 0.5,

  // Standard sizes (width x height in mm)
  standard_sizes: JSON.stringify([
    { name: 'A3', width: 297, height: 420 },
    { name: 'A4', width: 210, height: 297 },
    { name: 'A5', width: 148, height: 210 },
    { name: 'B4', width: 250, height: 353 },
    { name: 'B5', width: 176, height: 250 },
    { name: 'นามบัตร', width: 90, height: 55 },
  ]),

  // Document type rules
  document_type_rules: JSON.stringify([
    { size: 'A4', pages: 1, type: 'flyer' },
    { size: 'A4', pages: 2, type: 'flyer_2side' },
    { size: 'A4', pages: 3, type: 'brochure_2fold' },
    { size: 'A4', pages: 4, type: 'brochure_3fold' },
    { size: 'A3', pages: 1, type: 'poster' },
    { size: 'A3', pages: 2, type: 'poster_2side' },
    { size: 'A5', pages: 1, type: 'flyer_a5' },
  ]),

  // Job code regex
  job_code_regex: '^(\\d{2})(\\d{2})(\\d{3,4})$',

  // General
  app_name: 'Prepress QA',
  max_file_size_mb: 50,
};

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

export function invalidateSettingsCache() {
  _cache = null;
  _cacheTime = 0;
}

export async function loadSettings() {
  // Return cached if fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  const { data: rows } = await supabase
    .from('admin_settings').select('*');

  const merged = { ...DEFAULTS };
  for (const row of rows ?? []) {
    try { merged[row.setting_key] = JSON.parse(row.setting_value); }
    catch { merged[row.setting_key] = row.setting_value; }
  }

  _cache = merged;
  _cacheTime = Date.now();
  return merged;
}

export async function saveSetting(key, value, group, description) {
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  await supabase.from('admin_settings')
    .upsert({
      setting_key: key,
      setting_value: valueStr,
      setting_group: group,
      description,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
  invalidateSettingsCache();
}

export async function deleteSetting(key) {
  await supabase.from('admin_settings')
    .delete().eq('setting_key', key);
  invalidateSettingsCache();
}

export { DEFAULTS };
