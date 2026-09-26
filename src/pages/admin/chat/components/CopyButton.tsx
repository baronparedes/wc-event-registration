import { useState } from 'react';

import { Check, Copy } from 'lucide-react';

type CopyButtonProps = {
  content: string;
};

export function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center p-1.5 text-muted hover:text-text hover:bg-muted/10 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      title="Copy response"
      aria-label="Copy response"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
