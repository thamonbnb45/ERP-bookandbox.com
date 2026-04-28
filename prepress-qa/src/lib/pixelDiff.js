/**
 * pixelDiff.js — Pixel-level comparison algorithm
 * เปรียบเทียบ 2 Canvas ที่ pixel level พร้อม shift tolerance
 */

/**
 * เปรียบเทียบ 2 Canvas แบบ pixel-by-pixel
 * @param {HTMLCanvasElement} masterCanvas
 * @param {HTMLCanvasElement} printCanvas
 * @param {Object} options
 * @param {number} options.threshold — ค่า threshold สำหรับความต่าง (0-255, default 30)
 * @param {number} options.shiftTolerance — pixel shift tolerance (default 4)
 * @returns {{diffCanvas: HTMLCanvasElement, diffPercent: number, diffPixels: number, totalPixels: number, hasDiff: boolean}}
 */
export function compareCanvases(masterCanvas, printCanvas, options = {}) {
  const { threshold = 30, shiftTolerance = 4 } = options;

  // ใช้ขนาดของ master เป็นหลัก
  const width = masterCanvas.width;
  const height = masterCanvas.height;

  const masterCtx = masterCanvas.getContext('2d');
  const printCtx = printCanvas.getContext('2d');

  // สร้าง Canvas สำหรับผลลัพธ์ diff
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');

  // ดึง pixel data
  const masterData = masterCtx.getImageData(0, 0, width, height).data;

  // Scale print canvas ถ้าขนาดไม่ตรง
  let printData;
  if (printCanvas.width !== width || printCanvas.height !== height) {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.drawImage(printCanvas, 0, 0, width, height);
    printData = tmpCtx.getImageData(0, 0, width, height).data;
  } else {
    printData = printCtx.getImageData(0, 0, width, height).data;
  }

  const diffImageData = diffCtx.createImageData(width, height);
  const diffData = diffImageData.data;

  let diffPixels = 0;
  const totalPixels = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r1 = masterData[idx], g1 = masterData[idx + 1], b1 = masterData[idx + 2];
      const r2 = printData[idx], g2 = printData[idx + 1], b2 = printData[idx + 2];

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

      if (diff > threshold * 3) {
        // ถ้าต่างเกิน threshold ให้ลองเช็ค shift tolerance
        let matched = false;
        if (shiftTolerance > 0) {
          matched = checkShiftMatch(masterData, printData, x, y, width, height, threshold, shiftTolerance);
        }

        if (!matched) {
          diffPixels++;
          // แสดงจุดต่างเป็นสีแดง
          diffData[idx] = 255;     // R
          diffData[idx + 1] = 50;  // G
          diffData[idx + 2] = 50;  // B
          diffData[idx + 3] = 200; // A
        } else {
          // ตรง (หลัง shift) — แสดงเป็นสีเทาจาง
          diffData[idx] = r1;
          diffData[idx + 1] = g1;
          diffData[idx + 2] = b1;
          diffData[idx + 3] = 60;
        }
      } else {
        // ตรงกัน — แสดงเป็นเทาจาง
        diffData[idx] = r1;
        diffData[idx + 1] = g1;
        diffData[idx + 2] = b1;
        diffData[idx + 3] = 40;
      }
    }
  }

  diffCtx.putImageData(diffImageData, 0, 0);

  const diffPercent = (diffPixels / totalPixels) * 100;

  // หา diff regions (กลุ่มจุดต่าง) สำหรับวงกรอบสีแดง
  const diffRegions = findDiffRegions(diffData, width, height);

  return {
    diffCanvas,
    diffPercent: Math.round(diffPercent * 100) / 100,
    diffPixels,
    totalPixels,
    hasDiff: diffPercent > 0.01,
    diffRegions,
  };
}

/**
 * ตรวจสอบว่า pixel ที่ตำแหน่ง (x,y) ใน master ตรงกับ pixel ใกล้เคียงใน print
 */
function checkShiftMatch(masterData, printData, x, y, width, height, threshold, tolerance) {
  const mIdx = (y * width + x) * 4;
  const r1 = masterData[mIdx], g1 = masterData[mIdx + 1], b1 = masterData[mIdx + 2];

  for (let dy = -tolerance; dy <= tolerance; dy++) {
    for (let dx = -tolerance; dx <= tolerance; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const pIdx = (ny * width + nx) * 4;
      const r2 = printData[pIdx], g2 = printData[pIdx + 1], b2 = printData[pIdx + 2];
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (diff <= threshold * 3) return true;
    }
  }
  return false;
}

/**
 * หากลุ่มจุดที่ต่างกัน (diff regions) โดยแบ่ง canvas เป็น grid แล้วรวมกลุ่ม
 */
function findDiffRegions(diffData, width, height) {
  const cellSize = 40; // แบ่งเป็น grid 40x40 px
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const grid = new Uint8Array(cols * rows);

  // นับ diff pixels ในแต่ละ cell
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (diffData[idx] === 255 && diffData[idx + 1] === 50 && diffData[idx + 3] === 200) {
        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        grid[cy * cols + cx] = 1;
      }
    }
  }

  // Flood-fill เพื่อรวม cells ที่ติดกัน
  const visited = new Uint8Array(cols * rows);
  const regions = [];

  for (let i = 0; i < grid.length; i++) {
    if (grid[i] && !visited[i]) {
      let minX = cols, minY = rows, maxX = 0, maxY = 0;
      const stack = [i];
      while (stack.length) {
        const ci = stack.pop();
        if (visited[ci]) continue;
        visited[ci] = 1;
        const cx = ci % cols, cy = Math.floor(ci / cols);
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
        // 4-connected neighbors
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const ni = ny * cols + nx;
            if (grid[ni] && !visited[ni]) stack.push(ni);
          }
        }
      }
      regions.push({
        x: minX * cellSize,
        y: minY * cellSize,
        w: (maxX - minX + 1) * cellSize,
        h: (maxY - minY + 1) * cellSize,
      });
    }
  }
  return regions;
}

