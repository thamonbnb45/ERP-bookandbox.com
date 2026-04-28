import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Columns2 } from 'lucide-react';

/**
 * DiffViewer — แสดงภาพเปรียบเทียบพร้อมวงกรอบสีแดง + โหมดเทียบคู่
 */
export default function DiffViewer({ pageResults, masterPages, printPages }) {
  const [selectedPage, setSelectedPage] = useState(0);
  const [viewMode, setViewMode] = useState('diff'); // 'diff' | 'sideBySide'
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  const currentResult = pageResults?.[selectedPage];
  const masterCanvas = masterPages?.[selectedPage]?.canvas;
  const printCanvas = printPages?.[selectedPage]?.canvas;

  // วาด diff canvas พร้อมวงกรอบสีแดง
  useEffect(() => {
    if (!canvasRef.current || !currentResult) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (viewMode === 'diff' && printCanvas) {
      // แสดงภาพ print พร้อม overlay จุดที่ต่าง
      canvas.width = printCanvas.width;
      canvas.height = printCanvas.height;
      ctx.drawImage(printCanvas, 0, 0);

      // วาดวงกรอบสีแดงรอบจุดที่ต่าง
      if (currentResult.diffRegions && currentResult.diffRegions.length > 0) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.lineWidth = 3;
        currentResult.diffRegions.forEach(r => {
          const pad = 10;
          ctx.strokeRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
        });
      } else if (currentResult.hasDiff && currentResult.diffCanvas) {
        // Fallback: overlay diff canvas
        ctx.globalAlpha = 0.4;
        ctx.drawImage(currentResult.diffCanvas, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
    } else if (viewMode === 'sideBySide') {
      // ไม่ต้องวาดอะไร — ใช้ HTML layout แทน
    }
  }, [selectedPage, currentResult, viewMode, printCanvas]);

  if (!pageResults || pageResults.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant={viewMode === 'diff' ? 'default' : 'outline'} onClick={() => setViewMode('diff')}>
          <Eye className="w-4 h-4 mr-1" />จุดที่ผิด
        </Button>
        <Button size="sm" variant={viewMode === 'sideBySide' ? 'default' : 'outline'} onClick={() => setViewMode('sideBySide')}>
          <Columns2 className="w-4 h-4 mr-1" />เทียบคู่
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Page Sidebar */}
        <div className="w-40 flex-shrink-0">
          <Card>
            <CardHeader className="py-3 px-3">
              <CardTitle className="text-sm">รายการหน้า</CardTitle>
              <p className="text-xs text-muted-foreground">ทั้งหมด {pageResults.length} หน้า</p>
              {pageResults.filter(p => p.hasDiff).length > 0 && (
                <Badge variant="destructive" className="text-xs mt-1">{pageResults.filter(p => p.hasDiff).length} หน้ามีปัญหา</Badge>
              )}
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {pageResults.map((pr, i) => (
                <button key={i} onClick={() => setSelectedPage(i)}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition-colors ${selectedPage === i ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">หน้า {i + 1}</span>
                    {pr.hasDiff && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{pr.diffRegions?.length || '!'} จุด</Badge>}
                  </div>
                  {pr.hasDiff && <p className="text-muted-foreground mt-0.5">พบความแตกต่าง {pr.diffPercent}%</p>}
                  {!pr.hasDiff && <p className="text-emerald-600 mt-0.5">✓ ตรงกัน</p>}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Viewer */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">หน้า {selectedPage + 1}</span>
                {currentResult?.hasDiff ? (
                  <>
                    <Badge variant="destructive">พบ {currentResult.diffRegions?.length || ''} จุดที่แตกต่าง ({currentResult.diffPercent}%)</Badge>
                  </>
                ) : (
                  <Badge variant="success">✓ ตรงกัน</Badge>
                )}
              </div>
              {currentResult?.hasDiff && (
                <p className="text-xs text-muted-foreground">พบจุดที่แตกต่าง — วงกรอบสีแดง (ค่าเผื่อขยับ ≤2MM)</p>
              )}
            </CardHeader>
            <CardContent className="p-2">
              {viewMode === 'diff' ? (
                <div className="border rounded-lg overflow-auto max-h-[700px] bg-gray-50">
                  <canvas ref={canvasRef} className="max-w-full mx-auto" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[700px] overflow-auto">
                  <div>
                    <p className="text-xs font-medium text-center mb-1 text-blue-600">Master</p>
                    <div className="border rounded bg-gray-50">
                      {masterCanvas && <CanvasImage canvas={masterCanvas} />}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-center mb-1 text-purple-600">Print Ready</p>
                    <div className="border rounded bg-gray-50">
                      {printCanvas && <CanvasImage canvas={printCanvas} />}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CanvasImage({ canvas }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !canvas) return;
    ref.current.width = canvas.width;
    ref.current.height = canvas.height;
    ref.current.getContext('2d').drawImage(canvas, 0, 0);
  }, [canvas]);
  return <canvas ref={ref} className="max-w-full" />;
}
