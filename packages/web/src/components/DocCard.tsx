import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, FileText, Tag } from 'lucide-react';
import { Document } from '../types';

interface Props {
  doc: Document;
}

export default function DocCard({ doc }: Props) {
  const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];
  const date = new Date(doc.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  const preview = doc.content.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 150).trim();

  return (
    <div className="group relative bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5 hover:border-[#7c5cbf] transition-all duration-200 hover:shadow-lg hover:shadow-purple-900/20">
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded-full border border-purple-800/50">
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <Link to={`/read/${doc.id}`} className="block">
        <h3 className="text-base font-semibold text-[#e2e2f0] group-hover:text-purple-300 transition-colors line-clamp-2 mb-2">
          {doc.title}
        </h3>
      </Link>

      {/* Preview */}
      <p className="text-sm text-[#7a7a9a] line-clamp-3 mb-4">{preview}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[#7a7a9a]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Clock size={11} />{doc.reading_time_min} min</span>
          <span className="flex items-center gap-1"><FileText size={11} />{doc.word_count.toLocaleString()} words</span>
        </div>
        <span>{date}</span>
      </div>

      {/* Action row */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-[#2a2a3a]">
        <Link
          to={`/read/${doc.id}`}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 rounded-lg transition-colors"
        >
          <BookOpen size={12} />
          Read
        </Link>
        <Link
          to={`/doc/${doc.id}`}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#252535] hover:bg-[#2f2f45] text-[#9a9ab8] rounded-lg transition-colors"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
