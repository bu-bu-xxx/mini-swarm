import { useState } from 'react';

export default function PromptEditorModal({
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
