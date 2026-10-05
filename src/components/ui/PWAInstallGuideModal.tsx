import { PlusSquare, Share, Smartphone } from 'lucide-react';

import { Button } from './Button';
import { Dialog } from './Dialog';

export interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallGuideModal({ isOpen, onClose }: PWAInstallGuideModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      ariaLabel="How to install Welcome Hub on iOS"
    >
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <Dialog.Title>Install Welcome Hub</Dialog.Title>
            <Dialog.Description>
              Follow these quick steps in Safari to add to your Home Screen
            </Dialog.Description>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body>
        <div className="space-y-3.5 text-sm text-text">
          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface-hover/50 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              1
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Tap the <span className="font-semibold text-primary">Share</span> button
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Located in Safari&apos;s bottom toolbar (or top bar on iPad){' '}
                <Share className="inline-block h-3.5 w-3.5 align-text-bottom text-primary" />.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface-hover/50 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              2
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Select <span className="font-semibold text-primary">Add to Home Screen</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Scroll down the share sheet options and tap{' '}
                <PlusSquare className="inline-block h-3.5 w-3.5 align-text-bottom text-primary" />{' '}
                Add to Home Screen.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface-hover/50 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              3
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Tap <span className="font-semibold text-primary">Add</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Confirm by tapping Add in the top-right corner to install.
              </p>
            </div>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button type="button" size="sm" onClick={onClose} className="w-full sm:w-auto">
          Got it
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
