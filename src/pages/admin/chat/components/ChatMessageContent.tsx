import { memo, useMemo, useState } from 'react';

import { Check, Copy, ExternalLink } from 'lucide-react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useResolveUserTokensQuery } from '@/hooks/domain/chat';

type ChatMessageContentProps = {
  content: string;
};

const TOKEN_REGEX = /USR_\d{6}/g;
const REMARK_PLUGINS = [remarkGfm];

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (
    node &&
    typeof node === 'object' &&
    'props' in node &&
    node.props &&
    typeof node.props === 'object' &&
    'children' in node.props
  ) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function PreBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = extractText(children).trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  return (
    <div className="relative group my-2">
      <pre className="overflow-x-auto rounded-xl border border-border bg-surface p-3 font-mono text-xs text-text">
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface/90 backdrop-blur-sm px-2 py-1 text-xs text-muted hover:text-text hover:bg-muted/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm"
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] text-emerald-500 font-medium">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span className="text-[10px]">Copy</span>
          </>
        )}
      </button>
    </div>
  );
}

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-text">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5 space-y-1 text-text">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal pl-5 space-y-1.5 text-text">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 text-text">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold mt-2.5 mb-1 text-text">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5 text-text">{children}</h3>,
  code: ({ children, className }) => {
    const isInline = !className?.includes('language-');
    if (isInline) {
      return (
        <code className="rounded bg-muted/15 px-1.5 py-0.5 font-mono text-xs text-text">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }) => <PreBlock>{children}</PreBlock>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary underline hover:text-primary/80 transition-colors"
    >
      <span>{children}</span>
      <ExternalLink className="inline h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary pl-3 italic my-2 text-muted">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-surface font-semibold">{children}</thead>
  ),
  th: ({ children }) => <th className="p-2 font-semibold text-text">{children}</th>,
  td: ({ children }) => <td className="border-t border-border/50 p-2 text-text">{children}</td>,
  hr: () => <hr className="my-3 border-border" />,
};

export const ChatMessageContent = memo(function ChatMessageContent({
  content,
}: ChatMessageContentProps) {
  const { data: resolvedTokens = {} } = useResolveUserTokensQuery();

  const processedContent = useMemo(() => {
    if (!resolvedTokens || Object.keys(resolvedTokens).length === 0) return content;

    const parts = content.split(/(```[\s\S]*?```|`[^`]*`)/g);

    return parts
      .map((part) => {
        const isCode = part.startsWith('```') || part.startsWith('`');
        return part.replaceAll(TOKEN_REGEX, (token) => {
          const user = resolvedTokens[token];
          if (!user?.id || !user?.name) return token;
          return isCode ? user.name : `[${user.name}](/admin/members/${user.id})`;
        });
      })
      .join('');
  }, [content, resolvedTokens]);

  return (
    <div className="text-sm text-text space-y-2">
      <Markdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {processedContent}
      </Markdown>
    </div>
  );
});
