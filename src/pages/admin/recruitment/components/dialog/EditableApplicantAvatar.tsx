import { useRef, useState } from 'react';

import { Camera, ImageUp } from 'lucide-react';
import Webcam from 'react-webcam';
import { toast } from 'sonner';

import { Avatar, Button, Dialog, Spinner } from '@/components/ui';
import { useUploadRecruitmentAvatarMutation } from '@/hooks/domain/recruitment';
import { fileToJpegDataUrl } from '@/lib/infrastructure';

interface EditableApplicantAvatarProps {
  applicationId: string;
  name: string;
  avatarObjectKey: string | null;
}

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;
const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: MAX_IMAGE_DIMENSION },
  height: { ideal: MAX_IMAGE_DIMENSION },
};

export function EditableApplicantAvatar({
  applicationId,
  name,
  avatarObjectKey,
}: EditableApplicantAvatarProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadAvatarMutation = useUploadRecruitmentAvatarMutation();
  const isSaving = uploadAvatarMutation.isPending;

  async function saveImage(imageBase64: string) {
    setError(null);
    setIsChooserOpen(false);
    setIsCameraOpen(false);
    setPreviewUrl(imageBase64);

    uploadAvatarMutation.mutate(
      {
        applicationId,
        imageBase64,
      },
      {
        onSuccess: () => {
          toast.success('Applicant photo updated');
        },
        onError: (caughtError) => {
          const msg =
            caughtError instanceof Error ? caughtError.message : 'Could not save the photo.';
          setError(msg);
          toast.error(msg);
          setPreviewUrl(null);
        },
      },
    );
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;

    try {
      const imageBase64 = await fileToJpegDataUrl(file);
      await saveImage(imageBase64);
    } catch (caughtError) {
      const msg =
        caughtError instanceof Error ? caughtError.message : 'Could not prepare the photo.';
      setError(msg);
      toast.error(msg);
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
    <div className="flex flex-col items-center">
      <div className="relative">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={name}
            className="h-32 w-32 rounded-full bg-muted object-cover border border-border"
          />
        ) : (
          <Avatar size="lg" name={name} avatarObjectKey={avatarObjectKey} />
        )}
        <button
          type="button"
          aria-label="Upload applicant photo"
          title="Upload or take a photo"
          disabled={isSaving}
          onClick={() => setIsChooserOpen(true)}
          style={{ minHeight: 'unset', aspectRatio: '1 / 1' }}
          className="absolute bottom-0 right-0 flex h-10 w-10 min-h-0 min-w-0 p-0 aspect-square shrink-0 items-center justify-center rounded-full border-2 border-surface bg-primary text-white shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Spinner aria-hidden="true" size="sm" />
          ) : (
            <Camera aria-hidden="true" className="h-5 w-5 shrink-0" />
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      <Dialog isOpen={isChooserOpen} onClose={() => setIsChooserOpen(false)} size="sm">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Applicant photo</Dialog.Title>
          <Dialog.Description>Choose an existing image or take a new photo.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
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
        </Dialog.Body>
      </Dialog>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        aria-label="Choose applicant photo"
        className="sr-only"
        onChange={(event) => void handleFileChange(event.target.files?.[0])}
      />

      <Dialog isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} size="lg">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Take applicant photo</Dialog.Title>
          <Dialog.Description>
            Position the applicant in the frame, then capture the photo.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body className="space-y-4">
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
        </Dialog.Body>
        <Dialog.Footer bordered={false} className="mt-4">
          <Button type="button" variant="primaryOutline" onClick={() => setIsCameraOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void handleCapturePhoto()}>
            <Camera aria-hidden="true" className="h-4 w-4" />
            Capture photo
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  );
}
