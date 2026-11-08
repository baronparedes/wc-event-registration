import { useRef, useState } from 'react';

import { Camera, ImageUp, Trash2, User } from 'lucide-react';
import Webcam from 'react-webcam';

import { Button, Dialog } from '@/components/ui';
import { fileToJpegDataUrl } from '@/lib/infrastructure';

export type ApplicantAvatarPickerProps = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;
const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'user' },
  width: { ideal: MAX_IMAGE_DIMENSION },
  height: { ideal: MAX_IMAGE_DIMENSION },
};

export function ApplicantAvatarPicker({
  value,
  onChange,
  disabled = false,
}: ApplicantAvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    try {
      const dataUrl = await fileToJpegDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the selected image.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCapturePhoto = () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      setError('Camera is not ready yet. Please try again.');
      return;
    }
    onChange(screenshot);
    setIsCameraOpen(false);
  };

  const handleRemovePhoto = () => {
    setError(null);
    onChange(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Avatar Preview */}
        <div className="relative mx-auto flex-shrink-0 sm:mx-0">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-background shadow-inner sm:h-28 sm:w-28">
            {value ? (
              <img src={value} alt="Applicant preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-muted" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Content & Actions */}
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h3 className="font-heading text-base font-semibold text-text">Applicant Photo</h3>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
              Optional
            </span>
          </div>
          <p className="text-xs text-muted sm:text-sm">
            Upload a clear headshot or take a photo with your device camera. This helps our team
            recognize you during the recruitment journey.
          </p>

          {error && <p className="text-xs font-medium text-danger">{error}</p>}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
            <Button
              type="button"
              variant="primaryOutline"
              size="sm"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageUp className="h-4 w-4" aria-hidden="true" />
              {value ? 'Change Photo' : 'Upload Photo'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setError(null);
                setIsCameraOpen(true);
              }}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Take Photo
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleRemovePhoto}
                className="text-danger hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload applicant photo file"
        className="sr-only"
        onChange={(event) => void handleFileChange(event.target.files?.[0])}
      />

      {/* Live Webcam Modal */}
      <Dialog isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} size="lg">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Take Applicant Photo</Dialog.Title>
          <Dialog.Description>
            Position yourself in the center of the frame, then capture your photo.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-xl bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={JPEG_QUALITY}
              videoConstraints={CAMERA_VIDEO_CONSTRAINTS}
              onUserMediaError={() => setError('Camera access is unavailable or was denied.')}
              className="h-full w-full object-cover"
            />
          </div>
        </Dialog.Body>
        <Dialog.Footer bordered={false} className="mt-4">
          <Button type="button" variant="primaryOutline" onClick={() => setIsCameraOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCapturePhoto}>
            <Camera aria-hidden="true" className="h-4 w-4" />
            Capture Photo
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  );
}
