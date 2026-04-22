import React, { useRef, useState, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraOff, SwitchCamera, QrCode, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CameraScanQR() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const navigate = useNavigate();

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [scannedUrl, setScannedUrl] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // environment = back camera
  const streamRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (facing) => {
    setError('');
    setScannedUrl('');
    stopCamera();

    const constraints = {
      video: {
        facingMode: facing || facingMode,
        width: { ideal: 640 },
        height: { ideal: 480 },
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('กรุณาอนุญาตการเข้าถึงกล้อง');
      } else if (err.name === 'NotFoundError') {
        setError('ไม่พบกล้องบนอุปกรณ์นี้');
      } else {
        setError('ไม่สามารถเปิดกล้องได้: ' + err.message);
      }
    }
  }, [facingMode, stopCamera]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      const url = code.data;
      // Check if it's our ScanStatus URL
      if (url.includes('/ScanStatus') && url.includes('job=') && url.includes('status=')) {
        setScannedUrl(url);
        stopCamera();
        // Navigate to the scanned URL
        const urlObj = new URL(url);
        navigate(urlObj.pathname + urlObj.search);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, navigate]);

  const toggleCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Camera className="w-6 h-6" /> สแกน QR Code
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">ใช้กล้องสแกน QR Code เพื่ออัพเดทสถานะงาน</p>
      </div>

      {/* Camera View */}
      <Card className="overflow-hidden border-gray-200 shadow-lg">
        <CardContent className="p-0 relative">
          {/* Video Element */}
          <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay - scan frame */}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 relative">
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-lg" />
                  {/* Scan line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 animate-pulse top-1/2" />
                </div>
              </div>
            )}

            {/* Inactive state */}
            {!cameraActive && !error && (
              <div className="text-center text-white/70 space-y-3">
                <QrCode className="w-16 h-16 mx-auto opacity-50" />
                <p className="text-sm">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="text-center text-white/80 space-y-3 px-6">
                <AlertTriangle className="w-12 h-12 mx-auto text-amber-400" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Scanned success */}
            {scannedUrl && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white space-y-3">
                  <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-400" />
                  <p className="text-sm font-medium">สแกนสำเร็จ!</p>
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-white/60" />
                  <p className="text-xs text-white/50">กำลังนำทาง...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-50">
            {!cameraActive ? (
              <Button
                onClick={() => startCamera()}
                className="h-12 px-8 text-base font-bold bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Camera className="w-5 h-5" />
                เปิดกล้องสแกน
              </Button>
            ) : (
              <>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="h-10 gap-2"
                >
                  <CameraOff className="w-4 h-4" />
                  ปิดกล้อง
                </Button>
                <Button
                  onClick={toggleCamera}
                  variant="outline"
                  className="h-10 gap-2"
                >
                  <SwitchCamera className="w-4 h-4" />
                  สลับกล้อง
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1.5">
        <p className="font-semibold flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5" /> วิธีใช้งาน
        </p>
        <ol className="list-decimal list-inside space-y-1 text-blue-600">
          <li>กดปุ่ม "เปิดกล้องสแกน" และอนุญาตการใช้กล้อง</li>
          <li>ส่องกล้องไปที่ QR Code บนใบสั่งงาน</li>
          <li>ระบบจะอ่าน QR Code และนำไปหน้าอัพเดทสถานะอัตโนมัติ</li>
          <li>ยืนยันการเปลี่ยนสถานะเพื่อเสร็จสิ้น</li>
        </ol>
      </div>
    </div>
  );
}