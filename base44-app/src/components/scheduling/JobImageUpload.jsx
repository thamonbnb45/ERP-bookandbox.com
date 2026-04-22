import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImagePlus, X, Loader2, ZoomIn } from 'lucide-react';

export default function JobImageUpload({ jobId, images = [], onUpdate }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    const newImages = [...images, ...uploaded];
    await base44.entities.PrintJob.update(jobId, { images: newImages });
    onUpdate(newImages);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = async (url) => {
    const newImages = images.filter(u => u !== url);
    await base44.entities.PrintJob.update(jobId, { images: newImages });
    onUpdate(newImages);
  };

  return (
    <div>
      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="" className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" />
          <button className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {images.map((url, idx) => (
          <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => setPreview(url)}
                className="bg-white/90 rounded-full p-1.5 hover:bg-white"
              >
                <ZoomIn className="w-3.5 h-3.5 text-gray-700" />
              </button>
              <button
                onClick={() => handleRemove(url)}
                className="bg-white/90 rounded-full p-1.5 hover:bg-white"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-1 transition-all shrink-0 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <>
              <ImagePlus className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-400">เพิ่มรูป</span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>
    </div>
  );
}