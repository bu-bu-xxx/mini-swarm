import { useAppStore } from '../../store';

export default function ContextViewer() {
  const context = useAppStore((s) => s.context);

  const entries = Object.entries(context).filter(([key]) => !key.startsWith('__'));

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">
        Context ({entries.length})
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500">No context data yet. Execute the pipeline to see agent outputs.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, entry]) => (
            <details key={key} className="group">
              <summary className="cursor-pointer text-xs text-slate-300 hover:text-white flex items-center gap-1">
                <span className="text-purple-400 group-open:rotate-90 transition-transform inline-block">▶</span>
                <span className="font-medium">{key}</span>
                <span className="text-slate-500 ml-auto">{entry.type}</span>
              </summary>
              <div className="mt-1 ml-4 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-400 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                {typeof entry.value === 'string'
                  ? entry.value.slice(0, 500)
                  : JSON.stringify(entry.value, null, 2).slice(0, 500)}
                {((typeof entry.value === 'string' ? entry.value.length : JSON.stringify(entry.value).length) > 500) && (
                  <span className="text-slate-600"> ...truncated</span>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
