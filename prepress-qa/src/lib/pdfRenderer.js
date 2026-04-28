/**
 * pdfRenderer.js — Render PDF pages to Canvas using pdfjs-dist
 * ใช้ pdfjs-dist แปลง PDF แต่ละหน้าเป็นภาพ Canvas สำหรับเปรียบเทียบ
 */
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// ตั้งค่า worker — import ตรงจาก package (v5+)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * โหลด PDF จาก File/ArrayBuffer
 * @param {File|ArrayBuffer} source
 * @returns {Promise<PDFDocumentProxy>}
 */
export async function loadPdf(source) {
  let data;
  if (source instanceof File) {
    data = await source.arrayBuffer();
  } else {
    data = source;
  }
  return pdfjsLib.getDocument({ data }).promise;
}

/**
 * Render หน้า PDF เป็น Canvas
 * @param {PDFDocumentProxy} pdfDoc
 * @param {number} pageNum — หมายเลขหน้า (1-based)
 * @param {number} scale — ค่า render scale (default 2)
 * @returns {Promise<{canvas: HTMLCanvasElement, width: number, height: number, widthMm: number, heightMm: number}>}
 */
export async function renderPage(pdfDoc, pageNum, scale = 2) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  // คำนวณขนาดจริงเป็น mm (PDF points = 1/72 inch, 1 inch = 25.4mm)
  const origViewport = page.getViewport({ scale: 1 });
  const widthMm = (origViewport.width / 72) * 25.4;
  const heightMm = (origViewport.height / 72) * 25.4;

  return { canvas, width: viewport.width, height: viewport.height, widthMm, heightMm };
}

/**
 * Render ทุกหน้าของ PDF
 * @param {PDFDocumentProxy} pdfDoc
 * @param {number} scale
 * @returns {Promise<Array>}
 */
export async function renderAllPages(pdfDoc, scale = 2) {
  const pages = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const result = await renderPage(pdfDoc, i, scale);
    pages.push({ ...result, pageNum: i });
  }
  return pages;
}
