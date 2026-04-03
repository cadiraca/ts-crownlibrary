import React, { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface Props {
  content: string;
}

export function extractHeadings(content: string): Heading[] {
  const lines = content.split('\n');
  const headings: Heading[] = [];
  const counts: Record<string, number> = {};

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const baseId = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      counts[baseId] = (counts[baseId] || 0) + 1;
      const id = counts[baseId] > 1 ? `${baseId}-${counts[baseId]}` : baseId;
      headings.push({ id, text, level });
    }
  }

  return headings;
}

export default function TOCSidebar({ content }: Props) {
  const headings = extractHeadings(content);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pr-2">
      <p className="text-xs font-semibold text-[#7a7a9a] uppercase tracking-wider mb-3">Contents</p>
      <ul className="space-y-1">
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`
                block text-sm py-1 transition-colors rounded px-2
                ${h.level === 1 ? 'font-medium' : ''}
                ${h.level === 2 ? 'pl-3' : ''}
                ${h.level === 3 ? 'pl-5' : ''}
                ${h.level === 4 ? 'pl-7' : ''}
                ${active === h.id
                  ? 'text-purple-300 bg-purple-900/20 border-l-2 border-purple-400'
                  : 'text-[#7a7a9a] hover:text-[#b0b0d0] border-l-2 border-transparent'
                }
              `}
              onClick={e => {
                e.preventDefault();
                const el = document.getElementById(h.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
