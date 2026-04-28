/**
 * bleedCropper.js — ตรวจจับและตัด Bleed ออกจากภาพ
 * Bleed = พื้นที่เพิ่มรอบขอบเอกสารสำหรับงานพิมพ์ (ปกติ 3mm)
 */

/**
 * ตรวจจับว่าภาพมี Bleed หรือไม่
 * โดยเช็คว่าขอบ 4 ด้านมีสีไม่ใช่ขาว
 * @param {HTMLCanvasElement} canvas
 * @param {number} bleedMm — ขนาด bleed ที่คาดไว้ (mm)
 * @param {number} dpi — ความละเอียดโดยประมาณ
 * @returns {{hasBleed: boolean, bleedMm: number, bleedPixels: number}}
 */
export function detectBleed(canvas, bleedMm = 3, dpi = 300) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  // คำนวณ bleed ใน pixels
  const bleedPx = Math.round((bleedMm / 25.4) * dpi);

  // Sample ขอบ 4 ด้าน
  const edges = [
    // Top edge
    ctx.getImageData(0, 0, width, Math.min(bleedPx, height)),
    // Bottom edge
    ctx.getImageData(0, Math.max(0, height - bleedPx), width, Math.min(bleedPx, height)),
    // Left edge
    ctx.getImageData(0, 0, Math.min(bleedPx, width), height),
    // Right edge
    ctx.getImageData(Math.max(0, width - bleedPx), 0, Math.min(bleedPx, width), height),
  ];

  let hasColor = false;
  for (const imageData of edges) {
    const data = imageData.data;
    let colorPixels = 0;
    const totalPx = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // ถ้า pixel ไม่ใช่ขาวหรือเกือบขาว ถือว่ามีสี
      if (r < 240 || g < 240 || b < 240) {
        colorPixels++;
      }
    }
    // ถ้ามี pixel มีสี > 30% ถือว่ามี bleed
    if (colorPixels / totalPx > 0.3) {
      hasColor = true;
      break;
    }
  }

  return {
    hasBleed: hasColor,
    bleedMm: hasColor ? bleedMm : 0,
    bleedPixels: hasColor ? bleedPx : 0,
  };
}

/**
 * ตัด Bleed ออกจาก Canvas
 * @param {HTMLCanvasElement} canvas
 * @param {number} bleedPixels — จำนวน pixel ที่จะตัดแต่ละด้าน
 * @returns {HTMLCanvasElement}
 */
export function cropBleed(canvas, bleedPixels) {
  if (bleedPixels <= 0) return canvas;

  const newWidth = canvas.width - bleedPixels * 2;
  const newHeight = canvas.height - bleedPixels * 2;

  if (newWidth <= 0 || newHeight <= 0) return canvas;

  const cropped = document.createElement('canvas');
  cropped.width = newWidth;
  cropped.height = newHeight;
  const ctx = cropped.getContext('2d');

  ctx.drawImage(canvas,
    bleedPixels, bleedPixels, newWidth, newHeight,
    0, 0, newWidth, newHeight
  );

  return cropped;
}
