import { useState } from 'react';
import { useAppStore } from '../../store';

export default function ContextViewer() {
  const context = useAppStore((s) => s.context);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const entries = Object.entries(context).filter(([key]) => !key.startsWith('__'));

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">
        Context ({entries.length})
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500">No context data yet. Execute the pipeline to see agent outputs.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, entry]) => {
            const text = typeof entry.value === 'string'
              ? entry.value
              : JSON.stringify(entry.value, null, 2);
            const isLong = text.length > 500;
            const isExpanded = expandedKeys.has(key);

            return (
              <details key={key} className="group">
                <summary className="cursor-pointer text-xs text-slate-300 hover:text-white flex items-center gap-1">
                  <span className="text-purple-400 group-open:rotate-90 transition-transform inline-block">▶</span>
                  <span className="font-medium">{key}</span>
                  <span className="text-slate-500 ml-auto">{entry.type}</span>
                </summary>
                <div className={`mt-1 ml-4 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-400 overflow-y-auto whitespace-pre-wrap font-mono ${isExpanded ? '' : 'max-h-32'}`}>
                  {isLong && !isExpanded ? text.slice(0, 500) : text}
                  {isLong && (
                    <span
                      className="text-purple-400 cursor-pointer hover:text-purple-300 ml-1"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(key); }}
                    >
                      {isExpanded ? ' ...show less' : ' ...show more'}
                    </span>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
