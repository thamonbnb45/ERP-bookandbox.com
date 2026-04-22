/**
 * Work & Turn / Work & Tumble Layout Engine
 * ใช้ getUsableZone จาก layoutEngine เพื่อ boundary ที่ถูกต้อง
 *
 * หลักการ Work & Turn:
 * - ครึ่งซ้าย = FRONT ของทุก job
 * - ครึ่งขวา = BACK ของทุก job (mirror) — กลับซ้าย↔ขวา พิมพ์รอบ 2 ด้วยแม่พิมพ์เดิม
 * - 1 แผ่น → ตัดกลาง → ได้ 2 ชุดที่มีหน้า+หลังครบ
 *
 * กฎเหล็ก: ทุก job ต้องปรากฏทั้ง 2 โซน (up ต้องหารด้วย 2 ลงตัว)
 */

import { getPrintableArea, getUsableZone } from './layoutEngine';

function bestGridInZone(jw, jh, zoneW, zoneH, spacingMm, rotateAllowed) {
  const tryFit = (w, h, rot) => {
    const cols = Math.max(0, Math.floor((zoneW + spacingMm) / (w + spacingMm)));
    const rows = Math.max(0, Math.floor((zoneH + spacingMm) / (h + spacingMm)));
    return { cols, rows, up: cols * rows, jw: w, jh: h, rotated: rot };
  };
  let best = tryFit(jw, jh, false);
  if (rotateAllowed) {
    const rot = tryFit(jh, jw, true);
    if (rot.up > best.up) best = rot;
  }
  return best;
}

function validateWTPlacements(placements, offsetX, offsetY, zoneW, zoneH) {
  return placements.filter(p => {
    if (p.x < offsetX - 0.5 || p.y < offsetY - 0.5) return false;
    if (p.x + p.w > offsetX + zoneW + 0.5) return false;
    if (p.y + p.h > offsetY + zoneH + 0.5) return false;
    return true;
  });
}

/**
 * Work & Turn layout
 * แบ่งพื้นที่ printable เป็น 2 โซนซ้าย/ขวาเท่าๆกัน
 * jobs เรียงกันแนวตั้งใน FRONT zone แล้ว mirror ไป BACK zone
 */
export function autoLayoutWorkAndTurn(items, paperW, paperH, layoutSettings) {
  const { pw, ph, offsetX, offsetY } = getPrintableArea(paperW, paperH, layoutSettings);
  const { spacingMm } = layoutSettings;

  if (!items.length || pw <= 0 || ph <= 0) return items;

  const { zoneW, cutGap } = getUsableZone(pw, ph, 'work_and_turn', spacingMm);
  // Zone boundaries (absolute coords)
  const frontZoneX = offsetX;
  const backZoneX = offsetX + zoneW + cutGap;
  const zoneH = ph;

  let currentY = offsetY;
  const result = items.map(it => {
    const jw = it.final_w_mm || 100;
    const jh = it.final_h_mm || 150;

    // Remaining height in FRONT zone from currentY
    const remainH = offsetY + zoneH - currentY;
    if (remainH <= 0) {
      return {
        ...it,
        cols: 0, rows: 0, up_per_sheet: 0, up_per_zone: 0,
        rotated: false, pos_x: frontZoneX, pos_y: currentY,
        box_width: 0, box_height: 0, allPlacements: [],
        _wt_warning: 'ไม่มีพื้นที่เหลือในโซน',
      };
    }

    const best = bestGridInZone(jw, jh, zoneW, remainH, spacingMm, it.rotate_allowed !== false);

    // Manual up override
    let cols = best.cols;
    let rows = best.rows;
    if (it._manual_up && it.up_per_sheet > 0) {
      const manualZone = Math.max(1, Math.floor(it.up_per_sheet / 2));
      cols = Math.min(best.cols, Math.max(1, Math.ceil(Math.sqrt(manualZone * (best.jw / Math.max(best.jh, 1))))));
      rows = Math.min(best.rows, Math.ceil(manualZone / Math.max(cols, 1)));
    }

    const upPerZone = cols * rows;
    const totalUp = it._manual_up && it.up_per_sheet > 0 ? it.up_per_sheet : upPerZone * 2;

    // Build FRONT placements (left zone)
    const frontPlacements = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = {
          x: frontZoneX + c * (best.jw + spacingMm),
          y: currentY + r * (best.jh + spacingMm),
          w: best.jw, h: best.jh,
          rotated: best.rotated,
          zone: 'front', rotate180: false,
        };
        frontPlacements.push(p);
      }
    }

    // Mirror to BACK zone (right side)
    const backPlacements = frontPlacements.map(p => ({
      ...p,
      x: backZoneX + (p.x - frontZoneX),
      zone: 'back', rotate180: true,
    }));

    // Validate all placements stay within paper bounds
    const allRaw = [...frontPlacements, ...backPlacements];
    // Front zone validation
    const frontValid = validateWTPlacements(frontPlacements, frontZoneX, offsetY, zoneW, zoneH);
    const backValid = validateWTPlacements(backPlacements, backZoneX, offsetY, zoneW, zoneH);
    const allPlacements = [...frontValid, ...backValid];

    const usedW = cols > 0 ? cols * (best.jw + spacingMm) - spacingMm : 0;
    const usedH = rows > 0 ? rows * (best.jh + spacingMm) - spacingMm : 0;
    const stripH = rows > 0 ? rows * (best.jh + spacingMm) - spacingMm : best.jh;

    const itemResult = {
      ...it,
      cols, rows,
      up_per_sheet: allPlacements.filter(p => p.zone === 'front').length * 2,
      up_per_zone: upPerZone,
      rotated: best.rotated,
      pos_x: frontZoneX,
      pos_y: currentY,
      box_width: usedW,
      box_height: usedH,
      allPlacements,
      _wt_warning: upPerZone === 0 ? 'ไม่สามารถวางได้ในโซน W&T' : null,
    };

    currentY += stripH + spacingMm;
    return itemResult;
  });

  return result;
}

/**
 * Work & Tumble layout
 * แบ่งพื้นที่ printable เป็น 2 โซนบน/ล่างเท่าๆกัน
 * jobs เรียงกันแนวนอนใน FRONT zone แล้ว mirror ไป BACK zone
 */
export function autoLayoutWorkAndTumble(items, paperW, paperH, layoutSettings) {
  const { pw, ph, offsetX, offsetY } = getPrintableArea(paperW, paperH, layoutSettings);
  const { spacingMm } = layoutSettings;

  if (!items.length || pw <= 0 || ph <= 0) return items;

  const { zoneH, cutGap } = getUsableZone(pw, ph, 'work_and_tumble', spacingMm);
  const topZoneY = offsetY;
  const bottomZoneY = offsetY + zoneH + cutGap;
  const zoneW = pw;

  let currentX = offsetX;
  const result = items.map(it => {
    const jw = it.final_w_mm || 100;
    const jh = it.final_h_mm || 150;

    const remainW = offsetX + zoneW - currentX;
    if (remainW <= 0) {
      return {
        ...it,
        cols: 0, rows: 0, up_per_sheet: 0, up_per_zone: 0,
        rotated: false, pos_x: currentX, pos_y: topZoneY,
        box_width: 0, box_height: 0, allPlacements: [],
        _wt_warning: 'ไม่มีพื้นที่เหลือในโซน',
      };
    }

    const best = bestGridInZone(jw, jh, remainW, zoneH, spacingMm, it.rotate_allowed !== false);

    let cols = best.cols;
    let rows = best.rows;
    if (it._manual_up && it.up_per_sheet > 0) {
      const manualZone = Math.max(1, Math.floor(it.up_per_sheet / 2));
      cols = Math.min(best.cols, Math.max(1, Math.ceil(Math.sqrt(manualZone * (best.jw / Math.max(best.jh, 1))))));
      rows = Math.min(best.rows, Math.ceil(manualZone / Math.max(cols, 1)));
    }

    const upPerZone = cols * rows;

    // Build FRONT placements (top zone)
    const frontPlacements = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        frontPlacements.push({
          x: currentX + c * (best.jw + spacingMm),
          y: topZoneY + r * (best.jh + spacingMm),
          w: best.jw, h: best.jh,
          rotated: best.rotated,
          zone: 'front', rotate180: false,
        });
      }
    }

    // Mirror to BACK zone (bottom)
    const backPlacements = frontPlacements.map(p => ({
      ...p,
      y: bottomZoneY + (p.y - topZoneY),
      zone: 'back', rotate180: true,
    }));

    // Validate
    const frontValid = validateWTPlacements(frontPlacements, offsetX, topZoneY, zoneW, zoneH);
    const backValid = validateWTPlacements(backPlacements, offsetX, bottomZoneY, zoneW, zoneH);
    const allPlacements = [...frontValid, ...backValid];

    const usedW = cols > 0 ? cols * (best.jw + spacingMm) - spacingMm : 0;
    const usedH = rows > 0 ? rows * (best.jh + spacingMm) - spacingMm : 0;
    const stripW = cols > 0 ? cols * (best.jw + spacingMm) - spacingMm : best.jw;

    const itemResult = {
      ...it,
      cols, rows,
      up_per_sheet: frontValid.length * 2,
      up_per_zone: upPerZone,
      rotated: best.rotated,
      pos_x: currentX,
      pos_y: topZoneY,
      box_width: usedW,
      box_height: usedH,
      allPlacements,
      _wt_warning: upPerZone === 0 ? 'ไม่สามารถวางได้ในโซน W&T' : null,
    };

    currentX += stripW + spacingMm;
    return itemResult;
  });

  return result;
}

/**
 * Validate Work & Turn layout symmetry
 */
export function validateWorkAndTurnLayout(items, paperW, paperH, layoutSettings, printMethod) {
  const warnings = [];
  if (printMethod !== 'work_and_turn' && printMethod !== 'work_and_tumble') return warnings;

  const { pw, ph, offsetX, offsetY } = getPrintableArea(paperW, paperH, layoutSettings);
  const isHorizontal = printMethod === 'work_and_tumble';
  const cutLine = isHorizontal ? offsetY + ph / 2 : offsetX + pw / 2;

  items.forEach(it => {
    const placements = it.allPlacements || [];
    if (placements.length === 0) {
      warnings.push({ type: 'error', msg: `❌ งาน ${it.job_number}: ไม่มี placement — ใช้ Auto Best Fit` });
      return;
    }

    const axis = isHorizontal ? 'y' : 'x';
    const dim = isHorizontal ? 'h' : 'w';

    const hasZoneProp = placements[0]?.zone;
    const frontItems = hasZoneProp
      ? placements.filter(p => p.zone === 'front')
      : placements.filter(p => (p[axis] + p[dim] / 2) < cutLine);
    const backItems = hasZoneProp
      ? placements.filter(p => p.zone === 'back')
      : placements.filter(p => (p[axis] + p[dim] / 2) >= cutLine);

    if (frontItems.length === 0 || backItems.length === 0) {
      const presentSide = frontItems.length === 0 ? 'ฝั่ง BACK' : 'ฝั่ง FRONT';
      warnings.push({
        type: 'error',
        msg: `❌ งาน ${it.job_number} อยู่แค่ ${presentSide} — W&T ต้องการทั้ง 2 ฝั่ง → ใช้ Auto Best Fit`,
      });
    } else if (frontItems.length !== backItems.length) {
      warnings.push({
        type: 'warn',
        msg: `⚠️ งาน ${it.job_number}: up ไม่สมมาตร (${frontItems.length} FRONT / ${backItems.length} BACK)`,
      });
    }

    const totalUp = it.up_per_sheet || 0;
    if (totalUp > 0 && totalUp % 2 !== 0) {
      warnings.push({
        type: 'warn',
        msg: `⚠️ งาน ${it.job_number}: up_per_sheet = ${totalUp} (เลขคี่) — W&T ต้องการเลขคู่`,
      });
    }
  });

  return warnings;
}

/**
 * Sheet count สำหรับ W&T
 */
export function calcWTSheetCount(qty, wasteQty, upPerSheet) {
  const totalNeeded = qty + (wasteQty || 0);
  return Math.ceil(totalNeeded / Math.max(upPerSheet, 1));
}

/**
 * ตรวจ layout pattern
 */
export function detectLayoutPattern(items, paperW, paperH, layoutSettings) {
  if (!items.length || !items[0]?.allPlacements?.length) return 'unknown';

  const { pw, ph, offsetX, offsetY } = getPrintableArea(paperW, paperH, layoutSettings);
  const midX = offsetX + pw / 2;
  const midY = offsetY + ph / 2;

  let allHaveBothSidesV = true;
  items.forEach(it => {
    const placements = it.allPlacements || [];
    const leftCount = placements.filter(p => p.x + p.w / 2 < midX).length;
    const rightCount = placements.filter(p => p.x + p.w / 2 >= midX).length;
    if (leftCount === 0 || rightCount === 0) allHaveBothSidesV = false;
  });

  if (allHaveBothSidesV) return 'mirror_vertical';

  let isSheetWise = items.length > 1;
  items.forEach(it => {
    const placements = it.allPlacements || [];
    const leftCount = placements.filter(p => p.x + p.w / 2 < midX).length;
    const rightCount = placements.filter(p => p.x + p.w / 2 >= midX).length;
    if (leftCount > 0 && rightCount > 0) isSheetWise = false;
  });

  if (isSheetWise) return 'sheet_wise';
  return 'single_zone';
}