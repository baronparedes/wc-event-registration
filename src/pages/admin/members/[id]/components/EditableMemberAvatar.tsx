import { useRef, useState } from 'react';

import { Camera, ImageUp, Loader2 } from 'lucide-react';
import Webcam from 'react-webcam';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface EditableMemberAvatarProps {
  name: string;
  avatarObjectKey: string | null;
  isSaving: boolean;
  onSave: (imageBase64: string) => Promise<void>;
}

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;
const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: MAX_IMAGE_DIMENSION },
  height: { ideal: MAX_IMAGE_DIMENSION },
};

async function fileToJpegDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the image.');

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function EditableMemberAvatar({
  name,
  avatarObjectKey,
  isSaving,
  onSave,
}: EditableMemberAvatarProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveImage(imageBase64: string) {
    setError(null);
    setIsChooserOpen(false);
    setIsCameraOpen(false);
    setPreviewUrl(imageBase64);

    try {
      await onSave(imageBase64);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not save the photo.');
    }
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;

    try {
      const imageBase64 = await fileToJpegDataUrl(file);
      await saveImage(imageBase64);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not save the photo.');
    }

    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }

  function handleTakePhoto() {
    setError(null);
    setIsChooserOpen(false);
    setIsCameraOpen(true);
  }

  async function handleCapturePhoto() {
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setError('The camera is not ready. Try again.');
      return;
    }

    await saveImage(imageBase64);
  }

  return (
    <div className="mb-4 flex flex-col items-center gap-2">
      <div className="relative">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={name}
            className="h-48 w-48 rounded-full bg-muted object-cover"
          />
        ) : (
          <Avatar size="xl" name={name} avatarObjectKey={avatarObjectKey} />
        )}
        <button
          type="button"
          aria-label="Upload member photo"
          title="Upload or take a photo"
          disabled={isSaving}
          onClick={() => setIsChooserOpen(true)}
          className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-primary text-white shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <Camera aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Dialog
        isOpen={isChooserOpen}
        onClose={() => setIsChooserOpen(false)}
        title="Member photo"
        description="Choose an existing image or take a new photo."
        maxWidthClass="max-w-sm"
        showCloseIcon
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="primaryOutline"
            onClick={() => uploadInputRef.current?.click()}
          >
            <ImageUp aria-hidden="true" className="h-4 w-4" />
            Upload photo
          </Button>
          <Button type="button" variant="primaryOutline" onClick={handleTakePhoto}>
            <Camera aria-hidden="true" className="h-4 w-4" />
            Take photo
          </Button>
        </div>
      </Dialog>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        aria-label="Choose member photo"
        className="sr-only"
        onChange={(event) => void handleFileChange(event.target.files?.[0])}
      />
      <Dialog
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title="Take member photo"
        description="Position the member in the frame, then capture the photo."
        maxWidthClass="max-w-lg"
        showCloseIcon
      >
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-lg bg-black">
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
          <div className="flex justify-end gap-3">
            <Button type="button" variant="primaryOutline" onClick={() => setIsCameraOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void handleCapturePhoto()}>
              <Camera aria-hidden="true" className="h-4 w-4" />
              Capture photo
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
