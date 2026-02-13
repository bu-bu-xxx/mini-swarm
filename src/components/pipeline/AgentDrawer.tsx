import { useAppStore } from '../../store';
import { cn } from '../../utils';

export default function AgentDrawer() {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const currentDesign = useAppStore((s) => s.currentDesign);
  const nodeStates = useAppStore((s) => s.nodeStates);
  const setSelectedNodeId = useAppStore((s) => s.setSelectedNodeId);
  const context = useAppStore((s) => s.context);

  if (!selectedNodeId || !currentDesign) return null;

  const node = currentDesign.topology.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const state = nodeStates[node.id];
  const nodeContext = context[node.id] || context[node.name];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={() => setSelectedNodeId(null)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setSelectedNodeId(null); }}
      />

      <div className="relative ml-auto w-[420px] bg-slate-800 border-l border-slate-700 h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Agent: {node.name}</h2>
            <span className="text-xs text-slate-400">{node.role}</span>
          </div>
          <button
            onClick={() => setSelectedNodeId(null)}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Status */}
          {state && (
            <section>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Status</h3>
              <span className={cn(
                'text-xs px-2 py-1 rounded-full',
                state.status === 'idle' && 'bg-slate-600 text-slate-300',
                state.status === 'running' && 'bg-blue-600 text-blue-100',
                state.status === 'completed' && 'bg-green-600 text-green-100',
                state.status === 'failed' && 'bg-red-600 text-red-100',
              )}>
                {state.status}
              </span>
              {state.error && (
                <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
                  {state.error}
                </div>
              )}
            </section>
          )}

          {/* Skill / System Prompt */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Skill (System Prompt)</h3>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
              {node.skillMarkdown}
            </div>
          </section>

          {/* Tools */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">
              Available Tools ({node.tools.length})
            </h3>
            <div className="space-y-1">
              {node.tools.map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs">
                  <span className="text-purple-400">🔧</span>
                  <span className="text-slate-300">{t}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Input Mappings */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Input Mappings</h3>
            {node.inputMappings.length === 0 ? (
              <p className="text-xs text-slate-500">No inputs (root node)</p>
            ) : (
              <div className="space-y-1">
                {node.inputMappings.map((m, i) => (
                  <div key={i} className="text-xs text-slate-300">
                    <span className="text-blue-400">{m.from}</span> → <span className="text-green-400">{m.to}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Output Mappings */}
          <section>
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Output Mappings</h3>
            <div className="space-y-1">
              {node.outputMappings.map((m, i) => (
                <div key={i} className="text-xs text-slate-300">
                  <span className="text-blue-400">{m.from}</span> → <span className="text-green-400">{m.to}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Output (if available) */}
          {nodeContext && (
            <section>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Output</h3>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                {typeof nodeContext.value === 'string'
                  ? nodeContext.value
                  : JSON.stringify(nodeContext.value, null, 2)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
