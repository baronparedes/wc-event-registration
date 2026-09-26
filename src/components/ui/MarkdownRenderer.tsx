import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { twMerge } from 'tailwind-merge';

interface MarkdownRendererProps {
  content: string | null | undefined;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div
      className={twMerge(
        clsx(
          'prose prose-sm sm:prose-base max-w-none',
          'prose-headings:font-bold prose-headings:text-slate-900',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-p:text-slate-600 prose-p:leading-relaxed',
          'prose-li:text-slate-600',
          'prose-strong:text-slate-900 prose-strong:font-semibold',
          'prose-ul:list-disc prose-ul:pl-5',
          'prose-ol:list-decimal prose-ol:pl-5',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-700',
          'prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-slate-800 prose-code:font-mono',
          className,
        ),
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http') || href?.startsWith('//');
            if (isExternal) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              );
            }
            return (
              <a href={href} {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
