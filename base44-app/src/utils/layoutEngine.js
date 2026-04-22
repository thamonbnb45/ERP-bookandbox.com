/**
 * Layout Engine — MaxRects BSSF + GCD Grid + Multi-Strategy Optimization
 * แก้ปัญหา: Overflow, Algorithm ไม่ดีพอ, Boundary Guard
 */

export const JOB_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#F43F5E',
];

// ─────────────────────────────────────────────────────────────────────────────
// Paper & Area Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse paper size string → { w, h } in mm
 * - นิ้ว "31x43" → mm (×25.4)  [ค่า < 40]
 * - ซม. "65x92"  → mm (×10)    [ค่า ≥ 40]
 */
export function parsePaperSizeMm(sizeStr) {
  if (!sizeStr) return { w: 787, h: 1092 };
  const parts = sizeStr.split('x').map(n => parseFloat(n.trim()));
  const pw = parts[0] || 31;
  const ph = parts[1] || 43;
  if (pw < 40) {
    return { w: Math.round(pw * 25.4), h: Math.round(ph * 25.4) };
  }
  return { w: pw * 10, h: ph * 10 };
}

/**
 * คำนวณ printable area หลังหักขอบ
 * Returns: { pw, ph, offsetX, offsetY }
 */
export function getPrintableArea(paperW, paperH, layoutSettings) {
  const { gripMm, headMm, tailMm, sideMm } = layoutSettings;
  const pw = paperW - sideMm * 2;
  const ph = paperH - gripMm - headMm - tailMm;
  return { pw, ph, offsetX: sideMm, offsetY: gripMm + headMm };
}

/**
 * Get usable zone dimensions for a print method
 * For W&T: splits into 2 equal zones
 */
export function getUsableZone(pw, ph, printMethod, spacingMm) {
  if (printMethod === 'work_and_turn') {
    // แบ่งแนวตั้ง: 2 โซน ซ้าย/ขวา
    const cutGap = spacingMm; // ช่องว่างตรงกลาง
    const zoneW = Math.floor((pw - cutGap) / 2);
    return { zoneW, zoneH: ph, zones: 2, axis: 'vertical', cutGap };
  }
  if (printMethod === 'work_and_tumble') {
    // แบ่งแนวนอน: 2 โซน บน/ล่าง
    const cutGap = spacingMm;
    const zoneH = Math.floor((ph - cutGap) / 2);
    return { zoneW: pw, zoneH, zones: 2, axis: 'horizontal', cutGap };
  }
  // single_side, sheet_wise, perfecting
  return { zoneW: pw, zoneH: ph, zones: 1, axis: null, cutGap: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// MaxRects Algorithm — Best Short Side Fit (BSSF)
// ─────────────────────────────────────────────────────────────────────────────

function rectIntersects(a, b) {
  return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y);
}

function splitFreeRect(free, placed) {
  if (!rectIntersects(free, placed)) return [free];
  const result = [];
  if (placed.x > free.x)
    result.push({ x: free.x, y: free.y, w: placed.x - free.x, h: free.h });
  const rightX = placed.x + placed.w;
  if (rightX < free.x + free.w)
    result.push({ x: rightX, y: free.y, w: free.x + free.w - rightX, h: free.h });
  if (placed.y > free.y)
    result.push({ x: free.x, y: free.y, w: free.w, h: placed.y - free.y });
  const bottomY = placed.y + placed.h;
  if (bottomY < free.y + free.h)
    result.push({ x: free.x, y: bottomY, w: free.w, h: free.y + free.h - bottomY });
  return result;
}

function pruneFreeRects(freeRects) {
  return freeRects.filter((r, i) =>
    r.w > 0.5 && r.h > 0.5 &&
    !freeRects.some((s, j) => j !== i &&
      s.x <= r.x && s.y <= r.y &&
      s.x + s.w >= r.x + r.w && s.y + s.h >= r.y + r.h
    )
  );
}

/**
 * MaxRects bin-packing engine
 */
class MaxRects {
  constructor(zoneW, zoneH, offsetX = 0, offsetY = 0) {
    this.zoneW = zoneW;
    this.zoneH = zoneH;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.freeRects = [{ x: 0, y: 0, w: zoneW, h: zoneH }];
    this.placements = [];
  }

  // BSSF: Best Short Side Fit
  findBest(iw, ih, rotateAllowed) {
    let best = null;
    let bestScore = Infinity;

    for (const rect of this.freeRects) {
      const tryFit = (w, h, rotated) => {
        if (w > rect.w + 0.01 || h > rect.h + 0.01) return;
        // Boundary guard: absolute coords must stay within zone
        const absX = this.offsetX + rect.x;
        const absY = this.offsetY + rect.y;
        if (absX + w > this.offsetX + this.zoneW + 0.01) return;
        if (absY + h > this.offsetY + this.zoneH + 0.01) return;

        const score = Math.min(rect.w - w, rect.h - h);
        if (score < bestScore) {
          bestScore = score;
          best = { x: rect.x, y: rect.y, w, h, rotated };
        }
      };
      tryFit(iw, ih, false);
      if (rotateAllowed) tryFit(ih, iw, true);
    }
    return best;
  }

  place(iw, ih, rotateAllowed, jobId, extraProps = {}) {
    const pos = this.findBest(iw, ih, rotateAllowed);
    if (!pos) return false;

    // convert to absolute coords
    const absPlacement = {
      x: this.offsetX + pos.x,
      y: this.offsetY + pos.y,
      w: pos.w,
      h: pos.h,
      rotated: pos.rotated,
      jobId,
      ...extraProps,
    };
    this.placements.push(absPlacement);

    // Update freeRects with spacing padding
    const padded = { x: pos.x, y: pos.y, w: pos.w + 3, h: pos.h + 3 };
    const newFrees = [];
    for (const f of this.freeRects) {
      newFrees.push(...splitFreeRect(f, padded));
    }
    this.freeRects = pruneFreeRects(newFrees);
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GCD Grid System
// ─────────────────────────────────────────────────────────────────────────────

function gcd(a, b) {
  a = Math.round(a); b = Math.round(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

export function findGridUnit(items) {
  const dims = [];
  for (const it of items) {
    if (it.final_w_mm > 0) dims.push(Math.round(it.final_w_mm));
    if (it.final_h_mm > 0) dims.push(Math.round(it.final_h_mm));
  }
  if (!dims.length) return 1;
  const g = dims.reduce((acc, d) => gcd(acc, d));
  return Math.max(g, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid helpers
// ─────────────────────────────────────────────────────────────────────────────

function bestGridFit(jw, jh, areaW, areaH, spacingMm, rotateAllowed) {
  const tryFit = (w, h, rot) => {
    const cols = Math.max(0, Math.floor((areaW + spacingMm) / (w + spacingMm)));
    const rows = Math.max(0, Math.floor((areaH + spacingMm) / (h + spacingMm)));
    return { cols, rows, up: cols * rows, jw: w, jh: h, rotated: rot };
  };
  let best = tryFit(jw, jh, false);
  if (rotateAllowed) {
    const rot = tryFit(jh, jw, true);
    if (rot.up > best.up) best = rot;
  }
  return best;
}

function buildGridPlacements(cols, rows, jw, jh, zoneX, zoneY, spacingMm, rotated, extraProps = {}) {
  const placements = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      placements.push({
        x: zoneX + c * (jw + spacingMm),
        y: zoneY + r * (jh + spacingMm),
        w: jw, h: jh, rotated,
        ...extraProps,
      });
    }
  }
  return placements;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-check & Boundary Validation
// ─────────────────────────────────────────────────────────────────────────────

export function preCheckItems(items, zoneW, zoneH) {
  const errors = [];
  for (const it of items) {
    const jw = it.final_w_mm || 0;
    const jh = it.final_h_mm || 0;
    const fitsNormal = jw <= zoneW && jh <= zoneH;
    const fitsRotated = jh <= zoneW && jw <= zoneH;
    if (!fitsNormal && !fitsRotated) {
      errors.push({
        job_id: it.job_id,
        job_number: it.job_number,
        type: 'TOO_LARGE',
        msg: `❌ งาน ${it.job_number}: ขนาด ${jw}×${jh}mm ใหญ่เกินโซน ${zoneW}×${zoneH}mm`,
      });
    }
  }
  return errors;
}

function validatePlacement(p, offsetX, offsetY, zoneW, zoneH) {
  if (p.x < offsetX - 0.5 || p.y < offsetY - 0.5) return false;
  if (p.x + p.w > offsetX + zoneW + 0.5) return false;
  if (p.y + p.h > offsetY + zoneH + 0.5) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Strip Packing (NEW — primary algorithm)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate all candidate column width configurations to try
 */
function generateColumnConfigs(candidateWidths, zoneW) {
  const configs = [];
  const minW = candidateWidths.length > 0 ? Math.min(...candidateWidths) : 1;

  // 1 column: full zone width
  configs.push({ cols: [zoneW], name: '1col_full' });

  // 2 columns: split at each candidate width
  for (const w1 of candidateWidths) {
    const w2 = zoneW - w1;
    if (w2 >= minW && w2 > 0) {
      configs.push({ cols: [w1, w2], name: `2col_${Math.round(w1)}+${Math.round(w2)}` });
    }
  }

  // 3 columns
  for (const w1 of candidateWidths) {
    for (const w2 of candidateWidths) {
      const w3 = zoneW - w1 - w2;
      if (w3 >= minW && w3 > 0) {
        configs.push({ cols: [w1, w2, w3], name: `3col_${Math.round(w1)}+${Math.round(w2)}+${Math.round(w3)}` });
      }
    }
  }

  return configs;
}

/**
 * Column Strip Packing: pack items into columns top-to-bottom, best-fit column selection
 */
function columnStripPack(expandedItems, config, zoneW, zoneH, offsetX, offsetY, spacingMm) {
  const columns = config.cols.map((w, i) => ({
    width: w,
    xStart: config.cols.slice(0, i).reduce((s, v) => s + v, 0) + offsetX,
    yCursor: offsetY,
    maxY: offsetY + zoneH,
    placements: [],
  }));

  const perItem = {};
  const upCount = {};

  for (const entry of expandedItems) {
    const jw0 = entry.final_w_mm || 100;
    const jh0 = entry.final_h_mm || 150;
    const rotateAllowed = entry.rotate_allowed !== false;

    // Build orientation variants
    const variants = [{ w: jw0, h: jh0, rotated: false }];
    if (rotateAllowed && jw0 !== jh0) {
      variants.push({ w: jh0, h: jw0, rotated: true });
    }

    let bestColScore = Infinity;
    let bestPlacement = null;

    for (const col of columns) {
      for (const v of variants) {
        const itemW = v.w + spacingMm;
        const itemH = v.h + spacingMm;
        if (v.w > col.width - spacingMm * 0 + 0.01) continue; // must fit column width
        if (col.yCursor + v.h > col.maxY + 0.01) continue;    // must fit column height

        const leftoverH = col.maxY - col.yCursor - v.h;
        const leftoverW = col.width - v.w;
        const score = leftoverH + leftoverW; // BSSF: smaller is better

        if (score < bestColScore) {
          bestColScore = score;
          bestPlacement = { col, variant: v };
        }
      }
    }

    if (bestPlacement) {
      const { col, variant } = bestPlacement;
      const jid = entry.job_id;
      if (!perItem[jid]) perItem[jid] = [];
      perItem[jid].push({
        x: col.xStart,
        y: col.yCursor,
        w: variant.w,
        h: variant.h,
        rotated: variant.rotated,
        jobId: jid,
        _colIdx: columns.indexOf(col),
      });
      col.yCursor += variant.h + spacingMm;
      upCount[jid] = (upCount[jid] || 0) + 1;
    }
  }

  // Build column usage info
  const columnUsage = columns.map(col => ({
    width: col.width,
    usedH: col.yCursor - offsetY,
    totalH: zoneH,
    pct: Math.min(((col.yCursor - offsetY) / zoneH) * 100, 100).toFixed(1),
  }));

  return { perItem, upCount, columnUsage, config };
}

/**
 * Score column strip result
 */
function scoreColumnResult(result, items, zoneW, zoneH) {
  if (!result || !result.perItem) return -1;
  const totalArea = zoneW * zoneH;
  let usedArea = 0;
  let jobsPlaced = 0;
  for (const it of items) {
    const placements = result.perItem[it.job_id] || [];
    usedArea += placements.reduce((s, p) => s + p.w * p.h, 0);
    if (placements.length > 0) jobsPlaced++;
  }
  const coverageScore = items.length > 0 ? jobsPlaced / items.length : 0;
  const areaScore = totalArea > 0 ? Math.min(usedArea / totalArea, 1) : 0;
  const balanceScore = Object.values(result.upCount || {}).every(v => v > 0) ? 1 : 0;
  return coverageScore * 0.6 + areaScore * 0.3 + balanceScore * 0.1;
}

/**
 * Multi-Column Strip Packing Optimizer
 * Tries many column configs + job orders, returns best result
 */
function columnStripOptimize(items, zoneW, zoneH, offsetX, offsetY, spacingMm) {
  // Candidate widths: all unique w/h from all items (both orientations)
  const widthSet = new Set();
  for (const it of items) {
    const jw = it.final_w_mm || 100;
    const jh = it.final_h_mm || 150;
    const rotateAllowed = it.rotate_allowed !== false;
    if (jw <= zoneW) widthSet.add(jw);
    if (rotateAllowed && jh <= zoneW) widthSet.add(jh);
  }
  const candidateWidths = Array.from(widthSet).sort((a, b) => a - b);

  const configs = generateColumnConfigs(candidateWidths, zoneW);

  // Sort orders
  const sortOrders = [
    { name: 'LargestAreaFirst', fn: (a, b) => (b.final_w_mm * b.final_h_mm) - (a.final_w_mm * a.final_h_mm) },
    { name: 'SmallestAreaFirst', fn: (a, b) => (a.final_w_mm * a.final_h_mm) - (b.final_w_mm * b.final_h_mm) },
    { name: 'TallestFirst', fn: (a, b) => b.final_h_mm - a.final_h_mm },
    { name: 'WidestFirst', fn: (a, b) => b.final_w_mm - a.final_w_mm },
  ];

  // Expand items: each job repeated up to maxExpand times
  const maxExpand = 6;
  function expandItems(sortedBase) {
    const expanded = [];
    for (let i = 0; i < maxExpand; i++) {
      for (const job of sortedBase) {
        expanded.push({ ...job, _copy: i });
      }
    }
    return expanded;
  }

  let best = null;
  let bestScore = -1;

  for (const config of configs) {
    for (const order of sortOrders) {
      const sorted = [...items].sort(order.fn);
      // Try interleaved (round-robin ×N) and block (job×N then next job)
      const ordersToTry = [
        expandItems(sorted),                   // round-robin interleaved
        sorted.flatMap(j => Array(maxExpand).fill(j).map((x, i) => ({ ...x, _copy: i }))), // block
      ];
      for (const expanded of ordersToTry) {
        const result = columnStripPack(expanded, config, zoneW, zoneH, offsetX, offsetY, spacingMm);
        const score = scoreColumnResult(result, items, zoneW, zoneH);
        if (score > bestScore) {
          bestScore = score;
          best = {
            ...result,
            strategyName: `ColumnStrip:${config.name}:${order.name}`,
            score: bestScore,
          };
        }
      }
    }
  }

  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// MaxRects Packing (fallback for edge cases)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core packing: place items in the given sorted order into shared freeRects pool.
 */
function packAllItems(sortedItems, zoneW, zoneH, offsetX, offsetY, spacingMm) {
  const freeRects = [{ x: 0, y: 0, w: zoneW, h: zoneH }];
  const perItem = {};
  for (const it of sortedItems) perItem[it.job_id] = [];

  // Build entries: compute max up per item (physical grid limit, not target)
  // This prevents small items from claiming unlimited slots before large ones get placed
  const entries = sortedItems.map(it => {
    const jw = it.final_w_mm || 100;
    const jh = it.final_h_mm || 150;
    const rotateAllowed = it.rotate_allowed !== false;
    const grid = bestGridFit(jw, jh, zoneW, zoneH, spacingMm, rotateAllowed);
    const manual = it._manual_up && it.up_per_sheet > 0;
    // Max allowed = physical fit limit. Manual overrides but capped at 2× grid.
    const maxUp = manual
      ? Math.min(it.up_per_sheet, Math.max(grid.up, 1))
      : grid.up;
    return { it, jw, jh, rotateAllowed, maxUp, placed: 0, exhausted: false };
  });

  // BSSF find for a rect list
  const findBSSF = (iw, ih, rotateAllowed) => {
    let best = null;
    let bestScore = Infinity;
    for (const rect of freeRects) {
      const tryFit = (w, h, rot) => {
        if (w > rect.w + 0.01 || h > rect.h + 0.01) return;
        if (rect.x + w > zoneW + 0.01 || rect.y + h > zoneH + 0.01) return;
        const score = Math.min(rect.w - w, rect.h - h);
        if (score < bestScore) { bestScore = score; best = { x: rect.x, y: rect.y, w, h, rot }; }
      };
      tryFit(iw, ih, false);
      if (rotateAllowed) tryFit(ih, iw, true);
    }
    return best;
  };

  const commitPlacement = (pos, jobId, rotated) => {
    const abs = { x: offsetX + pos.x, y: offsetY + pos.y, w: pos.w, h: pos.h, rotated, jobId };
    perItem[jobId].push(abs);
    const padded = { x: pos.x, y: pos.y, w: pos.w + spacingMm, h: pos.h + spacingMm };
    const newFrees = [];
    for (const f of freeRects) newFrees.push(...splitFreeRect(f, padded));
    freeRects.length = 0;
    freeRects.push(...pruneFreeRects(newFrees));
  };

  // PHASE 1: Guarantee at least 1 up per job (largest first from sorted order)
  for (const entry of entries) {
    if (entry.maxUp === 0) { entry.exhausted = true; continue; }
    const pos = findBSSF(entry.jw, entry.jh, entry.rotateAllowed);
    if (!pos) { entry.exhausted = true; continue; }
    commitPlacement(pos, entry.it.job_id, pos.rot);
    entry.placed++;
    if (entry.placed >= entry.maxUp) entry.exhausted = true;
  }

  // PHASE 2: Fill remaining space (interleaved round-robin)
  let progress = true;
  while (progress) {
    progress = false;
    for (const entry of entries) {
      if (entry.exhausted) continue;
      const pos = findBSSF(entry.jw, entry.jh, entry.rotateAllowed);
      if (!pos) { entry.exhausted = true; continue; }
      commitPlacement(pos, entry.it.job_id, pos.rot);
      entry.placed++;
      progress = true;
      if (entry.placed >= entry.maxUp) entry.exhausted = true;
    }
  }

  return perItem;
}

/**
 * Score a packing result: coverage (all jobs placed) weighted higher than area
 */
function scoreResult(perItem, items, zoneW, zoneH) {
  const totalArea = zoneW * zoneH;
  let usedArea = 0;
  let jobsWithPlacement = 0;
  for (const it of items) {
    const placements = perItem[it.job_id] || [];
    usedArea += placements.reduce((s, p) => s + p.w * p.h, 0);
    if (placements.length > 0) jobsWithPlacement++;
  }
  const areaScore = totalArea > 0 ? usedArea / totalArea : 0;
  const coverageScore = items.length > 0 ? jobsWithPlacement / items.length : 0;
  // Coverage is more important: we never want to lose a job due to sort order
  return coverageScore * 0.65 + areaScore * 0.35;
}

/**
 * Multi-strategy optimization: 8 sort orders, pick best coverage+area score
 */
function optimizedPack(items, zoneW, zoneH, offsetX, offsetY, spacingMm) {
  const strategies = [
    { name: 'LargestAreaFirst',  fn: (a, b) => (b.final_w_mm * b.final_h_mm) - (a.final_w_mm * a.final_h_mm) },
    { name: 'SmallestAreaFirst', fn: (a, b) => (a.final_w_mm * a.final_h_mm) - (b.final_w_mm * b.final_h_mm) },
    { name: 'TallestFirst',      fn: (a, b) => b.final_h_mm - a.final_h_mm },
    { name: 'WidestFirst',       fn: (a, b) => b.final_w_mm - a.final_w_mm },
    { name: 'TallestFirstRot',   fn: (a, b) => Math.max(b.final_h_mm, b.final_w_mm) - Math.max(a.final_h_mm, a.final_w_mm) },
    { name: 'WidestFirstRot',    fn: (a, b) => Math.max(b.final_w_mm, b.final_h_mm) - Math.max(a.final_w_mm, a.final_h_mm) },
    { name: 'AspectRatioFirst',  fn: (a, b) => (b.final_h_mm / Math.max(b.final_w_mm, 1)) - (a.final_h_mm / Math.max(a.final_w_mm, 1)) },
    { name: 'OriginalOrder',     fn: () => 0 },
  ];

  let best = null;
  let bestScore = -1;
  for (const strategy of strategies) {
    const sorted = [...items].sort(strategy.fn);
    const perItem = packAllItems(sorted, zoneW, zoneH, offsetX, offsetY, spacingMm);
    const score = scoreResult(perItem, items, zoneW, zoneH);
    if (score > bestScore) {
      bestScore = score;
      best = { perItem, score, strategyName: strategy.name };
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Auto Layout Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto Layout Engine — MaxRects BSSF + Multi-Strategy
 * Returns items พร้อม pos_x, pos_y, box_width, box_height, cols, rows, up_per_sheet, allPlacements
 */
export function autoLayoutEngine(items, paperW, paperH, layoutSettings) {
  const { pw, ph, offsetX, offsetY } = getPrintableArea(paperW, paperH, layoutSettings);
  const { spacingMm } = layoutSettings;

  if (!items.length || pw <= 0 || ph <= 0) return items;

  // Pre-check for items too large
  const sizeErrors = preCheckItems(items, pw, ph);

  // For manual items, skip recalc if _manual_up is set
  // For single job, use pure grid (simpler + better)
  if (items.length === 1) {
    const it = items[0];
    const jw = it.final_w_mm || 100;
    const jh = it.final_h_mm || 150;
    const manual = it._manual_up && it.up_per_sheet > 0;
    const grid = bestGridFit(jw, jh, pw, ph, spacingMm, it.rotate_allowed !== false);
    const cols = manual ? Math.min(grid.cols, Math.ceil(Math.sqrt(it.up_per_sheet * (grid.jw / grid.jh)))) : grid.cols;
    const rows = manual ? Math.min(grid.rows, Math.ceil(it.up_per_sheet / Math.max(cols, 1))) : grid.rows;
    const safeCols = Math.max(0, Math.min(cols, grid.cols));
    const safeRows = Math.max(0, Math.min(rows, grid.rows));
    const placements = buildGridPlacements(safeCols, safeRows, grid.jw, grid.jh, offsetX, offsetY, spacingMm, grid.rotated)
      .filter(p => validatePlacement(p, offsetX, offsetY, pw, ph));
    const countPlaced = placements.length;
    return [{
      ...it,
      cols: safeCols, rows: safeRows,
      up_per_sheet: countPlaced,
      rotated: grid.rotated,
      pos_x: offsetX, pos_y: offsetY,
      box_width: safeCols > 0 ? safeCols * (grid.jw + spacingMm) - spacingMm : 0,
      box_height: safeRows > 0 ? safeRows * (grid.jh + spacingMm) - spacingMm : 0,
      allPlacements: placements,
      _layout_error: sizeErrors.find(e => e.job_id === it.job_id) || null,
    }];
  }

  // Multi-job: Column Strip first, then MaxRects as fallback
  const colResult = columnStripOptimize(items, pw, ph, offsetX, offsetY, spacingMm);
  const maxResult = optimizedPack(items, pw, ph, offsetX, offsetY, spacingMm);

  // Pick best between column-strip and maxrects
  const colScore = scoreColumnResult(colResult, items, pw, ph);
  const maxScore = scoreResult(maxResult?.perItem || {}, items, pw, ph);
  const result = colScore >= maxScore ? colResult : maxResult;
  const isColStrip = colScore >= maxScore;

  return items.map(it => {
    const rawPlacements = (result.perItem[it.job_id] || []);
    const placements = rawPlacements
      .filter(p => validatePlacement(p, offsetX, offsetY, pw, ph));

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of placements) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w);
      maxY = Math.max(maxY, p.y + p.h);
    }

    const isRotated = placements.some(p => p.rotated);
    const boxW = placements.length > 0 ? maxX - minX : 0;
    const boxH = placements.length > 0 ? maxY - minY : 0;

    // Derive cols/rows from placements for DB storage
    const jw = isRotated ? (it.final_h_mm || it.final_w_mm) : (it.final_w_mm || 100);
    const jh = isRotated ? (it.final_w_mm || it.final_h_mm) : (it.final_h_mm || 150);
    const cols = jw > 0 ? Math.max(1, Math.round(boxW / (jw + spacingMm - spacingMm / placements.length))) : 0;
    const rows = placements.length > 0 && cols > 0 ? Math.ceil(placements.length / cols) : 0;

    return {
      ...it,
      cols: placements.length > 0 ? cols : 0,
      rows: placements.length > 0 ? rows : 0,
      up_per_sheet: placements.length,
      rotated: isRotated,
      pos_x: placements.length > 0 ? minX : offsetX,
      pos_y: placements.length > 0 ? minY : offsetY,
      box_width: boxW,
      box_height: boxH,
      allPlacements: placements,
      _layout_error: sizeErrors.find(e => e.job_id === it.job_id) || null,
      _strategy: result.strategyName,
      _columnUsage: isColStrip ? result.columnUsage : null,
      _colConfig: isColStrip ? result.config : null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary & Analytics
// ─────────────────────────────────────────────────────────────────────────────

export function calcGroupSummary(items, layoutSettings) {
  if (!items.length) return null;
  const { sheetCalcMethod, fixedSheetCount } = layoutSettings;

  const itemCalcs = items.map(it => {
    const up = it.up_per_sheet || 0;
    const needed = Math.ceil((it.qty + (it.waste_qty || 0)) / Math.max(up, 1));
    return { ...it, needed_sheets: needed };
  });

  let totalSheets = 0;
  if (sheetCalcMethod === 'max') {
    totalSheets = Math.max(...itemCalcs.map(i => i.needed_sheets), 0);
  } else if (sheetCalcMethod === 'fixed') {
    totalSheets = fixedSheetCount || 0;
  } else {
    const avg = itemCalcs.reduce((s, i) => s + i.needed_sheets, 0) / itemCalcs.length;
    totalSheets = Math.ceil(avg);
  }

  const withDiff = itemCalcs.map(it => {
    const gotTotal = it.up_per_sheet * totalSheets;
    const diff = gotTotal - (it.qty + (it.waste_qty || 0));
    return { ...it, got_total: gotTotal, diff, totalSheets };
  });

  return { items: withDiff, totalSheets };
}

export function calcAreaUsage(items, paperW, paperH, layoutSettings) {
  const { pw, ph } = getPrintableArea(paperW, paperH, layoutSettings);
  const printableArea = pw * ph;
  if (printableArea <= 0) return 0;

  const usedArea = items.reduce((s, it) => {
    const placements = it.allPlacements || [];
    return s + placements.reduce((ps, p) => ps + p.w * p.h, 0);
  }, 0);

  return Math.min((usedArea / printableArea) * 100, 100);
}

export function generateWarnings(items, paperW, paperH, layoutSettings) {
  const warnings = [];
  const { pw, ph } = getPrintableArea(paperW, paperH, layoutSettings);

  items.forEach(it => {
    const jw = it.final_w_mm || 0;
    const jh = it.final_h_mm || 0;

    // If explicitly flagged as too large for the zone
    if (it._layout_error) {
      warnings.push({ type: 'error', msg: it._layout_error.msg });
      return;
    }

    if ((it.up_per_sheet || 0) === 0) {
      // Distinguish: truly too large vs algorithm couldn't find space
      const fitsAnyOrientation = (jw <= pw && jh <= ph) || (jh <= pw && jw <= ph);
      if (!fitsAnyOrientation) {
        // Genuinely too large
        warnings.push({
          type: 'error',
          msg: `❌ งาน ${it.job_number}: ขนาดสำเร็จ ${jw}×${jh}mm ใหญ่กว่าโซนพิมพ์ ${pw}×${ph}mm — เปลี่ยนกระดาษหรือทิศทางวาง`,
        });
      } else {
        // Algorithm couldn't find space — suggest retry
        warnings.push({
          type: 'warn',
          msg: `⚠️ งาน ${it.job_number}: Algorithm ไม่พบตำแหน่งว่าง — กด Auto Best Fit เพื่อลอง strategy อื่น หรือลด up ของงานอื่นก่อน`,
        });
      }
    }

    if (it.diff < 0 && Math.abs(it.diff || 0) > (it.qty || 1) * 0.1) {
      warnings.push({ type: 'warn', msg: `งาน ${it.job_number}: ขาดจำนวน ${Math.abs(it.diff || 0)} ชิ้น` });
    }
  });

  const usage = calcAreaUsage(items, paperW, paperH, layoutSettings);
  if (usage < 40 && items.length > 0 && items.some(it => it.up_per_sheet > 0)) {
    warnings.push({ type: 'warn', msg: `ใช้พื้นที่เพียง ${usage.toFixed(0)}% — ควรเพิ่มงานหรือปรับขนาดกระดาษ` });
  }
  if (usage > 95) {
    warnings.push({ type: 'warn', msg: 'พื้นที่แน่นมาก ควรเพิ่ม margin หรือ spacing' });
  }

  return warnings;
}

// Legacy helper for combineUtils compatibility
export function calcUpForJob(jobW, jobH, printW, printH, spacingMm, rotateAllowed) {
  const result = bestGridFit(jobW, jobH, printW, printH, spacingMm, rotateAllowed);
  return { cols: result.cols, rows: result.rows, up: result.up, fitW: result.jw, fitH: result.jh };
}