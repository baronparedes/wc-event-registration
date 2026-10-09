import type { ReactNode } from 'react';

import { Check, Copy, Download, Share2 } from 'lucide-react';

import { Button } from '../Button';
import { useOptionalImageCanvasContext } from './context';

export type ImageCanvasAction = 'copy' | 'download' | 'share';

/** Subset of `useImageCanvas` output that the toolbar needs. Handlers are optional. */
export type ImageCanvasController = {
  isGenerating: boolean;
  copied?: boolean;
  copy?: () => void | Promise<void>;
  download?: () => void | Promise<void>;
  share?: () => void | Promise<void>;
};

export type ImageCanvasActionLabels = {
  copy: string;
  copied: string;
  download: string;
  share: string;
};

const DEFAULT_LABELS: ImageCanvasActionLabels = {
  copy: 'Copy Image',
  copied: 'Image Copied',
  download: 'Download Image',
  share: 'Share',
};

export type ImageCanvasActionsProps = {
  /** Optional when wrapped in <ImageCanvas.Provider>. */
  controller?: ImageCanvasController;
  /** Buttons to render, in order. The `share` action uses the primary variant. */
  actions: ImageCanvasAction[];
  labels?: Partial<ImageCanvasActionLabels>;
  buttonClassName?: string;
  /** Extra footer content rendered after the standard actions. */
  children?: ReactNode;
};

/** Standard Copy / Download / Share button group wired to an `ImageCanvas` controller or context. */
export function ImageCanvasActions({
  controller: propController,
  actions,
  labels,
  buttonClassName,
  children,
}: ImageCanvasActionsProps) {
  const context = useOptionalImageCanvasContext();
  const controller = propController ?? context?.controller;

  if (!controller) {
    throw new Error(
      'ImageCanvasActions requires a controller prop or must be used within <ImageCanvas.Provider>.',
    );
  }

  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const { isGenerating, copied = false } = controller;

  return (
    <>
      {actions.map((action) => {
        const handler = controller[action];
        if (!handler) return null;

        if (action === 'copy') {
          return (
            <Button
              key={action}
              variant="outline"
              onClick={handler}
              disabled={isGenerating}
              className={buttonClassName}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                  {resolvedLabels.copied}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {resolvedLabels.copy}
                </>
              )}
            </Button>
          );
        }

        if (action === 'download') {
          return (
            <Button
              key={action}
              variant="outline"
              onClick={handler}
              disabled={isGenerating}
              className={buttonClassName}
            >
              <Download className="mr-2 h-4 w-4" />
              {resolvedLabels.download}
            </Button>
          );
        }

        return (
          <Button
            key={action}
            onClick={handler}
            disabled={isGenerating}
            className={buttonClassName}
          >
            <Share2 className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : resolvedLabels.share}
          </Button>
        );
      })}
      {children}
    </>
  );
}
