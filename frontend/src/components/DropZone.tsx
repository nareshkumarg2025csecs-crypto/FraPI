import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { PillButton } from './PillButton';

export interface DropZoneProps {
  onImageSelected: (imageFile: File | Blob) => void;
  isProcessing?: boolean;
  processingLabel?: string;
  error?: string | null;
  acceptedFileTypes?: string;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onImageSelected,
  isProcessing = false,
  processingLabel = 'Processing image...',
  error,
  acceptedFileTypes = 'image/png,image/jpeg,image/webp,image/jpg',
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
              onImageSelected(blob);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="Upload payment screenshot or QR image"
      data-testid="dropzone"
      className={`relative w-full rounded-3xl p-8 md:p-12 border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center select-none min-h-[260px] ${
        isDragOver
          ? 'border-sky-400 bg-sky-500/10'
          : error
          ? 'border-red-500/60 bg-red-950/20'
          : 'border-[#233044] bg-[#131d2e] hover:border-sky-500/40 hover:bg-[#1e293b]/50'
      } ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        aria-hidden="true"
      />

      {isProcessing ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
          <p className="text-sm font-semibold text-[#f8fafc]">{processingLabel}</p>
          <p className="text-xs text-[#64748b]">Running OCR and QR decoders locally on device</p>
        </div>
      ) : previewUrl ? (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative max-h-48 max-w-full rounded-2xl overflow-hidden border border-[#233044] bg-black/40">
            <img src={previewUrl} alt="Uploaded payment reference" className="max-h-48 object-contain" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>Image loaded. Click or drop another image to replace.</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-2">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h4 className="text-lg md:text-xl font-bold text-[#f8fafc]">
            Drop payment screenshot or QR code here
          </h4>
          <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed">
            Drag & drop an image, browse from device, or paste from clipboard (<kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">Ctrl+V</kbd>).
          </p>

          <div className="mt-3">
            <PillButton size="sm" variant="secondary" icon={<ImageIcon className="w-4 h-4" />}>
              Select Image File
            </PillButton>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-[#64748b] mt-2">
            PNG, JPG, WEBP • Processed 100% locally in your browser
          </p>
        </div>
      )}
    </div>
  );
};
