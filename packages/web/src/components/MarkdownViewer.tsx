import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractHeadings } from './TOCSidebar';

interface Props {
  content: string;
}

// Add IDs to headings for TOC navigation
function addHeadingIds(content: string): string {
  const counts: Record<string, number> = {};
  return content.replace(/^(#{1,4})\s+(.+)$/gm, (_, hashes, text) => {
    const baseId = text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    counts[baseId] = (counts[baseId] || 0) + 1;
    const id = counts[baseId] > 1 ? `${baseId}-${counts[baseId]}` : baseId;
    return `${hashes} ${text}`;
  });
}

const HeadingWithId = (level: number) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const counts: Record<string, number> = {};

  return function Heading({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    const text = String(children);
    const baseId = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    counts[baseId] = (counts[baseId] || 0) + 1;
    const id = counts[baseId] > 1 ? `${baseId}-${counts[baseId]}` : baseId;

    return React.createElement(Tag, { id, ...props }, children);
  };
};

export default function MarkdownViewer({ content }: Props) {
  return (
    <div className="prose-crown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => {
            const text = String(children);
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return <h1 id={id} {...props}>{children}</h1>;
          },
          h2: ({ children, ...props }) => {
            const text = String(children);
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const text = String(children);
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return <h3 id={id} {...props}>{children}</h3>;
          },
          h4: ({ children, ...props }) => {
            const text = String(children);
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return <h4 id={id} {...props}>{children}</h4>;
          },
          code: ({ className, children, ...props }) => {
            const isBlock = !!className;
            if (isBlock) {
              return (
                <pre className="bg-[#16161f] border border-[#2a2a3a] rounded-lg p-4 overflow-x-auto my-4">
                  <code className={`${className || ''} text-[#d0d0e0] text-sm font-mono`} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code className="bg-[#252535] text-[#f0a0c0] px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-600 pl-4 text-[#9a9ab8] italic my-4">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[#2a2a3a] bg-[#1a1a24] px-3 py-2 text-left font-semibold text-[#e2e2f0]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[#2a2a3a] px-3 py-2 text-[#c0c0d8]">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full rounded-lg my-4" />
          ),
          hr: () => <hr className="border-[#2a2a3a] my-6" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
