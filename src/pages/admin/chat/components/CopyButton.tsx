import { useState } from 'react';

import { Check, Copy } from 'lucide-react';

export type CopyButtonProps = {
  content?: string;
  getText?: () => string;
  className?: string;
  showLabel?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  iconSize?: string;
  title?: string;
  'aria-label'?: string;
};

export function CopyButton({
  content,
  getText,
  className = '',
  showLabel = false,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  iconSize = 'h-4 w-4',
  title = 'Copy response',
  'aria-label': ariaLabel = 'Copy response',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = (getText ? getText() : content)?.trim();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const defaultClasses = showLabel
    ? 'inline-flex items-center gap-1 rounded-md border border-border bg-surface/90 backdrop-blur-sm px-2 py-1 text-xs text-muted hover:text-text hover:bg-muted/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
    : 'inline-flex items-center justify-center p-1.5 text-muted hover:text-text hover:bg-muted/10 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className ? `${defaultClasses} ${className}` : defaultClasses}
      title={title}
      aria-label={ariaLabel}
    >
      {copied ? (
        <>
          <Check className={`${iconSize} text-primary`} />
          {showLabel && <span className="text-[10px] text-primary font-medium">{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className={iconSize} />
          {showLabel && <span className="text-[10px]">{copyLabel}</span>}
        </>
      )}
    </button>
  );
}
