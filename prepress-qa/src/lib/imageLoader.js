/**
 * imageLoader.js — โหลดไฟล์รูปภาพ (PNG/JPG/AI) เป็น Canvas
 */

/**
 * โหลด Image จาก File object
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`ไม่สามารถโหลดรูป: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * แปลง Image เป็น Canvas
 * @param {HTMLImageElement} img
 * @returns {HTMLCanvasElement}
 */
export function imageToCanvas(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * โหลดไฟล์ภาพเป็น Canvas พร้อม metadata
 * @param {File} file
 * @returns {Promise<{canvas: HTMLCanvasElement, width: number, height: number}>}
 */
export async function loadImageAsCanvas(file) {
  const img = await loadImage(file);
  const canvas = imageToCanvas(img);
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}
