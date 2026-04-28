import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Ruler, CheckCircle2, Scissors } from 'lucide-react';

export default function DocumentSizeBar({ masterInfo, printInfo, sizeInfo, bleedInfo }) {
  if (!masterInfo) return null;

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">ข้อมูลขนาดเอกสาร</span>
          </div>
          <span className="text-muted-foreground">
            Master: {masterInfo.widthMm?.toFixed(1)} × {masterInfo.heightMm?.toFixed(1)} cm
          </span>
          {printInfo?.widthMm > 0 && (
            <span className="text-muted-foreground">
              Print: {printInfo.widthMm?.toFixed(1)} × {printInfo.heightMm?.toFixed(1)} cm
            </span>
          )}
          {sizeInfo?.detectedSize && (
            <Badge variant="default" className="text-xs">ขนาด {sizeInfo.detectedSize}</Badge>
          )}
          {bleedInfo?.hasBleed && (
            <Badge variant="success" className="text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              ตรวจพบ Bleed ~{bleedInfo.bleedMm}mm — ตัดแล้วก่อนเปรียบเทียบ
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
