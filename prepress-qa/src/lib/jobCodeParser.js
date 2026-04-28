/**
 * jobCodeParser.js — Parse Job Code จากชื่อไฟล์
 * รูปแบบ: YYMM-NNN หรือ YYMMNNNN เช่น 2604-001 = ปี 26, เดือน 04, ลำดับ 001
 */

/**
 * Parse job code จากข้อความ
 * @param {string} text — ข้อความหรือชื่อไฟล์
 * @param {string} regexPattern — Regex pattern สำหรับ parse (จาก admin settings)
 * @returns {{code: string, year: string, month: string, sequence: string}|null}
 */
export function parseJobCode(text, regexPattern) {
  if (!text) return null;

  // ลบนามสกุลไฟล์ออก
  const cleaned = text.replace(/\.(pdf|png|jpg|jpeg|ai|eps|tiff?)$/i, '');

  // ลอง pattern จาก admin settings ก่อน
  if (regexPattern) {
    try {
      const regex = new RegExp(regexPattern);
      const match = cleaned.match(regex);
      if (match) {
        return {
          code: match[0],
          year: match[1] || '',
          month: match[2] || '',
          sequence: match[3] || '',
        };
      }
    } catch (e) {
      console.warn('Invalid job code regex:', regexPattern, e);
    }
  }

  // Fallback patterns
  const patterns = [
    // YYMM-NNN or YYMM_NNN
    /(\d{2})(\d{2})[-_](\d{3,4})/,
    // YYMMNNNN
    /(\d{2})(\d{2})(\d{3,4})/,
    // YY-MM-NNN
    /(\d{2})-(\d{2})-(\d{3,4})/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return {
        code: match[0],
        year: match[1],
        month: match[2],
        sequence: match[3],
      };
    }
  }

  // ถ้า parse ไม่ได้ ส่งชื่อไฟล์ทั้งหมดกลับไป
  return {
    code: cleaned,
    year: '',
    month: '',
    sequence: '',
  };
}
