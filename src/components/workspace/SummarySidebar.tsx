import { useState, useCallback } from 'react';
import { useAppStore } from '../../store';
import { DEFAULT_SUMMARY_SYSTEM_PROMPT } from '../../core/engine/pipeline';
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
    summaryText,
    summarySystemPrompt,
    setSummarySystemPrompt,
    filesWrittenInRun,
    generatedPages,
    setPreviewFile,
    executionStatus,
  } = useAppStore();

  const [showPrompt, setShowPrompt] = useState(false);

  const handleFileClick = useCallback(async (path: string) => {
    try {
      const content = await opfsService.readFile(path);
      const name = path.split('/').pop() || path;
      setPreviewFile({ name, content, source: 'workspace' });
    } catch {
      // ignore read errors
    }
  }, [setPreviewFile]);

  const isRunning = executionStatus === 'running';

  return (
    <div className="p-3 border-t border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase">✨ Summary</h3>
        <button
          onClick={() => setShowPrompt(true)}
          className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="View/edit summary system prompt"
        >
          📝 Prompt
        </button>
      </div>

      {/* Summary text */}
      <div className="text-xs text-slate-300 min-h-[48px] max-h-32 overflow-y-auto whitespace-pre-wrap bg-slate-800/50 rounded p-2 mb-2 leading-relaxed">
        {summaryText ? (
          <>
            {summaryText}
            {isRunning && <span className="animate-pulse ml-0.5">▋</span>}
          </>
        ) : (
          <span className="text-slate-600">
            {isRunning ? 'Waiting for first agent to complete…' : 'Run the pipeline to see a summary.'}
          </span>
        )}
      </div>

      {/* Files written during run */}
      {filesWrittenInRun.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Files Written</div>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {filesWrittenInRun.map((f) => (
              <button
                key={f.path}
                onClick={() => handleFileClick(f.path)}
                className="block w-full text-left text-xs text-blue-400 hover:text-blue-300 truncate"
                title={`Open ${f.path} (by ${f.agentName})`}
              >
                📄 {f.path}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated pages */}
      {generatedPages.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase mb-1">Generated Pages</div>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {generatedPages.map((page) => (
              <a
                key={page.id}
                href={page.url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-purple-400 hover:text-purple-300 truncate"
                title={page.title}
              >
                🌐 {page.title}
              </a>
            ))}
          </div>
        </div>
      )}

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
