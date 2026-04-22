/**
 * Print Method Constants & Logic
 */

export const PRINT_METHODS = {
  single_side: {
    key: 'single_side',
    labelTh: 'พิมพ์หน้าเดียว',
    labelEn: 'Single Side',
    symbol: '1/0',
    plateSets: 1,
    color: 'emerald',
    colorHex: '#10B981',
    cuttingInstruction: 'ตัดซอยตามจำนวน up บนแผ่น ไม่ต้องแบ่งครึ่ง',
    warning: null,
    flipDirection: null,
    description: 'พิมพ์เพียงด้านเดียว ไม่กลับกระดาษ',
    exampleJobs: 'โปสเตอร์, แผ่นพับหน้าเดียว, ฉลาก',
    sheetMultiplier: 1, // qty / (up × multiplier)
  },
  work_and_turn: {
    key: 'work_and_turn',
    labelTh: 'กลับในตัว (Work & Turn)',
    labelEn: 'Work and Turn',
    symbol: 'W&T',
    plateSets: 1,
    color: 'blue',
    colorHex: '#3B82F6',
    cuttingInstruction: 'หลังพิมพ์ครบ 2 รอบ → ตัดแบ่งครึ่งแผ่นในแนวตั้ง (กลางแผ่น) → พับตามรอยพับ',
    warning: 'ต้องวางหน้าสม่ำเสมอ: ด้านซ้ายของแผ่น = หน้าที่ต่ำ, ด้านขวา = หน้าที่สูง',
    flipDirection: 'horizontal', // ← → กลับซ้าย-ขวา
    cutLine: 'vertical',
    description: 'ประหยัดค่าแม่พิมพ์ พิมพ์หน้า+หลังในครั้งเดียว แล้วตัดแบ่งครึ่งแผ่น',
    exampleJobs: 'หนังสือ, โบรชัวร์, ใบปลิว 2 หน้า',
    sheetMultiplier: 2,
  },
  work_and_tumble: {
    key: 'work_and_tumble',
    labelTh: 'กลับตีลังกา (Work & Tumble)',
    labelEn: 'Work and Tumble',
    symbol: 'W&Tb',
    plateSets: 1,
    color: 'orange',
    colorHex: '#F97316',
    cuttingInstruction: 'หลังพิมพ์ครบ 2 รอบ → ตัดแบ่งครึ่งแผ่นในแนวนอน (กลางแผ่น)',
    warning: 'ต้องเผื่อ Gripper Margin 2 ขอบ (บนและล่าง) — กระดาษอาจต้องใหญ่ขึ้น',
    flipDirection: 'vertical', // ↕ กลับหัว-ท้าย
    cutLine: 'horizontal',
    description: 'คล้าย W&T แต่กลับหัว-ท้าย ใช้ gripper margin ทั้ง 2 ขอบ',
    exampleJobs: 'งานที่กลับซ้าย-ขวาไม่ได้ แต่กลับหัว-ท้ายได้',
    sheetMultiplier: 2,
  },
  sheet_wise: {
    key: 'sheet_wise',
    labelTh: 'กลับนอก / คนละกรอบ (Sheet-wise)',
    labelEn: 'Sheet-wise / Work and Back',
    symbol: 'S/W',
    plateSets: 2,
    color: 'purple',
    colorHex: '#8B5CF6',
    cuttingInstruction: 'ไม่ต้องตัดแบ่งกลางแผ่น — ตัดซอยตาม up ปกติ พับตามรอยพับ',
    warning: 'ต้องการแม่พิมพ์ 2 ชุด — ค่าแม่พิมพ์ × 2',
    flipDirection: null,
    description: 'พิมพ์หน้าทั้งหมดด้วยกรอบ 1 แล้วเปลี่ยนแม่พิมพ์พิมพ์หลัง',
    exampleJobs: 'หนังสือจำนวนมาก, กล่อง, งานโบรชัวร์ที่กลับในตัวไม่ได้',
    sheetMultiplier: 1,
  },
  perfecting: {
    key: 'perfecting',
    labelTh: 'Perfecting (พิมพ์ 2 หน้าพร้อมกัน)',
    labelEn: 'Perfecting',
    symbol: 'PERF',
    plateSets: 2,
    color: 'red',
    colorHex: '#EF4444',
    cuttingInstruction: 'ตัดซอยตาม up ปกติ — พิมพ์ 2 หน้าแล้วในรอบเดียว',
    warning: 'วิธีนี้ใช้แม่พิมพ์ 2 ชุด — ค่าแม่พิมพ์จะคิด × 2',
    flipDirection: null,
    description: 'เครื่องพิมพ์พิมพ์หน้า-หลังพร้อมกันในครั้งเดียว (ต้องมี perfecting unit)',
    exampleJobs: 'งานที่ต้องการความเร็วสูง เครื่องมี perfecting unit',
    sheetMultiplier: 1,
  },
};

/**
 * คำนวณจำนวนแผ่นตาม print method
 */
export function calcSheetsForMethod(qty, wasteQty, upPerSheet, printMethod) {
  const method = PRINT_METHODS[printMethod] || PRINT_METHODS.single_side;
  const totalNeeded = qty + (wasteQty || 0);
  const effectiveUp = upPerSheet * method.sheetMultiplier;
  return Math.ceil(totalNeeded / Math.max(effectiveUp, 1));
}

/**
 * validate print method rules (basic — W&T layout validation is in workAndTurnEngine.js)
 */
export function validatePrintMethod(printMethod, items) {
  const warnings = [];
  const method = PRINT_METHODS[printMethod];
  if (!method) return warnings;

  if (printMethod === 'work_and_turn' || printMethod === 'work_and_tumble') {
    items.forEach(it => {
      // Only warn about odd up — do NOT warn about "paper too small" (wrong rule)
      if ((it.up_per_sheet || 0) % 2 !== 0 && (it.up_per_sheet || 0) > 0) {
        warnings.push({
          type: 'warn',
          msg: `งาน ${it.job_number}: up_per_sheet = ${it.up_per_sheet} (เลขคี่) — ${method.symbol} ต้องการ up ที่หารด้วย 2 ลงตัว`,
        });
      }
    });

    if (printMethod === 'work_and_tumble') {
      warnings.push({
        type: 'warn',
        msg: 'Work & Tumble ต้องการ Gripper Margin ทั้ง 2 ขอบ — ตรวจสอบว่ากระดาษมีขนาดพอสำหรับ gripper margin บน+ล่าง',
      });
    }
  }

  if (printMethod === 'sheet_wise' || printMethod === 'perfecting') {
    warnings.push({
      type: 'info',
      msg: `วิธีนี้ใช้แม่พิมพ์ 2 ชุด — ค่าแม่พิมพ์จะคิด × 2`,
    });
  }

  return warnings;
}