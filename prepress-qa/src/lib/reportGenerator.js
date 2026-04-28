/**
 * reportGenerator.js — สร้างรายงาน QA จากผลการเปรียบเทียบ
 */
export function generateReport({ pageResults, masterInfo, printInfo, bleedInfo, sizeInfo, settings }) {
  const issues = [];
  if (masterInfo.pages !== printInfo.pages) {
    issues.push({ type: 'page_count', severity: 'error', issue: `จำนวนหน้าไม่ตรง: Master ${masterInfo.pages} หน้า, Print ${printInfo.pages} หน้า` });
  }
  if (!sizeInfo.isStandard) {
    issues.push({ type: 'size', severity: 'warning', issue: `ขนาดเอกสารไม่ตรงมาตรฐาน: ${sizeInfo.detectedSize}` });
  }
  if (!bleedInfo.hasBleed) {
    issues.push({ type: 'bleed', severity: 'warning', issue: `ไม่พบ Bleed — ควรมี Bleed อย่างน้อย ${settings?.bleed_mm || 3}mm` });
  }
  const pagesWithDiffs = pageResults.filter(p => p.hasDiff).length;
  for (const page of pageResults) {
    if (page.hasDiff) {
      issues.push({ type: 'pixel_diff', severity: page.diffPercent > 5 ? 'error' : 'warning', issue: `หน้า ${page.pageNum}: พบความแตกต่าง ${page.diffPercent}%`, pageNum: page.pageNum });
    }
  }
  const isReady = issues.filter(i => i.severity === 'error').length === 0;
  return {
    isReady,
    issues,
    summary: {
      masterPages: masterInfo.pages,
      printPages: printInfo.pages,
      pagesWithDiffs,
      totalDiffPercent: pageResults.length > 0 ? Math.round(pageResults.reduce((s, p) => s + p.diffPercent, 0) / pageResults.length * 100) / 100 : 0,
      detectedSize: sizeInfo.detectedSize,
      documentType: sizeInfo.documentType,
      isStandard: sizeInfo.isStandard,
      hasBleed: bleedInfo.hasBleed,
      bleedMm: bleedInfo.bleedMm,
    },
  };
}
