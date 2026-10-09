import type { ReactNode } from 'react';

import { Button, type ButtonProps } from '../Button';
import { useOptionalImageCanvasContext } from './context';

export type ImageCanvasCancelButtonProps = Omit<ButtonProps, 'disabled' | 'children'> & {
  disabled?: boolean;
  children?: ReactNode;
};

/** Cancel button that automatically disables while canvas generation is in flight. */
export function ImageCanvasCancelButton({
  onClick,
  children = 'Cancel',
  className,
  disabled: propDisabled,
  variant = 'primaryOutline',
  ...buttonProps
}: ImageCanvasCancelButtonProps) {
  const context = useOptionalImageCanvasContext();
  const isGenerating = context?.isGenerating ?? false;

  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={propDisabled ?? isGenerating}
      className={className}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
