/**
 * documentTypeDetector.js — Auto-detect document type จากขนาดเอกสาร
 * แทนที่การ hardcode 'flyer' เดิม
 */

/**
 * ตรวจจับประเภทเอกสารจากขนาดและจำนวนหน้า
 * @param {number} widthMm — ความกว้าง (mm)
 * @param {number} heightMm — ความสูง (mm)
 * @param {number} pageCount — จำนวนหน้า
 * @param {Array} rules — rules จาก admin settings
 * @param {Array} standardSizes — ขนาดมาตรฐานจาก admin settings
 * @returns {{documentType: string, detectedSize: string, isStandard: boolean}}
 */
export function detectDocumentType(widthMm, heightMm, pageCount, rules = [], standardSizes = []) {
  // หาขนาดมาตรฐานที่ใกล้เคียงที่สุด (tolerance ±5mm)
  const tolerance = 5;
  let detectedSize = 'ไม่ทราบ';
  let isStandard = false;

  // Normalize — ให้ width < height เสมอ
  const w = Math.min(widthMm, heightMm);
  const h = Math.max(widthMm, heightMm);

  for (const size of standardSizes) {
    const sw = Math.min(size.width, size.height);
    const sh = Math.max(size.width, size.height);

    if (Math.abs(w - sw) <= tolerance && Math.abs(h - sh) <= tolerance) {
      detectedSize = size.name;
      isStandard = true;
      break;
    }
  }

  // หาประเภทจาก rules
  let documentType = 'other';
  for (const rule of rules) {
    if (rule.size === detectedSize && rule.pages === pageCount) {
      documentType = rule.type;
      break;
    }
  }

  // Fallback: ถ้าไม่ตรง rule ใดเลย ใช้ logic พื้นฐาน
  if (documentType === 'other' && isStandard) {
    if (pageCount === 1) documentType = 'flyer';
    else if (pageCount === 2) documentType = 'flyer_2side';
    else if (pageCount >= 3) documentType = 'brochure';
  }

  return {
    documentType,
    detectedSize: isStandard ? detectedSize : `${Math.round(w)}×${Math.round(h)} mm`,
    isStandard,
  };
}
