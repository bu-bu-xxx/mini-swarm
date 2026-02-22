import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store';
import { opfsService } from '../../core/storage/opfs';
import { DEFAULT_SUMMARY_SYSTEM_PROMPT } from '../../core/summary/summary';
import PromptEditorModal from '../common/PromptEditorModal';
import type { SummaryEntry } from '../../types';

export default function SummarySidebar() {
  const summaryEntries = useAppStore((s) => s.summaryEntries);
  const generatedPages = useAppStore((s) => s.generatedPages);
  const summarySystemPrompt = useAppStore((s) => s.summarySystemPrompt);
  const setSummarySystemPrompt = useAppStore((s) => s.setSummarySystemPrompt);
  const setPreviewFile = useAppStore((s) => s.setPreviewFile);

  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [summaryEntries]);

  // Handle file link click — open preview modal
  const handleFileClick = useCallback(async (path: string) => {
    try {
      const content = await opfsService.readFile(path);
      const name = path.split('/').pop() || path;
      setPreviewFile({ name, content, source: 'workspace' });
    } catch {
      // file read failed
    }
  }, [setPreviewFile]);

  // Handle page link click — open in new tab
  const handlePageClick = useCallback((label: string) => {
    const page = generatedPages.find(
      (p) => p.title === label || p.entryPath === label
    );
    if (page) {
      window.open(page.url, '_blank');
    }
  }, [generatedPages]);

  // Render summary text with inline [FILE:] and [PAGE:] markers replaced by clickable links
  const renderSummaryText = useCallback((entry: SummaryEntry) => {
    const text = entry.summary;
    const parts: (string | { type: 'file' | 'page'; value: string })[] = [];
    let lastIndex = 0;
    const regex = /\[(FILE|PAGE):([^\]]+)\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push({
        type: match[1].toLowerCase() as 'file' | 'page',
        value: match[2].trim(),
      });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return <span key={i}>{part}</span>;
      }
      return (
        <button
          key={i}
          onClick={() => part.type === 'file' ? handleFileClick(part.value) : handlePageClick(part.value)}
          className="text-purple-400 hover:text-purple-300 underline cursor-pointer inline"
        >
          {part.type === 'file' ? '📄' : '🌐'} {part.value}
        </button>
      );
    });
  }, [handleFileClick, handlePageClick]);

  return (
    <div className="border-t border-slate-700 flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <h3 className="text-xs font-semibold text-slate-400 uppercase">
          📋 Summary ({summaryEntries.length})
        </h3>
        <button
          onClick={() => setShowPromptEditor(true)}
          className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="View/edit summary system prompt"
        >
          📝 Prompt
        </button>
      </div>

      {/* Summary entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-2">
        {summaryEntries.length === 0 ? (
          <p className="text-xs text-slate-600">Real-time summaries will appear here once the pipeline runs</p>
        ) : (
          <div className="space-y-2">
            {summaryEntries.map((entry) => (
              <div key={entry.id} className="text-xs">
                <span className="text-purple-400 font-medium">
                  {entry.agentName}:
                </span>
                <span className="text-slate-300 ml-1">
                  {renderSummaryText(entry)}
                </span>
                {/* Fallback links (from tool calls when LLM didn't add markers) */}
                {entry.links.length > 0 && !entry.summary.match(/\[(FILE|PAGE):/) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.links.map((link, i) => (
                      <button
                        key={i}
                        onClick={() => link.type === 'file'
                          ? handleFileClick(link.path)
                          : handlePageClick(link.label)
                        }
                        className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                      >
                        {link.type === 'file' ? '📄' : '🌐'} {link.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Editor Modal */}
      {showPromptEditor && (
        <PromptEditorModal
          title="Summary System Prompt"
          value={summarySystemPrompt}
          defaultValue={DEFAULT_SUMMARY_SYSTEM_PROMPT}
          onSave={setSummarySystemPrompt}
          onClose={() => setShowPromptEditor(false)}
        />
      )}
    </div>
  );
}
