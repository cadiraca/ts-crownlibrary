import React from 'react';
import { Play, X } from 'lucide-react';
import { ReadingHistory } from '../types';

interface Props {
  history: ReadingHistory | null;
  onJump: (position: ReadingHistory['last_position']) => void;
  onDismiss: () => void;
}

export default function ContinueReading({ history, onJump, onDismiss }: Props) {
  if (!history) return null;

  const pos = typeof history.last_position === 'string'
    ? JSON.parse(history.last_position)
    : history.last_position;

  const pct = pos?.scrollPercent ?? 0;
  const label = pos?.sectionId
    ? `Section: ${pos.sectionId}`
    : `${Math.round(pct)}% through`;

  const lastRead = new Date(history.last_read_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-purple-900/30 border border-purple-700/50 rounded-xl mb-6">
      <div className="w-8 h-8 rounded-full bg-purple-700/40 flex items-center justify-center flex-shrink-0">
        <Play size={14} className="text-purple-300 ml-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-purple-200">Continue Reading</p>
        <p className="text-xs text-purple-400/80">{label} · Last read {lastRead}</p>
      </div>
      <button
        onClick={() => onJump(pos)}
        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors flex-shrink-0"
      >
        Jump to it
      </button>
      <button
        onClick={onDismiss}
        className="text-purple-400 hover:text-purple-200 flex-shrink-0"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
