import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { DEFAULT_SUMMARY_SYSTEM_PROMPT } from '../../core/summary/summarizer';
import { opfsService } from '../../core/storage/opfs';

function PromptEditorModal({
  title,
  value,
  defaultValue,
  onSave,
  onClose,
}: {
  title: string;
  value: string;
  defaultValue: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value || defaultValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDraft(defaultValue)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            >
              Reset
            </button>
            <button
              onClick={() => { onSave(draft); onClose(); }}
              className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            >
              ✕
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 m-3 p-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[300px]"
        />
      </div>
    </div>
  );
}

export default function SummarySidebar() {
  const {
    summaryEntries,
    clearSummaryEntries,
    summarySystemPrompt,
    setSummarySystemPrompt,
    setPreviewFile,
  } = useAppStore();

  const [showPrompt, setShowPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [summaryEntries]);

  const handleFileClick = async (filePath: string) => {
    try {
      const content = await opfsService.readFile(filePath);
      setPreviewFile({ name: filePath, content, source: 'workspace' });
    } catch { /* file may not be accessible */ }
  };

  return (
    <div className="flex flex-col border-t border-slate-700">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <h3 className="text-xs font-semibold text-slate-400 uppercase">📋 Summary</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPrompt(true)}
            className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            title="View/edit summary system prompt"
          >
            📝 Prompt
          </button>
          <button
            onClick={clearSummaryEntries}
            disabled={summaryEntries.length === 0}
            className="text-xs text-red-400 hover:text-red-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
          >
            Clear
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-y-auto max-h-56 px-2 pb-2 space-y-2">
        {summaryEntries.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-2">No summary yet</p>
        ) : (
          summaryEntries.map((entry) => (
            <div key={entry.id} className="text-xs border border-slate-700 rounded p-2 space-y-1">
              <div className="flex items-center gap-1">
                <span className="font-medium text-purple-400 truncate">{entry.agentName}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 truncate flex-1">{entry.agentRole}</span>
                {entry.streaming && <span className="text-blue-400 animate-pulse shrink-0">●</span>}
              </div>

              {entry.text ? (
                <p className="text-slate-300 leading-relaxed">{entry.text}</p>
              ) : (
                <p className="text-slate-600 italic">Summarizing...</p>
              )}

              {entry.links.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {entry.links.map((link, i) => (
                    link.type === 'file' ? (
                      <button
                        key={i}
                        onClick={() => link.filePath && handleFileClick(link.filePath)}
                        className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-blue-400 hover:text-blue-300 rounded text-[10px] max-w-[150px] truncate"
                        title={link.filePath}
                      >
                        📄 {link.label}
                      </button>
                    ) : (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-purple-400 hover:text-purple-300 rounded text-[10px] max-w-[150px] truncate"
                        title={link.url}
                      >
                        🌐 {link.label}
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showPrompt && (
        <PromptEditorModal
          title="Summary System Prompt"
          value={summarySystemPrompt}
          defaultValue={DEFAULT_SUMMARY_SYSTEM_PROMPT}
          onSave={setSummarySystemPrompt}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  );
}
