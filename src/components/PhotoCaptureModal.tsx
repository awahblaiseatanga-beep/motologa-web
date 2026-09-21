import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Check, X, Upload } from 'lucide-react';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: 'dashboard' | 'exterior' | 'old-part' | 'new-part' | 'general-job';
  currentPhotoUrl?: string;
  onPhotoCaptured: (dataUrl: string) => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  title,
  category,
  currentPhotoUrl,
  onPhotoCaptured,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string>(currentPhotoUrl || '');
  const [previewSizeKb, setPreviewSizeKb] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              if (blob) {
                const sizeKb = Math.round(blob.size / 1024);
                if (sizeKb > 300) {
                  console.warn(`Compressed image exceeds 300KB (${sizeKb} KB). Compression limits hit.`);
                }
                setPreviewSizeKb(sizeKb);
                const objectUrl = URL.createObjectURL(blob);
                setPreview(objectUrl);
              }
            }, 'image/jpeg', 0.6);
          };
          img.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (preview) {
      onPhotoCaptured(preview);
    }
    onClose();
  };

  return (
    <div
      id="photo-capture-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="photo-capture-modal"
        className="w-full max-w-md bg-stone-900 border-2 border-emerald-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#0E2829] px-4 py-3.5 flex items-center justify-between border-b border-emerald-500/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
            <h3 className="font-bold text-white text-base tracking-wide uppercase">
              {title}
            </h3>
          </div>
          <button
            id="close-photo-modal-btn"
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewport/Preview Container */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="relative aspect-4/3 w-full bg-stone-950 rounded-xl overflow-hidden border border-stone-800 flex items-center justify-center group">
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Captured asset"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {previewSizeKb !== null && (
                  <div className="absolute top-3 right-3 bg-stone-950/80 border border-emerald-500/50 backdrop-blur-md px-2 py-1 flex items-center gap-1.5 rounded-lg z-10 shadow-lg">
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">📦 Size:</span>
                    <span className="text-xs font-mono font-bold text-white">{previewSizeKb} KB</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-6 space-y-2">
                <Camera className="w-14 h-14 text-emerald-400 mx-auto stroke-[1.5]" />
                <p className="font-bold text-slate-200 text-sm">
                  No image recorded yet
                </p>
                <p className="text-xs text-slate-400">
                  Tap Camera below or choose a workshop snapshot
                </p>
              </div>
            )}

            {/* Corner Crosshairs for rugged camera viewfinder look */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400 pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400 pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 pointer-events-none"></div>
          </div>

          {/* Real Device Camera / File Input trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              id="trigger-native-camera-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[48px] px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md"
            >
              <Camera className="w-5 h-5" />
              <span>Take Photo</span>
            </button>

            <button
              id="trigger-file-upload-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[48px] px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all border border-stone-700"
            >
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Upload Gallery</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 bg-[#0E2829] border-t border-emerald-500/30 flex gap-2">
          {preview && (
            <button
              type="button"
              onClick={() => { setPreview(''); setPreviewSizeKb(null); }}
              className="min-h-[48px] px-4 rounded-xl bg-stone-800 text-rose-300 hover:bg-stone-700 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}

          <button
            id="confirm-photo-btn"
            type="button"
            disabled={!preview}
            onClick={handleSave}
            className={`flex-1 min-h-[48px] px-4 rounded-xl font-black text-base flex items-center justify-center gap-2 shadow-lg transition-all ${
              preview
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 active:scale-98 cursor-pointer'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Confirm & Attach Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
