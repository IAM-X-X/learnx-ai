'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

/** Lightweight, dependency-light markdown renderer styled with .prose-learnx. */
export function Markdown({ content, className }: MarkdownProps) {
  const memo = React.useMemo(() => content || '', [content]);
  return (
    <div className={cn('prose-learnx', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // render tables with shadcn-ish styling
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
        }}
      >
        {memo}
      </ReactMarkdown>
    </div>
  );
}
