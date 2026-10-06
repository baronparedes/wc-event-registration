import { useId, useRef, useState } from 'react';

import { Crop, ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import {
  deleteEventCoverImage,
  getEventCoverPublicUrl,
  uploadEventCoverImage,
} from '@/lib/domain/events';

import { CoverPhotoCropDialog } from './CoverPhotoCropDialog';

interface EventCoverPhotoUploadProps {
  coverImageKey: string | null | undefined;
  onCoverImageKeyChange: (key: string | null) => void;
  eventIdOrSlug?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // Allow up to 10MB raw files
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function EventCoverPhotoUpload({
  coverImageKey,
  onCoverImageKeyChange,
  eventIdOrSlug,
  disabled = false,
}: EventCoverPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Crop dialog state
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>('cover.jpg');

  const coverUrl = getEventCoverPublicUrl(coverImageKey);

  async function handleFile(file: File) {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File is too large. Maximum allowed size is 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedPath = await uploadEventCoverImage(file, eventIdOrSlug);
      onCoverImageKeyChange(uploadedPath);
      toast.success('Cover photo uploaded successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload cover photo';
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleApplyCroppedFile(croppedFile: File) {
    setIsUploading(true);
    try {
      const uploadedPath = await uploadEventCoverImage(croppedFile, eventIdOrSlug);
      onCoverImageKeyChange(uploadedPath);
      setIsCropOpen(false);
      toast.success('Adjusted cover photo saved successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save adjusted cover photo';
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleAdjustCrop() {
    if (!coverUrl || disabled || isUploading) return;
    setCropImageSrc(coverUrl);
    setCropFileName('cover.jpg');
    setIsCropOpen(true);
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled || isUploading) return;
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  async function handleRemove() {
    if (disabled || isUploading) return;

    const currentKey = coverImageKey;
    onCoverImageKeyChange(null);

    if (currentKey) {
      try {
        await deleteEventCoverImage(currentKey);
      } catch {
        // Silently ignore storage deletion failure if already detached from event
      }
    }
    toast.info('Cover photo removed');
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-text">
        Cover Photo
      </label>

      {coverUrl ? (
        <div className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
          <div className="relative aspect-video w-full overflow-hidden bg-background">
            <img
              src={coverUrl}
              alt="Event cover preview"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                <span className="mt-2 text-sm font-medium text-text">Uploading...</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface/90 p-3">
            <span className="text-xs text-muted">16:9 widescreen format</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || isUploading}
                onClick={handleAdjustCrop}
              >
                <Crop className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Adjust Crop
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Change Photo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={disabled || isUploading}
                onClick={() => void handleRemove()}
              >
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isUploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-surface'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-text">Uploading cover photo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <UploadCloud className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">
                  Click to upload or drag & drop cover photo
                </p>
                <p className="mt-1 text-xs text-muted">
                  JPEG, PNG, or WebP (optionally crop or reposition after upload)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload event cover photo"
        className="sr-only"
        disabled={disabled || isUploading}
        onChange={handleFileInputChange}
      />

      <CoverPhotoCropDialog
        isOpen={isCropOpen}
        imageSrc={cropImageSrc}
        fileName={cropFileName}
        isSaving={isUploading}
        onClose={() => {
          setIsCropOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onApplyCrop={handleApplyCroppedFile}
      />
    </div>
  );
}
