import { clsx } from 'clsx';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
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
        urlTransform={defaultUrlTransform}
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
          ol: ({ children, ...props }) => (
            <ol className="my-3 list-decimal space-y-2 pl-6 text-sm text-text" {...props}>
              {children}
            </ol>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-3 list-disc space-y-2 pl-6 text-sm text-text" {...props}>
              {children}
            </ul>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed text-text pl-1" {...props}>
              {children}
            </li>
          ),
          h1: ({ children, ...props }) => (
            <h1 className="mb-3 text-base font-bold text-text sm:text-lg" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="mb-2 mt-4 text-base font-bold text-text" {...props}>
              {children}
            </h2>
          ),
          p: ({ children, ...props }) => (
            <p className="mb-3 text-sm leading-relaxed text-text last:mb-0" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-text" {...props}>
              {children}
            </strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
