/**
 * Combine Layout Utilities
 * Logic สำหรับตรวจสอบเงื่อนไขการรวมงาน และคำนวณจำนวนใบพิมพ์/ต้นทุน
 */

export const COMBINE_STATUS = {
  draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-700' },
  locked: { label: 'ล็อกแล้ว', color: 'bg-blue-100 text-blue-700' },
  released: { label: 'ส่งคิวแล้ว', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700' },
};

export const COST_SHARE_METHODS = [
  { value: 'area', label: 'แชร์ตามพื้นที่' },
  { value: 'quantity', label: 'แชร์ตามจำนวนชิ้น' },
];

export const PAPER_SIZES = [
  '65x92', '79x109', '61x86', '72x102', '52x72', '46x64', '43x61'
];

export const PAPER_TYPES = [
  'อาร์ตมัน', 'อาร์ตด้าน', 'ออฟเซ็ท', 'กล่องสีขาว', 'กล่องน้ำตาล', 'ฟิล์มโพลี', 'อาร์ตการ์ด'
];

export const GSM_OPTIONS = [80, 90, 100, 115, 120, 128, 135, 150, 157, 170, 200, 210, 230, 250, 300, 350, 400];

/**
 * ตรวจสอบว่า 2 งานรวมกันได้หรือไม่
 */
export function checkCompatibility(jobA, jobB) {
  const issues = [];
  const warnings = [];

  if (jobA.paper !== jobB.paper) issues.push('ประเภทกระดาษไม่ตรงกัน');
  if (jobA.gsm !== jobB.gsm) issues.push('แกรมกระดาษไม่ตรงกัน');
  if (jobA.paper_size !== jobB.paper_size) issues.push('ขนาดกระดาษไม่ตรงกัน');
  if (jobA.printing_machine_id && jobB.printing_machine_id && jobA.printing_machine_id !== jobB.printing_machine_id) {
    issues.push('เครื่องพิมพ์ไม่ตรงกัน');
  }
  const blockedStatuses = ['printing', 'postpress', 'completed', 'delivered'];
  if (blockedStatuses.includes(jobA.status)) issues.push(`งาน ${jobA.job_number} อยู่ในสถานะผลิตแล้ว`);
  if (blockedStatuses.includes(jobB.status)) issues.push(`งาน ${jobB.job_number} อยู่ในสถานะผลิตแล้ว`);
  if (jobA.combine_group_id) issues.push(`งาน ${jobA.job_number} อยู่ในกลุ่มเลย์รวมอื่นแล้ว`);
  if (jobB.combine_group_id) issues.push(`งาน ${jobB.job_number} อยู่ในกลุ่มเลย์รวมอื่นแล้ว`);

  // Warnings (เตือนแต่ยังรวมได้)
  if (jobA.due_date && jobB.due_date) {
    const daysDiff = Math.abs(
      (new Date(jobA.due_date) - new Date(jobB.due_date)) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 2) warnings.push(`วันส่งห่างกัน ${daysDiff.toFixed(0)} วัน`);
  }
  if (jobA.priority === 'rush' || jobB.priority === 'rush') warnings.push('มีงาน rush priority');
  if (jobA.priority === 'urgent' || jobB.priority === 'urgent') warnings.push('มีงาน urgent');

  return { canCombine: issues.length === 0, issues, warnings };
}

/**
 * ตรวจสอบว่า job พร้อมเข้ากลุ่มได้หรือไม่
 */
export function isJobEligible(job) {
  const blockedStatuses = ['printing', 'postpress', 'completed', 'delivered'];
  if (blockedStatuses.includes(job.status)) return false;
  if (job.combine_group_id) return false;
  return true;
}

/**
 * คำนวณจำนวนใบพิมพ์ที่ต้องใช้สำหรับ 1 งาน
 */
export function calcSheetsForJob(qty, wasteQty, upPerSheet) {
  if (!upPerSheet || upPerSheet <= 0) return 0;
  return Math.ceil((qty + wasteQty) / upPerSheet);
}

/**
 * คำนวณจำนวนใบพิมพ์รวมของกลุ่ม = ค่าสูงสุดที่ทุกงานพอ
 */
export function calcGroupTotalSheets(items) {
  if (!items.length) return 0;
  return Math.max(...items.map(it => calcSheetsForJob(it.qty || 0, it.waste_qty || 0, it.up_per_sheet || 1)));
}

/**
 * คำนวณ area_percent ของแต่ละงานบนใบพิมพ์
 * paperSizeW, paperSizeH ใน mm
 * item.box_width, item.box_height ใน mm
 * item.up_per_sheet = จำนวนลง
 */
export function calcAreaPercents(items, paperW, paperH) {
  const totalPaperArea = paperW * paperH;
  if (!totalPaperArea) return items.map(() => 0);
  return items.map(it => {
    const jobArea = (it.box_width || 0) * (it.box_height || 0) * (it.up_per_sheet || 0);
    return totalPaperArea > 0 ? Math.min((jobArea / totalPaperArea) * 100, 100) : 0;
  });
}

/**
 * คำนวณ cost_share_percent ตามวิธีที่เลือก
 */
export function calcCostSharePercents(items, method) {
  if (method === 'area') {
    const total = items.reduce((s, it) => s + (it.area_percent || 0), 0);
    if (!total) return items.map(() => 0);
    return items.map(it => ((it.area_percent || 0) / total) * 100);
  } else {
    // quantity-based
    const total = items.reduce((s, it) => s + (it.qty || 0), 0);
    if (!total) return items.map(() => 0);
    return items.map(it => ((it.qty || 0) / total) * 100);
  }
}

/**
 * Parse paper size string "65x92" → { w: 650, h: 920 } (mm, ×10)
 */
export function parsePaperSize(sizeStr) {
  if (!sizeStr) return { w: 650, h: 920 };
  const [w, h] = sizeStr.split('x').map(n => parseFloat(n) * 10);
  return { w: w || 650, h: h || 920 };
}

/**
 * Auto-layout: แจก positions ให้งานในกลุ่มแบบ grid อย่างง่าย
 * returns items พร้อม pos_x, pos_y, box_width, box_height
 */
export function autoLayout(items, paperW, paperH, gripperMm = 10) {
  const usableH = paperH - gripperMm;
  if (!items.length) return items;

  // ลอง grid n columns
  const n = items.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cellW = Math.floor(paperW / cols);
  const cellH = Math.floor(usableH / rows);

  return items.map((it, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...it,
      pos_x: col * cellW,
      pos_y: gripperMm + row * cellH,
      box_width: cellW - 2,
      box_height: cellH - 2,
    };
  });
}

export function generateGroupCode() {
  const ts = Date.now().toString(36).toUpperCase();
  return `CG-${ts}`;
}