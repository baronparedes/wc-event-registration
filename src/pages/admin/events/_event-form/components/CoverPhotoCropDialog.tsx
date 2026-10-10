import { useEffect, useRef, useState } from 'react';

import {
  Check,
  Crop,
  Eye,
  Grid3X3,
  Info,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCw,
  Sparkles,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface CoverPhotoCropDialogProps {
  isOpen: boolean;
  imageSrc: string | null;
  fileName?: string;
  onClose: () => void;
  onApplyCrop: (croppedFile: File) => Promise<void>;
  isSaving?: boolean;
}

const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;

function CoverPhotoCropContent({
  imageSrc,
  fileName,
  onClose,
  onApplyCrop,
  isSaving,
}: {
  imageSrc: string;
  fileName: string;
  onClose: () => void;
  onApplyCrop: (croppedFile: File) => Promise<void>;
  isSaving: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const isRemote = imageSrc.startsWith('http://') || imageSrc.startsWith('https://');
  const [localImageSrc, setLocalImageSrc] = useState<string>(imageSrc);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(isRemote);
  const [activeTab, setActiveTab] = useState<'crop' | 'preview'>('crop');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeZoneOverlay, setShowSafeZoneOverlay] = useState(false);

  // Convert remote URLs to local blob URLs to avoid canvas CORS tainting during toBlob export
  useEffect(() => {
    let isCancelled = false;
    let createdBlobUrl: string | null = null;

    if (isRemote) {
      fetch(imageSrc, { mode: 'cors' })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch image');
          return res.blob();
        })
        .then((blob) => {
          if (isCancelled) return;
          const url = URL.createObjectURL(blob);
          createdBlobUrl = url;
          setLocalImageSrc(url);
        })
        .catch(() => {
          if (!isCancelled) setLocalImageSrc(imageSrc);
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingImage(false);
        });
    }

    return () => {
      isCancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [imageSrc, isRemote]);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }

  function handleTouchEnd() {
    setIsDragging(false);
  }

  function handleRotate() {
    setRotation((prev) => (prev + 90) % 360);
  }

  function handleReset() {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }

  function handleFitWholeImage() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleFillFrame() {
    if (!imageRef.current) {
      setZoom(1.5);
      setPan({ x: 0, y: 0 });
      return;
    }
    const img = imageRef.current;
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const effWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
    const effHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

    if (!effWidth || !effHeight) {
      setZoom(1.5);
      return;
    }

    const coverScale = Math.max(OUTPUT_WIDTH / effWidth, OUTPUT_HEIGHT / effHeight);
    const fitScale = Math.min(OUTPUT_WIDTH / effWidth, OUTPUT_HEIGHT / effHeight);
    const fillZoomFactor = fitScale > 0 ? coverScale / fitScale : 1;

    setZoom(Math.max(1, Math.min(4, Math.round(fillZoomFactor * 100) / 100)));
    setPan({ x: 0, y: 0 });
  }

  async function handleCropAndSave() {
    if (!imageRef.current || !containerRef.current) return;

    try {
      const img = imageRef.current;
      const container = containerRef.current;
      if (!img || !container) {
        toast.error('Failed to crop image');
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Failed to create canvas context');
        return;
      }

      const scaleToOutput = OUTPUT_WIDTH / containerRect.width;

      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      const centerX = OUTPUT_WIDTH / 2;
      const centerY = OUTPUT_HEIGHT / 2;

      ctx.translate(centerX + pan.x * scaleToOutput, centerY + pan.y * scaleToOutput);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const isRotated90or270 = rotation === 90 || rotation === 270;
      const effectiveWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const effectiveHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      const scale = Math.min(
        OUTPUT_WIDTH / (effectiveWidth || 1),
        OUTPUT_HEIGHT / (effectiveHeight || 1),
      );
      const drawWidth = (img.naturalWidth || OUTPUT_WIDTH) * scale;
      const drawHeight = (img.naturalHeight || OUTPUT_HEIGHT) * scale;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      if (!blob) {
        toast.error('Failed to generate cropped image');
        return;
      }

      const cleanBaseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const outputFileName = `${cleanBaseName || 'cover'}.jpg`;
      const file = new File([blob], outputFileName, { type: 'image/jpeg' });
      await onApplyCrop(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to crop image';
      toast.error(message);
    }
  }

  return (
    <>
      <Dialog.Header showCloseButton>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pr-8">
          <div>
            <Dialog.Title>Adjust Cover Photo</Dialog.Title>
            <Dialog.Description>
              Drag to reposition, use the zoom slider, or toggle fit/fill to adjust framing for the
              16:9 banner.
            </Dialog.Description>
          </div>
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-hover p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('crop')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                activeTab === 'crop'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Crop className="h-3.5 w-3.5" aria-hidden="true" />
              Crop & Position
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Live Preview
            </button>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className="space-y-4">
        {/* Visual Guidance Banner */}
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-text">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold text-text">
              What you see inside the 16:9 frame is exactly what will be displayed.
            </p>
            <p className="text-muted">
              Use <strong>Fit Whole Image</strong> to see the entire uncropped image, or{' '}
              <strong>Fill Frame</strong> to zoom and cover the banner. Drag to reposition any part
              of the photo.
            </p>
          </div>
        </div>

        {activeTab === 'crop' ? (
          <>
            {/* Viewfinder Frame */}
            <div className="relative">
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`relative aspect-video w-full cursor-grab select-none overflow-hidden rounded-xl border-2 border-primary bg-slate-950 shadow-lg ${
                  isDragging ? 'cursor-grabbing' : ''
                }`}
              >
                {/* Visual Ratio & Resolution Badge */}
                <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-1.5">
                  <Badge
                    variant="default"
                    className="bg-slate-900/90 text-white shadow-md backdrop-blur-xs text-[11px] font-medium border border-white/20"
                  >
                    16:9 Banner Crop Area
                  </Badge>
                  <span className="hidden sm:inline-flex rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono text-white/80 backdrop-blur-xs border border-white/10">
                    1920 × 1080 Full HD
                  </span>
                </div>

                {/* Corner Framing L-Brackets */}
                <div className="pointer-events-none absolute inset-0 z-20 p-2">
                  <div className="relative h-full w-full">
                    <span className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-white drop-shadow-md" />
                    <span className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-white drop-shadow-md" />
                    <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-white drop-shadow-md" />
                    <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-white drop-shadow-md" />
                  </div>
                </div>

                {/* Rule of Thirds Grid with Crosshair */}
                {showGrid && (
                  <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 opacity-40">
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="relative border-r border-b border-white/60">
                      {/* Center Crosshair Marker */}
                      <span className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <span className="absolute top-0 left-1/2 h-full w-[1px] -translate-x-1/2 bg-white drop-shadow-sm" />
                        <span className="absolute top-1/2 left-0 h-[1px] w-full -translate-y-1/2 bg-white drop-shadow-sm" />
                      </span>
                    </div>
                    <div className="border-b border-white/60" />
                    <div className="border-r border-white/60" />
                    <div className="border-r border-white/60" />
                    <div />
                  </div>
                )}

                {/* Simulated Safe-Zone Overlay (Page Mock Context) */}
                {showSafeZoneOverlay && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 bg-gradient-to-t from-black/60 via-transparent to-black/30">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                        Open for Registration
                      </span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-900 shadow-sm">
                        Open to Guests
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-4 w-2/3 rounded-sm bg-white/70 backdrop-blur-xs" />
                      <div className="h-3 w-1/3 rounded-sm bg-white/50 backdrop-blur-xs" />
                    </div>
                  </div>
                )}

                {/* Loading state indicator */}
                {isLoadingImage && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                  </div>
                )}

                {/* Draggable & Scalable Image (Contains 100% full image at zoom 1) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img
                    ref={imageRef}
                    src={localImageSrc}
                    crossOrigin="anonymous"
                    alt="Crop preview"
                    draggable={false}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() =>
                    setZoom((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))
                  }
                  className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-text transition-colors"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.05"
                  value={zoom}
                  aria-label="Zoom image"
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="h-1.5 w-24 sm:w-36 cursor-pointer accent-primary"
                />
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => setZoom((prev) => Math.min(4, Math.round((prev + 0.1) * 10) / 10))}
                  className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-text transition-colors"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-11 text-right font-mono text-xs text-muted">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Action Buttons & Guides Toggles */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleFitWholeImage}
                  title="Fit whole uncropped image within frame"
                >
                  <Minimize2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Fit Whole Image
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleFillFrame}
                  title="Fill 16:9 frame"
                >
                  <Maximize2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Fill Frame
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={showGrid ? 'secondary' : 'outline'}
                  onClick={() => setShowGrid((prev) => !prev)}
                  title={showGrid ? 'Hide Rule of Thirds grid' : 'Show Rule of Thirds grid'}
                >
                  <Grid3X3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Grid
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={showSafeZoneOverlay ? 'secondary' : 'outline'}
                  onClick={() => setShowSafeZoneOverlay((prev) => !prev)}
                  title="Toggle safe zone guide showing event title and badge overlays"
                >
                  <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Overlay Guide
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRotate}
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Rotate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  title="Reset zoom, rotation, and position"
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Reset
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Live Display Preview Tab */
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Registration Page Banner Preview
                </span>
                <span className="text-xs text-muted">16:9 Banner Display</span>
              </div>

              {/* Mock EventHeaderCard Banner */}
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={localImageSrc}
                      crossOrigin="anonymous"
                      alt="Cropped banner preview"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-surface border-t border-border flex items-center justify-between text-xs">
                  <span className="font-semibold text-text">Event Title (Live Page Banner)</span>
                  <Badge variant="default">Open</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('crop')}
              >
                <Crop className="mr-1.5 h-3.5 w-3.5" />
                Back to Crop & Position
              </Button>
            </div>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer bordered={false} className="mt-4">
        <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isSaving || isLoadingImage}
          onClick={() => void handleCropAndSave()}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              Apply & Save Cover
            </>
          )}
        </Button>
      </Dialog.Footer>
    </>
  );
}

export function CoverPhotoCropDialog({
  isOpen,
  imageSrc,
  fileName = 'cover.jpg',
  onClose,
  onApplyCrop,
  isSaving = false,
}: CoverPhotoCropDialogProps) {
  if (!imageSrc) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="4xl">
      <CoverPhotoCropContent
        key={imageSrc}
        imageSrc={imageSrc}
        fileName={fileName}
        onClose={onClose}
        onApplyCrop={onApplyCrop}
        isSaving={isSaving}
      />
    </Dialog>
  );
}
